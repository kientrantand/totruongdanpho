"""E-TDP V7.1: Flask API + Supabase PostgreSQL; bình luận công khai và quản trị đầy đủ.

Dữ liệu trong schema app, mọi thao tác ghi qua backend. Không có mật khẩu trong repo.
"""
import csv
import hashlib
import hmac
import io
import json
import os
import re
import secrets
from datetime import datetime, timedelta, timezone
from openpyxl import Workbook as ExcelWorkbook, load_workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.worksheet.datavalidation import DataValidation
from functools import wraps
from pathlib import Path

import psycopg
from psycopg.rows import dict_row
from flask import Flask, Response, g, jsonify, make_response, request, send_from_directory

ROOT = Path(__file__).resolve().parent
app = Flask(__name__)
app.json.ensure_ascii = False
app.config['MAX_CONTENT_LENGTH'] = 2_500_000
COOKIE = 'tdp_session'
SESSION_DAYS = 180
MIN_PUBLIC = 3
MIN_RANK = 5
WARDS = ('phường Trường Thi', 'phường Đông A', 'phường Thành Nam',
         'phường Nam Định', 'phường Thiên Trường', 'phường Mỹ Lộc')
LEVELS = ('Đáng yêu, dễ tính', 'Bình thường, không khó cũng không dễ',
          'Quái tính, lúc nắng lúc mưa', 'Thường xuyên gây khó khăn')


def now():
    return datetime.now(timezone.utc)


def digest(s):
    return hashlib.sha256(s.encode('utf-8')).hexdigest()


def clean(value, size=120):
    return re.sub(r'\s+', ' ', value).strip()[:size] if isinstance(value, str) else ''


def fail(msg, status=400):
    return jsonify(error=msg), status


def conn():
    url = os.environ.get('DATABASE_URL', '')
    if not url.startswith(('postgresql://', 'postgres://')):
        raise RuntimeError('DATABASE_URL chưa được thiết lập')
    # Supabase transaction pooler không hỗ trợ prepared statements.
    return psycopg.connect(url, row_factory=dict_row, prepare_threshold=None,
                           connect_timeout=8, sslmode='require')


def query(sql, args=(), one=False):
    cur = g.db.execute(sql, args)
    return cur.fetchone() if one else cur.fetchall()


def scalar(sql, args=()):
    row = g.db.execute(sql, args).fetchone()
    return next(iter(row.values())) if row else None


def payload():
    obj = request.get_json(silent=True)
    if not isinstance(obj, dict):
        raise ValueError('Dữ liệu gửi phải ở định dạng JSON.')
    return obj


def set_session(response, token):
    response.set_cookie(COOKIE, token, max_age=SESSION_DAYS * 86400,
                        secure=True, httponly=True, samesite='Strict', path='/')
    return response


def current_user():
    token = request.cookies.get(COOKIE, '')
    if not token or len(token) > 160:
        return None
    return query('''SELECT p.id,p.label,p.role,s.csrf_token
       FROM app.sessions s JOIN app.participants p ON p.id=s.participant_id
       WHERE s.token_hash=%s AND s.expires_at > now() AND p.active=TRUE''',
       (digest(token),), one=True)


def user_object(user):
    return {'id': user['id'], 'label': user['label'], 'role': user['role'],
            'csrf': user['csrf_token'],
            'voted': scalar('SELECT count(*) FROM app.votes WHERE participant_id=%s', (user['id'],))}


def require(admin=False, write=False):
    user = current_user()
    if not user:
        raise PermissionError('Phiên truy cập hết hạn. Vui lòng tải lại trang.')
    if admin and user['role'] != 'admin':
        raise PermissionError('Bạn không có quyền quản trị.')
    if write and not hmac.compare_digest(request.headers.get('X-CSRF-Token', ''), user['csrf_token']):
        raise PermissionError('Mã bảo vệ phiên không hợp lệ. Vui lòng tải lại trang.')
    return user


def protected(admin=False, write=False):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            require(admin=admin, write=write)
            return fn(*args, **kwargs)
        return wrapper
    return decorator


@app.before_request
def before():
    # Static asset được Flask/Vercel trả trực tiếp, các API mới cần truy cập PG.
    if request.path.startswith('/api/'):
        origin = request.headers.get('Origin')
        if request.method in ('POST', 'PUT', 'DELETE') and origin:
            from urllib.parse import urlparse
            src = urlparse(origin)
            if (src.netloc != request.host or src.scheme != 'https'):
                return fail('Yêu cầu khác nguồn không được phép.', 403)
        g.db = conn()


@app.teardown_request
def after(exception):
    db = g.pop('db', None)
    if db is not None:
        try:
            if exception is None:
                db.commit()
            else:
                db.rollback()
        finally:
            db.close()


