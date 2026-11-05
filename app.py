"""Tổ trưởng dân phố V4: Flask API + Supabase PostgreSQL.

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
from functools import wraps
from pathlib import Path

import psycopg
from psycopg.rows import dict_row
from flask import Flask, Response, g, jsonify, make_response, request, send_from_directory

ROOT = Path(__file__).resolve().parent
app = Flask(__name__)
app.json.ensure_ascii = False
app.config['MAX_CONTENT_LENGTH'] = 20_000
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
        if user and user['role'] == 'admin':
            leader.update(phone=row['phone'], phone_alt=row['phone_alt'], source=row['source'])
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
    if user['role']!='voter':
        return fail('Quản trị viên không tham gia bình chọn.',403)
    data = payload()
    level = data.get('level')
    if type(level) is not int or level not in (1,2,3,4):
        return fail('Chọn một trong bốn mức đánh giá.')
    lid = checked_leader(data.get('leader_id'))
    g.db.execute('''INSERT INTO app.votes(participant_id,leader_id,level,updated_at)
              VALUES (%s,%s,%s,now()) ON CONFLICT(participant_id,leader_id)
              DO UPDATE SET level=excluded.level,updated_at=excluded.updated_at''',
              (user['id'],lid,level))
    return jsonify(ok=True,message='Đã lưu phiếu. Bạn có thể thay đổi lựa chọn.')


@app.delete('/api/vote/<lid>')
@protected(write=True)
def unvote(lid):
    user=require()
    g.db.execute('DELETE FROM app.votes WHERE participant_id=%s AND leader_id=%s',
                 (user['id'],clean(lid,48)))
    return jsonify(ok=True)


def iso_row(row, *keys):
    row = dict(row)
    for key in keys:
        if row.get(key) is not None:
            row[key] = row[key].isoformat()
    return row


def comments_response(user):
    lid = checked_leader(request.args.get('leader_id'))
    if user:
        rows=query('''SELECT c.id,c.body,c.status,c.created_at,
            (c.participant_id=%s) AS is_mine FROM app.comments c
            WHERE c.leader_id=%s AND (c.status='approved' OR c.participant_id=%s)
            ORDER BY id DESC LIMIT 100''', (user['id'],lid,user['id']))
    else:
        rows=query('''SELECT id,body,status,created_at,FALSE as is_mine
               FROM app.comments WHERE leader_id=%s AND status='approved'
               ORDER BY id DESC LIMIT 100''', (lid,))
    n=scalar("SELECT count(*) FROM app.comments WHERE leader_id=%s AND status='approved'",(lid,))
    return jsonify(comments=[iso_row(r,'created_at') for r in rows],total_approved=n)


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
    if user['role']!='voter':
        return fail('Quản trị viên không thể gửi đánh giá ẩn danh.',403)
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
    if user['role']!='voter':
        return fail('Quản trị viên không gửi báo cáo.',403)
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