@app.after_request
def sec_headers(resp):
    resp.headers['Cache-Control'] = 'no-store'
    resp.headers['X-Content-Type-Options'] = 'nosniff'
    resp.headers['Referrer-Policy'] = 'no-referrer'
    resp.headers['X-Frame-Options'] = 'DENY'
    resp.headers['Content-Security-Policy'] = (
        "default-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; "
        "form-action 'self'; img-src 'self' data:; connect-src 'self' https://raw.githubusercontent.com; "
        "script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com")
    return resp


@app.errorhandler(PermissionError)
def denied(exc):
    return fail(str(exc), 403)


@app.errorhandler(ValueError)
def invalid(exc):
    return fail(str(exc), 400)


@app.errorhandler(Exception)
def server_error(exc):
    from werkzeug.exceptions import HTTPException
    if isinstance(exc, HTTPException):
        return fail(exc.description, exc.code)
    app.logger.exception('Lỗi máy chủ')
    return fail('Máy chủ chưa kết nối được cơ sở dữ liệu hoặc gặp lỗi xử lý.', 503)


@app.get('/')
def index():
    return send_from_directory(ROOT / 'static', 'index.html')


@app.get('/static/<path:name>')
def static_file(name):
    if name not in ('app.js', 'game.js', 'style.css') and not re.fullmatch(r'assets/mascots/mascot-[1-4]\.svg', name):
        return fail('Không tìm thấy tệp.', 404)
    return send_from_directory(ROOT / 'static', name)


@app.get('/api/health')
def health():
    n = scalar('SELECT COUNT(*) FROM app.leaders WHERE active=TRUE')
    return jsonify(ok=True, database='postgresql', leaders=n)


@app.get('/api/me')
def me():
    user = current_user()
    if user:
        return jsonify(user=user_object(user))
    # Mỗi trình duyệt mới có một phiên ẩn danh. Không phải xác minh danh tính thật.
    arbitrary = secrets.token_urlsafe(32)
    token = secrets.token_urlsafe(32)
    csrf = secrets.token_urlsafe(24)
    pid = scalar('''INSERT INTO app.participants(label,code_hash,role)
                VALUES ('Khách ẩn danh',%s,'voter') RETURNING id''', (digest(arbitrary),))
    g.db.execute('''INSERT INTO app.sessions(token_hash,participant_id,csrf_token,expires_at)
                 VALUES (%s,%s,%s,%s)''', (digest(token), pid, csrf, now() + timedelta(days=SESSION_DAYS)))
    reply = make_response(jsonify(user={'id': pid, 'label': 'Khách ẩn danh',
                                       'role': 'voter', 'csrf': csrf, 'voted': 0}))
    return set_session(reply, token)


@app.post('/api/login')
def login():
    body = payload()
    if body.get('role') != 'admin':
        return fail('Chỉ tài khoản quản trị viên cần đăng nhập.')
    supplied = clean(body.get('code'), 200)
    password = os.environ.get('ADMIN_PASSWORD', '')
    if len(password) < 16:
        return fail('Quản trị viên chưa được cấu hình mật khẩu bảo mật.', 503)
    # Chống dò mật khẩu nhiều lần; phải chạy migration 02_BAO_VE_DANG_NHAP.sql.
    remote_ip = request.headers.get('X-Forwarded-For', request.remote_addr or '')
    remote_ip = remote_ip.split(',')[0].strip()
    ip_hash = digest(password + '|' + remote_ip)
    row = query('''INSERT INTO app.login_attempts(ip_hash,attempts,window_start)
           VALUES (%s,1,now()) ON CONFLICT(ip_hash) DO UPDATE SET
           attempts=CASE WHEN app.login_attempts.window_start < now()-interval '15 minutes'
                     THEN 1 ELSE app.login_attempts.attempts+1 END,
           window_start=CASE WHEN app.login_attempts.window_start < now()-interval '15 minutes'
                     THEN now() ELSE app.login_attempts.window_start END
           RETURNING attempts''', (ip_hash,), one=True)
    if row['attempts'] > 10:
        return fail('Đăng nhập quá nhiều lần. Vui lòng thử lại sau 15 phút.', 429)
    if not hmac.compare_digest(digest(supplied), digest(password)):
        return fail('Mật khẩu không đúng.', 401)
    # Một tài khoản quản trị riêng, không lưu mật khẩu quản trị trong database.
    g.db.execute('''INSERT INTO app.participants(id,label,code_hash,role)
             VALUES(-1,'Quản trị viên','admin-via-environment','admin')
             ON CONFLICT(id) DO UPDATE SET active=TRUE''')
    token = secrets.token_urlsafe(32)
    csrf = secrets.token_urlsafe(24)
    g.db.execute('''INSERT INTO app.sessions(token_hash,participant_id,csrf_token,expires_at)
                 VALUES (%s,-1,%s,%s)''', (digest(token), csrf, now() + timedelta(days=SESSION_DAYS)))
    reply = make_response(jsonify(user={'id':-1,'label':'Quản trị viên',
                                       'role':'admin','csrf':csrf,'voted':0}))
    return set_session(reply, token)


@app.post('/api/logout')
@protected(write=True)
def logout():
    token = request.cookies.get(COOKIE, '')
    g.db.execute('DELETE FROM app.sessions WHERE token_hash=%s', (digest(token),))
    reply = make_response(jsonify(ok=True))
    reply.delete_cookie(COOKIE, path='/', secure=True, samesite='Strict')
    return reply


def stats_for(user):
    counts = query('''SELECT leader_id,count(*)::int total,
       count(*) FILTER(WHERE level=1)::int n1,
       count(*) FILTER(WHERE level=2)::int n2,
       count(*) FILTER(WHERE level=3)::int n3,
       count(*) FILTER(WHERE level=4)::int n4,
       round(avg(5.0-level),2)::float score FROM app.votes GROUP BY leader_id''')
    own = (query('SELECT leader_id,level FROM app.votes WHERE participant_id=%s', (user['id'],))
           if user else [])
    return {r['leader_id']: r for r in counts}, {r['leader_id']:r['level'] for r in own}


def leaders_response(user):
    rows = query('SELECT * FROM app.leaders WHERE active=TRUE ORDER BY ward,area,name')
    stats, own = stats_for(user)
    comments = {r['leader_id']:r['n'] for r in query('''SELECT leader_id,count(*)::int n FROM app.comments
                                     WHERE status='approved' GROUP BY leader_id''')}
    data = []
    for row in rows:
        r = stats.get(row['id'])
        n = r['total'] if r else 0
        show = n >= MIN_PUBLIC or bool(user and user['role'] == 'admin')
        leader = {'id':row['id'], 'name':row['name'], 'area':row['area'], 'ward':row['ward'],
                  'aliases':row['aliases'], 'my_vote':own.get(row['id']), 'votes':n,
                  'revealed':show,'comments':comments.get(row['id'],0),
                  'counts':[r[f'n{i}'] for i in range(1,5)] if r and show else None,
                  'score':r['score'] if r and show else None}
        # Số điện thoại liên hệ được chủ quản hệ thống cho phép công khai.
        # Chỉ trả số của tổ trưởng đang hoạt động, không kèm dữ liệu quản trị khác.
        leader['phone'] = row['phone'] or ''
        leader['phone_alt'] = row['phone_alt'] or ''
        if user and user['role'] == 'admin':
            leader['source'] = row['source']
        data.append(leader)
    return jsonify(leaders=data, minimum=MIN_PUBLIC)


@app.get('/api/public/leaders')
def public_leaders():
    return leaders_response(None)


@app.get('/api/leaders')
@protected()
def leaders():
    return leaders_response(require())


def overview_response(user):
    wards = {w:0 for w in WARDS}
    wards.update({r['ward']:r['n'] for r in query('''SELECT ward,count(*)::int n
                                 FROM app.leaders WHERE active=TRUE GROUP BY ward''')})
    return jsonify(total_votes=scalar('SELECT count(*) FROM app.votes'),
                   participating_voters=scalar('SELECT count(DISTINCT participant_id) FROM app.votes'),
                   voter_accounts=(scalar("SELECT count(*) FROM app.participants WHERE role='voter'")
                                   if user and user['role']=='admin' else None),
                   wards=wards,leader_count=sum(wards.values()),minimum=MIN_PUBLIC)


@app.get('/api/public/overview')
def public_overview():
    return overview_response(None)


@app.get('/api/overview')
@protected()
def overview():
    return overview_response(require())


def ranks_response():
    rows = query('''SELECT l.id,l.name,l.area,l.ward,count(v.level)::int votes,
        count(*) FILTER (WHERE v.level=1)::int easy,
        count(*) FILTER (WHERE v.level=3)::int changing,
        count(*) FILTER (WHERE v.level=4)::int difficult,
        round(avg(5.0-v.level),2)::float score
        FROM app.leaders l LEFT JOIN app.votes v ON v.leader_id=l.id
        WHERE l.active=TRUE GROUP BY l.id HAVING count(v.level)>=%s''', (MIN_RANK,))
    for row in rows:
        row['easy_pct']=round(100*row['easy']/row['votes'],1)
        row['hard_pct']=round(100*(row['changing']+row['difficult'])/row['votes'],1)
        row['severe_pct']=round(100*row['difficult']/row['votes'],1)
    easy=sorted(rows,key=lambda r:(-r['easy_pct'],-r['score'],-r['votes'],r['name']))[:10]
    hard=sorted(rows,key=lambda r:(-r['hard_pct'],-r['severe_pct'],-r['votes'],r['name']))[:10]
    return jsonify(easy=easy,difficult=hard,minimum_votes=MIN_RANK,eligible_count=len(rows))


@app.get('/api/public/rankings')
def public_ranks():
    return ranks_response()


@app.get('/api/rankings')
@protected()
def ranks():
    return ranks_response()


def checked_leader(lid):
    lid=clean(lid, 48)
    if not query('SELECT 1 FROM app.leaders WHERE id=%s AND active=TRUE', (lid,), one=True):
        raise ValueError('Không tìm thấy tổ trưởng.')
    return lid


@app.post('/api/vote')
@protected(write=True)
def vote():
    user = require()
    if user['role'] not in ('voter', 'admin'):
        return fail('Phiên truy cập không hợp lệ.',403)
    data = payload()
    level = data.get('level')
    if type(level) is not int or level not in (1,2,3,4):
        return fail('Chọn một trong bốn mức đánh giá.')
    # Đòi hỏi xác nhận rõ ràng: bản frontend cũ không thể âm thầm ghi phiếu sau khi thắng game.
    if data.get('confirmed') is not True:
        return fail('Bạn phải xác nhận mức đánh giá trước khi ghi phiếu.', 400)
    lid = checked_leader(data.get('leader_id'))
    # Cơ sở dữ liệu khóa theo UNIQUE(participant_id,leader_id).
    # INSERT ... DO NOTHING là nguyên tử, chặn cả 2 request đến cùng lúc, không cho sửa phiếu đã lưu.
    inserted = query('''INSERT INTO app.votes(participant_id,leader_id,level,updated_at)
              VALUES (%s,%s,%s,now()) ON CONFLICT(participant_id,leader_id)
              DO NOTHING RETURNING level''', (user['id'],lid,level), one=True)
    if not inserted:
        return fail('Phiếu đã được xác nhận và khóa. Không thể đánh giá lại, đổi mức hoặc hủy phiếu.', 409)
    return jsonify(ok=True,locked=True,level=level,
                   message='Đã xác nhận và khóa đánh giá. Không thể thay đổi hoặc hủy phiếu.'), 201


@app.delete('/api/vote/<lid>')
@protected(write=True)
def unvote(lid):
    # Giữ endpoint cũ để trả thông báo rõ ràng, thay vì cho phép xóa phiếu như V6.0.
    return fail('Phiếu đã xác nhận không được phép hủy.', 403)


def iso_row(row, *keys):
    row = dict(row)
    for key in keys:
        if row.get(key) is not None:
            row[key] = row[key].isoformat()
    return row


def comments_response(user):
    """Everyone reads approved text. Moderators additionally read every status.

    Anonymous visitors see their own pending comments, never those of others.
    Administrator moderation never exposes participant identity to the client.
    """
    lid = checked_leader(request.args.get('leader_id'))
    if user and user['role'] == 'admin':
        rows = query('''SELECT id,body,status,created_at,FALSE AS is_mine
                    FROM app.comments WHERE leader_id=%s
                    ORDER BY id DESC LIMIT 500''', (lid,))
    elif user:
        rows = query('''SELECT c.id,c.body,c.status,c.created_at,
            (c.participant_id=%s) AS is_mine FROM app.comments c
            WHERE c.leader_id=%s AND (c.status='approved' OR c.participant_id=%s)
            ORDER BY id DESC LIMIT 200''', (user['id'],lid,user['id']))
    else:
        rows = query('''SELECT id,body,status,created_at,FALSE as is_mine
               FROM app.comments WHERE leader_id=%s AND status='approved'
               ORDER BY id DESC LIMIT 200''', (lid,))
    n = scalar("SELECT count(*) FROM app.comments WHERE leader_id=%s AND status='approved'",(lid,))
    return jsonify(comments=[iso_row(r,'created_at') for r in rows],
                   total_approved=n, total_visible=len(rows))


@app.get('/api/public/comments')
def public_comments():
    return comments_response(None)


@app.get('/api/comments')
@protected()
def comments():
    return comments_response(require())


@app.post('/api/comments')
@protected(write=True)
def comment():
    user=require()
    if user['role'] not in ('voter', 'admin'):
        return fail('Phiên truy cập không hợp lệ.',403)
    data=payload()
    lid=checked_leader(data.get('leader_id'))
    # Bắt buộc có phiếu trong PostgreSQL; không tin trạng thái giao diện.
    has_vote=scalar('SELECT 1 FROM app.votes WHERE participant_id=%s AND leader_id=%s',
                    (user['id'],lid))
    if not has_vote:
        return fail('Bạn cần bình chọn thành công trước khi gửi bình luận.',403)
    text=clean(data.get('body'),2000)
    if not (5<=len(text)<=700):
        return fail('Bình luận phải dài 5–700 ký tự.')
    if re.search(r'https?://|www\.|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}',text,re.I):
        return fail('Không đăng liên kết hoặc email.')
    if re.search(r'(?<!\d)(?:\+?84|0)\s*[1-9](?:[\s.\-]*\d){7,10}(?!\d)',text):
        return fail('Không đăng số điện thoại cá nhân.')
    recent=scalar('SELECT max(created_at) FROM app.comments WHERE participant_id=%s',(user['id'],))
    if recent and (now()-recent).total_seconds()<40:
        return fail('Vui lòng gửi bình luận tiếp theo sau 40 giây.',429)
    q=scalar('''SELECT count(*) FROM app.comments WHERE participant_id=%s AND leader_id=%s
                AND created_at>=now()-interval '24 hours' ''',(user['id'],lid))
    if q>=3:
        return fail('Tối đa 3 bình luận cho một tổ trưởng trong 24 giờ.',429)
    cid=scalar('''INSERT INTO app.comments(leader_id,participant_id,body)
            VALUES(%s,%s,%s) RETURNING id''',(lid,user['id'],text))
    return jsonify(ok=True,id=cid,status='pending',
                   message='Đã nhận bình luận. Chỉ công khai sau khi quản trị viên duyệt.'),201


@app.delete('/api/comments/<int:cid>')
@protected(write=True)
def remove_comment(cid):
    user=require()
    row=query('SELECT participant_id FROM app.comments WHERE id=%s',(cid,),one=True)
    if not row or (row['participant_id']!=user['id'] and user['role']!='admin'):
        return fail('Bình luận không tồn tại hoặc không thuộc về bạn.',404)
    g.db.execute('DELETE FROM app.comments WHERE id=%s',(cid,))
    return jsonify(ok=True)


@app.post('/api/comments/<int:cid>/report')
@protected(write=True)
def report(cid):
    user=require()
    if user['role'] not in ('voter', 'admin'):
        return fail('Phiên truy cập không hợp lệ.',403)
    c=query('SELECT participant_id,status FROM app.comments WHERE id=%s',(cid,),one=True)
    if not c or c['status']!='approved':
        return fail('Bình luận đã không còn công khai.',404)
    if c['participant_id']==user['id']:
        return fail('Không thể báo cáo bình luận của chính mình.')
    g.db.execute('''INSERT INTO app.comment_reports(comment_id,participant_id)
                VALUES(%s,%s) ON CONFLICT DO NOTHING''',(cid,user['id']))
    num=scalar('SELECT count(*) FROM app.comment_reports WHERE comment_id=%s',(cid,))
    if num>=2:
        g.db.execute("UPDATE app.comments SET status='hidden',moderated_at=now() WHERE id=%s",(cid,))
    return jsonify(ok=True,message='Đã ghi nhận báo cáo.')


def leader_input(data):
    name=clean(data.get('name'),90)
    area=clean(data.get('area'),100)
    ward=clean(data.get('ward'),100)
    phone=clean(data.get('phone',''),30)
    phone_alt=clean(data.get('phone_alt',''),30)
    aliases=data.get('aliases',[])
    if not name or not area or ward not in WARDS:
        raise ValueError('Hãy nhập tên, tổ/thôn và chọn một trong 6 phường.')
    if not isinstance(aliases,list) or len(aliases)>20:
        raise ValueError('Địa bàn cũ không hợp lệ.')
    aliases=[clean(x,90) for x in aliases if isinstance(x,str)]
    return name,area,ward,phone,phone_alt,json.dumps(aliases,ensure_ascii=False)


@app.get('/api/admin/leaders')
@protected(admin=True)
def admin_leaders():
    rows=query('''SELECT id,name,area,ward,phone,phone_alt,aliases,active
                  FROM app.leaders ORDER BY active DESC,ward,area''')
    return jsonify(leaders=rows)


@app.post('/api/admin/leaders')
@protected(admin=True,write=True)
def new_leader():
    vals=leader_input(payload())
    lid='NEW-'+secrets.token_hex(5).upper()
    g.db.execute('''INSERT INTO app.leaders(id,name,area,ward,phone,phone_alt,aliases,source)
             VALUES(%s,%s,%s,%s,%s,%s,%s::jsonb,'Thêm thủ công')''',(lid,*vals))
    return jsonify(ok=True,id=lid),201


@app.put('/api/admin/leaders/<lid>')
@protected(admin=True,write=True)
def edit_leader(lid):
    data=payload()
    vals=leader_input(data)
    active=data.get('active',True)
    if type(active) is not bool:
        return fail('Trạng thái không hợp lệ.')
    cur=g.db.execute('''UPDATE app.leaders SET name=%s,area=%s,ward=%s,phone=%s,
            phone_alt=%s,aliases=%s::jsonb,active=%s,updated_at=now() WHERE id=%s''',
            (*vals,active,clean(lid,64)))
    if cur.rowcount==0:
        return fail('Không tìm thấy tổ trưởng.',404)
    return jsonify(ok=True)



# ---- Admin Excel import/export: explicit preview then atomic commit ----
EXCEL_HEADERS = ('Mã tổ trưởng','Họ và tên','Tổ/thôn/xóm/đội','Phường',
                 'Số điện thoại','Số điện thoại phụ','Địa bàn cũ','Trạng thái')
EXCEL_MAX_ROWS = 500
EXCEL_MAX_BYTES = 2_000_000


def excel_safe(v):
    # Prevent spreadsheet formula execution in administrator downloads.
    s = '' if v is None else str(v)
    return "'" + s if s.startswith(('=', '+', '-', '@')) else s


def excel_export(rows, filename):
    book = ExcelWorkbook()
    ws = book.active
    ws.title = 'Danh_sach_to_truong'
    ws.append(list(EXCEL_HEADERS))
    for r in rows:
        aliases = r.get('aliases') or []
        if isinstance(aliases, str):
            try: aliases = json.loads(aliases)
            except (TypeError, ValueError): aliases = []
        ws.append([excel_safe(r.get('id','')),excel_safe(r.get('name','')),
                   excel_safe(r.get('area','')),excel_safe(r.get('ward','')),
                   excel_safe(r.get('phone','')),excel_safe(r.get('phone_alt','')),
                   excel_safe(', '.join(str(t) for t in aliases)),
                   'Đang sử dụng' if r.get('active',True) else 'Ẩn'])
    ws.freeze_panes='A2'
    ws.auto_filter.ref=f'A1:H{max(2,ws.max_row)}'
    widths=[19,28,28,24,19,19,35,19]
    for i,w in enumerate(widths,1):
        ws.column_dimensions[chr(64+i)].width=w
    for cell in ws[1]:
        cell.fill=PatternFill('solid',fgColor='193B69')
        cell.font=Font(name='Arial',bold=True,color='FFFFFF',size=11)
        cell.alignment=Alignment(vertical='center',wrap_text=True)
    ws.row_dimensions[1].height=35
    for row in ws.iter_rows(min_row=2):
        for cell in row:
            cell.number_format='@'
            cell.alignment=Alignment(vertical='center')
    ward_dv=DataValidation(type='list',formula1='Danh_muc!$A$2:$A$7')
    ward_dv.error='Vui lòng chọn đúng một trong 6 phường';ward_dv.errorTitle='Sai phường';ward_dv.showErrorMessage=True
    ws.add_data_validation(ward_dv);ward_dv.add('D2:D501')
    state_dv=DataValidation(type='list',formula1='"Đang sử dụng,Ẩn"')
    ws.add_data_validation(state_dv);state_dv.add('H2:H501')
    guide=book.create_sheet('Huong_dan')
    guide.append(['HƯỚNG DẪN NHẬP DANH SÁCH E-TDP'])
    guide.append(['1. Sửa dữ liệu tại sheet Danh_sach_to_truong; không đổi tiêu đề 8 cột.'])
    guide.append(['2. Giữ nguyên Mã tổ trưởng khi cập nhật người đã có để bảo toàn phiếu bình chọn.'])
    guide.append(['3. Để trống Mã tổ trưởng khi thêm người mới.'])
    guide.append(['4. Phường chọn từ danh sách, tỉnh mặc định là Ninh Bình.'])
    guide.append(['5. Số điện thoại nhập dạng văn bản để giữ chữ số 0 đầu tiên.'])
    guide.append(['6. Nhập lại trên website quản trị: Xem trước -> Xác nhận lưu.'])
    guide.append(['7. Nếu trùng địa bàn nhưng khác tên và không có mã, hệ thống sẽ cảnh báo để tránh ghi nhầm phiếu.'])
    guide.column_dimensions['A'].width=105
    guide['A1'].font=Font(name='Arial',bold=True,color='1D4E89',size=15)
    categories=book.create_sheet('Danh_muc')
    categories.append(['Phường','Trạng thái'])
    for w in WARDS: categories.append([w,'Đang sử dụng'])
    categories.column_dimensions['A'].width=28
    categories.column_dimensions['B'].width=20
    out=io.BytesIO();book.save(out);out.seek(0)
    return Response(out.getvalue(),mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',headers={
        'Content-Disposition':f'attachment; filename="{filename}"',
        'Cache-Control':'no-store'
    })


@app.get('/api/admin/template.xlsx')
@protected(admin=True)
def blank_template():
    return excel_export([], 'Mau_nhap_to_truong_E-TDP.xlsx')


@app.get('/api/admin/leaders.xlsx')
@protected(admin=True)
def leaders_excel():
    rows=query('SELECT id,name,area,ward,phone,phone_alt,aliases,active FROM app.leaders ORDER BY ward,area,name')
    return excel_export(rows, 'Danh_sach_to_truong_E-TDP.xlsx')


def excel_text(value, max_len=100):
    if value is None:return ''
    # Numeric phone values in Excel lose the leading zero; never guess it.
    if isinstance(value,(int,float)) and not isinstance(value,bool):
        return str(int(value)) if int(value)==value else str(value)
    return clean(str(value),max_len)


def parse_excel(file):
    if not file.filename or not file.filename.lower().endswith('.xlsx'):
        raise ValueError('Chỉ chấp nhận file Excel định dạng .xlsx.')
    raw=file.read(EXCEL_MAX_BYTES+1)
    if len(raw)>EXCEL_MAX_BYTES:
        raise ValueError('File Excel vượt quá 2 MB.')
    try:
        book=load_workbook(io.BytesIO(raw),read_only=True,data_only=True)
        ws=book['Danh_sach_to_truong'] if 'Danh_sach_to_truong' in book.sheetnames else book.active
        headers=tuple(excel_text(c,120) for c in next(ws.iter_rows(min_row=1,max_row=1,values_only=True),()))
        if headers[:8]!=EXCEL_HEADERS:
            raise ValueError('Sai định dạng tiêu đề Excel. Vui lòng tải mẫu từ hệ thống.')
        entries=[]
        for row_idx,row in enumerate(ws.iter_rows(min_row=2,max_col=8,values_only=True),start=2):
            if not any(c is not None and str(c).strip() for c in row): continue
            if len(entries)>=EXCEL_MAX_ROWS: raise ValueError('Tối đa 500 dòng trong mỗi lần nhập.')
            entries.append((row_idx,tuple(row)))
        return entries
    except ValueError:raise
    except Exception as exc:
        raise ValueError('Không đọc được Excel. Hãy dùng file .xlsx đúng mẫu hệ thống.') from exc


def import_plan(rows):
    # Read leader snapshot for collision detection and identify stability.
    current=query('SELECT id,name,area,ward,phone,phone_alt,aliases,active FROM app.leaders')
    by_id={r['id']:r for r in current}
    by_area={}
    norm=lambda x:re.sub(r'\s+',' ',x.casefold().strip())
    for old in current:
        key=(norm(old['ward']),norm(old['area']))
        by_area.setdefault(key,[]).append(old)
    errors=[];actions=[];seen_ids=set();seen_areas=set()
    for lineno,cells in rows:
        cell=[excel_text(v,200) for v in cells]
        ident,name,area,ward,phone,phone_alt,alias_text,state=cell
        if not ward.startswith('phường '):
            matched=next((w for w in WARDS if norm(w)==norm('phường '+ward)),None)
            ward=matched or ward
        if not name or not area or ward not in WARDS:
            errors.append(f'Dòng {lineno}: thiếu họ tên/địa bàn hoặc phường không thuộc 6 phường.');continue
        if len(name)>90 or len(area)>100:
            errors.append(f'Dòng {lineno}: họ tên hoặc địa bàn quá dài.');continue
        if ident and not re.fullmatch(r'[A-Za-z0-9_-]{2,64}',ident):
            errors.append(f'Dòng {lineno}: mã tổ trưởng không hợp lệ.');continue
        if phone and (not isinstance(cells[4],str) or not re.fullmatch(r'[+0-9() .-]{9,30}',phone)):
            errors.append(f'Dòng {lineno}: số điện thoại chính phải là văn bản hợp lệ, giữ số 0 đầu.');continue
        if phone_alt and (not isinstance(cells[5],str) or not re.fullmatch(r'[+0-9() .-]{9,30}',phone_alt)):
            errors.append(f'Dòng {lineno}: số điện thoại phụ phải là văn bản hợp lệ.');continue
        if state and state not in ('Đang sử dụng','Ẩn'):
            errors.append(f'Dòng {lineno}: trạng thái phải là Đang sử dụng hoặc Ẩn.');continue
        active=state!='Ẩn'
        aliases=[clean(x,90) for x in alias_text.split(',') if clean(x)]
        if len(aliases)>20:
            errors.append(f'Dòng {lineno}: có quá nhiều tên địa bàn cũ.');continue
        area_key=(norm(ward),norm(area))
        if area_key in seen_areas:
            errors.append(f'Dòng {lineno}: trùng phường và địa bàn trong file.');continue
        seen_areas.add(area_key)
        existing=by_id.get(ident) if ident else None
        if ident:
            if ident in seen_ids:
                errors.append(f'Dòng {lineno}: mã tổ trưởng bị lặp.');continue
            seen_ids.add(ident)
            if not existing:
                errors.append(f'Dòng {lineno}: mã {ident} không tồn tại. Để trống mã để thêm người mới.');continue
        else:
            matches=by_area.get(area_key,[])
            if len(matches)>1:
                errors.append(f'Dòng {lineno}: địa bàn có nhiều bản ghi, cần mã tổ trưởng để phân biệt.');continue
            if matches:
                existing=matches[0]
                if norm(existing['name'])!=norm(name):
                    errors.append(f'Dòng {lineno}: địa bàn {area} đã có người khác; cần kiểm tra thay đổi nhân sự trước khi nhập.');continue
        conflict=by_area.get(area_key,[])
        if conflict and any(x['id'] != (existing['id'] if existing else None) for x in conflict):
            errors.append(f'Dòng {lineno}: địa bàn này đã thuộc tổ trưởng khác.');continue
        data=(name,area,ward,phone,phone_alt,json.dumps(aliases,ensure_ascii=False),active)
        if existing:
            prev=(existing['name'],existing['area'],existing['ward'],existing['phone'],existing['phone_alt'],json.dumps(existing['aliases'],ensure_ascii=False),existing['active'])
            kind='skip' if data==prev else 'update'
            actions.append((kind,existing['id'],data,lineno))
        else:
            actions.append(('create',None,data,lineno))
    result={'total':len(rows),'create':sum(a[0]=='create' for a in actions),
            'update':sum(a[0]=='update' for a in actions),
            'skip':sum(a[0]=='skip' for a in actions), 'errors':errors}
    return result,actions


@app.post('/api/admin/import-xlsx')
@protected(admin=True,write=True)
def import_xlsx():
    file=request.files.get('file')
    if file is None:return fail('Chưa chọn file Excel.')
    mode=request.form.get('mode','preview')
    if mode not in ('preview','commit'):return fail('Chế độ không hợp lệ.')
    rows=parse_excel(file)
    result,actions=import_plan(rows)
    if mode=='preview':return jsonify(result)
    if result['errors']:return fail('Dữ liệu còn lỗi. Hãy tải lại Excel và xem trước.',409)
    with g.db.transaction():
        for kind,lid,data,lineno in actions:
            if kind=='create':
                new_id='IMP-'+secrets.token_hex(6).upper()
                g.db.execute('''INSERT INTO app.leaders(id,name,area,ward,phone,phone_alt,aliases,active,source)
                    VALUES(%s,%s,%s,%s,%s,%s,%s::jsonb,%s,'Import Excel')''',(new_id,*data))
            elif kind=='update':
                g.db.execute('''UPDATE app.leaders SET name=%s,area=%s,ward=%s,phone=%s,
                    phone_alt=%s,aliases=%s::jsonb,active=%s,updated_at=now() WHERE id=%s''',(*data,lid))
    return jsonify(ok=True,**result)

@app.get('/api/admin/comments')
@protected(admin=True)
def moderation_queue():
    rows=query('''SELECT c.id,c.leader_id,l.name leader_name,l.area,l.ward,
          c.body,c.status,c.created_at,
          (SELECT count(*) FROM app.comment_reports cr WHERE cr.comment_id=c.id) reports
          FROM app.comments c JOIN app.leaders l ON l.id=c.leader_id
          ORDER BY CASE c.status WHEN 'pending' THEN 0 WHEN 'hidden' THEN 1 ELSE 2 END,
          c.id DESC LIMIT 500''')
    return jsonify(comments=[iso_row(r,'created_at') for r in rows])


@app.put('/api/admin/comments/<int:cid>')
@protected(admin=True,write=True)
def moderate(cid):
    status=payload().get('status')
    if status not in ('approved','rejected','hidden','pending'):
        return fail('Trạng thái duyệt không hợp lệ.')
    cur=g.db.execute('UPDATE app.comments SET status=%s,moderated_at=now() WHERE id=%s',(status,cid))
    if cur.rowcount==0:
        return fail('Bình luận không tồn tại.',404)
    return jsonify(ok=True)


@app.get('/api/admin/export.csv')
@protected(admin=True)
def export_csv():
    ranks, _=stats_for(require())
    output=io.StringIO()
    writer=csv.writer(output)
    writer.writerow(['Mã','Tổ trưởng','Địa bàn','Phường','Tổng phiếu',*LEVELS,'Điểm (1-4)'])
    for r in query('SELECT id,name,area,ward FROM app.leaders WHERE active=TRUE ORDER BY ward,area'):
        s=ranks.get(r['id'])
        writer.writerow([r['id'],r['name'],r['area'],r['ward'],s['total'] if s else 0]
                        + ([s[f'n{i}'] for i in range(1,5)] if s else [0]*4)
                        + ([s['score']] if s else ['']))
    return Response('\ufeff'+output.getvalue(),mimetype='text/csv; charset=utf-8',
                    headers={'Content-Disposition':'attachment; filename="ket_qua_binh_chon.csv"'})


if __name__=='__main__':
    app.run(host='127.0.0.1',port=int(os.getenv('PORT','8765')),debug=False)
