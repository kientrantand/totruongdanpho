#!/usr/bin/env python3
"""Binh chon to truong dan pho - Python standard library, multi-user SQLite server."""
import argparse
import base64
import csv
import hashlib
import hmac
import io
import json
import os
import re
import secrets
import socket
import sqlite3
import ssl
import sys
import threading
import time
import unicodedata
import urllib.parse
import webbrowser
from datetime import datetime, timezone
from http import HTTPStatus
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DB_PATH = Path(os.environ.get('TDP_DB_PATH', str(ROOT / 'data' / 'votes.sqlite3'))).expanduser()
SEED_FILE = ROOT / 'data' / 'to_truong_126.json'
COOKIE = 'tdp_session'
SESSION_AGE = 60 * 60 * 24 * 180
MIN_PUBLIC_VOTES = 3
MIN_RANK_VOTES = 5
ALLOWED_WARDS = ('phường Trường Thi','phường Đông A','phường Thành Nam','phường Nam Định','phường Thiên Trường','phường Mỹ Lộc')
MAX_COMMENT_CHARS = 700
MAX_BODY = 20_000
LEVELS = ('Đáng yêu, dễ tính', 'Bình thường, không khó cũng không dễ',
          'Quái tính, lúc nắng lúc mưa', 'Thường xuyên gây khó khăn')
CSS_JS = {'/': ('index.html', 'text/html; charset=utf-8'),
          '/index.html': ('index.html', 'text/html; charset=utf-8'),
          '/static/style.css': ('style.css', 'text/css; charset=utf-8'),
          '/static/app.js': ('app.js', 'text/javascript; charset=utf-8')}
AUTH_TRIES = {}
AUTH_LOCK = threading.Lock()
SECURE_COOKIES = False


def db():
    conn = sqlite3.connect(str(DB_PATH), timeout=15)
    conn.row_factory = sqlite3.Row
    conn.execute('PRAGMA foreign_keys=ON')
    conn.execute('PRAGMA busy_timeout=15000')
    return conn


def digest(s):
    return hashlib.sha256(s.encode('utf-8')).hexdigest()


def hashed_password(password, salt=None):
    salt = salt or secrets.token_hex(16)
    pwd = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'),
                             bytes.fromhex(salt), 370_000).hex()
    return salt + ':' + pwd


def verify_password(value, stored):
    try:
        salt, _ = stored.split(':', 1)
        return hmac.compare_digest(hashed_password(value, salt), stored)
    except (ValueError, AttributeError):
        return False


def safe_text(v, length=120):
    if not isinstance(v, str):
        return ''
    return re.sub(r'\s+', ' ', v).strip()[:length]


def utcnow():
    return datetime.now(timezone.utc).isoformat(timespec='seconds')


def setup_db():
    DB_PATH.parent.mkdir(exist_ok=True, parents=True)
    first_run = not DB_PATH.exists()
    with db() as con:
        con.executescript('''
          CREATE TABLE IF NOT EXISTS leaders (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            area TEXT NOT NULL,
            ward TEXT NOT NULL,
            phone TEXT NOT NULL DEFAULT '',
            phone_alt TEXT NOT NULL DEFAULT '',
            aliases TEXT NOT NULL DEFAULT '[]',
            source TEXT NOT NULL DEFAULT '',
            active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL
          );
          CREATE TABLE IF NOT EXISTS participants (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            label TEXT NOT NULL,
            code_hash TEXT NOT NULL UNIQUE,
            role TEXT NOT NULL CHECK(role IN ('admin','voter')),
            active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL
          );
          CREATE TABLE IF NOT EXISTS sessions (
            token_hash TEXT PRIMARY KEY,
            participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
            csrf_token TEXT NOT NULL,
            expires_at INTEGER NOT NULL
          );
          CREATE TABLE IF NOT EXISTS votes (
            participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
            leader_id TEXT NOT NULL REFERENCES leaders(id),
            level INTEGER NOT NULL CHECK(level BETWEEN 1 AND 4),
            updated_at TEXT NOT NULL,
            PRIMARY KEY(participant_id, leader_id)
          );
          CREATE TABLE IF NOT EXISTS comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            leader_id TEXT NOT NULL REFERENCES leaders(id),
            participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
            body TEXT NOT NULL,
            status TEXT NOT NULL CHECK(status IN ('pending','approved','hidden','rejected')) DEFAULT 'pending',
            created_at TEXT NOT NULL,
            moderated_at TEXT
          );
          CREATE TABLE IF NOT EXISTS comment_reports (
            comment_id INTEGER NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
            participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
            created_at TEXT NOT NULL,
            PRIMARY KEY(comment_id, participant_id)
          );
          CREATE INDEX IF NOT EXISTS idx_comments_leader_status ON comments(leader_id,status,id DESC);
          CREATE INDEX IF NOT EXISTS idx_comments_status ON comments(status,id DESC);
          CREATE INDEX IF NOT EXISTS idx_leaders_ward ON leaders(ward,active);
          CREATE INDEX IF NOT EXISTS idx_votes_leader ON votes(leader_id);
        ''')
        if not con.execute('SELECT 1 FROM leaders LIMIT 1').fetchone():
            data = json.loads(SEED_FILE.read_text(encoding='utf-8'))
            for row in data:
                con.execute('''INSERT INTO leaders(id,name,area,ward,phone,phone_alt,aliases,source,created_at)
                               VALUES(?,?,?,?,?,?,?,?,?)''',
                    (row['id'], row['name'], row['area'], row['ward'],
                     row.get('phone', ''), row.get('phoneAlt', ''),
                     json.dumps(row.get('aliases', []), ensure_ascii=False),
                     row.get('source', ''), utcnow()))
            print(f'Loaded {len(data)} leaders from the dataset.')
        if not con.execute("SELECT 1 FROM participants WHERE role='admin' LIMIT 1").fetchone():
            password = secrets.token_urlsafe(12)
            con.execute('''INSERT INTO participants(label,code_hash,role,created_at)
                           VALUES('Quản trị viên',?,'admin',?)''',
                        (hashed_password(password), utcnow()))
            print('\n' + '=' * 72)
            print('MẬT KHẨU QUẢN TRỊ LẦN ĐẦU (HÃY LƯU NGAY, CHỈ HIỆN 1 LẦN):')
            print(password)
            print('=' * 72 + '\n')
        con.execute('DELETE FROM sessions WHERE expires_at < ?', (int(time.time()),))
    return first_run


def reset_admin_password():
    password = secrets.token_urlsafe(12)
    with db() as con:
        con.execute("UPDATE participants SET code_hash=?, active=1 WHERE role='admin'",
                    (hashed_password(password),))
        con.execute("DELETE FROM sessions WHERE participant_id IN (SELECT id FROM participants WHERE role='admin')")
    print('MẬT KHẨU QUẢN TRỊ MỚI:', password)


def normalize(s):
    s = unicodedata.normalize('NFD', str(s).lower())
    s = ''.join(c for c in s if not unicodedata.combining(c))
    return s.replace('đ', 'd')


def leader_stats(con, user_id):
    rows = con.execute('''SELECT leader_id, COUNT(*) AS total,
        SUM(CASE WHEN level=1 THEN 1 ELSE 0 END) AS n1,
        SUM(CASE WHEN level=2 THEN 1 ELSE 0 END) AS n2,
        SUM(CASE WHEN level=3 THEN 1 ELSE 0 END) AS n3,
        SUM(CASE WHEN level=4 THEN 1 ELSE 0 END) AS n4,
        ROUND(AVG(5.0 - level),2) AS score
        FROM votes GROUP BY leader_id''').fetchall()
    own = {r['leader_id']: r['level'] for r in con.execute(
        'SELECT leader_id, level FROM votes WHERE participant_id=?', (user_id,))}
    return {r['leader_id']: dict(r) for r in rows}, own


def participant_api(con, user):
    data = dict(user)
    voted = con.execute('SELECT COUNT(*) FROM votes WHERE participant_id=?',(user['id'],)).fetchone()[0]
    return {'id': user['id'], 'label': user['label'], 'role': user['role'],
            'voted': voted, 'csrf': user['csrf_token']}


def rate_limit(ip):
    now = time.time()
    with AUTH_LOCK:
        attempts = [t for t in AUTH_TRIES.get(ip, []) if now - t < 300]
        if len(attempts) >= 12:
            return True
        attempts.append(now)
        AUTH_TRIES[ip] = attempts
        if len(AUTH_TRIES) > 400:
            AUTH_TRIES.clear()
        return False


class ApiError(Exception):
    def __init__(self, status, msg):
        self.status, self.msg = status, msg


class Handler(BaseHTTPRequestHandler):
    server_version = 'ToPhoVote/3.1'
    def log_message(self, fmt, *args):
        if self.path.startswith('/api/') and self.command == 'GET':
            return
        super().log_message(fmt, *args)

    def headers_common(self):
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Referrer-Policy', 'no-referrer')
        self.send_header('X-Frame-Options', 'DENY')
        self.send_header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
        self.send_header('Content-Security-Policy', "default-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; img-src 'self' data:; connect-src 'self' https://raw.githubusercontent.com; script-src 'self'; style-src 'self'")

    def response(self, status, obj, headers=None, ctype='application/json; charset=utf-8'):
        content = (json.dumps(obj, ensure_ascii=False).encode('utf-8') if not isinstance(obj, bytes) else obj)
        self.send_response(status)
        self.headers_common()
        self.send_header('Content-Type', ctype)
        self.send_header('Content-Length', str(len(content)))
        for key, val in (headers or {}).items():
            self.send_header(key, val)
        self.end_headers()
        self.wfile.write(content)

    def content_json(self):
        try:
            n = int(self.headers.get('Content-Length','0'))
        except ValueError:
            raise ApiError(400,'Dữ liệu gửi không hợp lệ.')
        if n <= 0 or n > MAX_BODY:
            raise ApiError(413,'Dữ liệu quá lớn hoặc bị thiếu.')
        if 'application/json' not in self.headers.get('Content-Type', ''):
            raise ApiError(415,'Yêu cầu nội dung JSON.')
        try:
            parsed = json.loads(self.rfile.read(n).decode('utf-8'))
            if not isinstance(parsed, dict):
                raise ValueError()
            return parsed
        except (ValueError, UnicodeDecodeError):
            raise ApiError(400,'Dữ liệu JSON không hợp lệ.')

    def current_user(self, con):
        try:
            cookie = SimpleCookie()
            cookie.load(self.headers.get('Cookie', ''))
            token = cookie.get(COOKIE)
            if not token:
                return None
            value = token.value
            if len(value) > 160:
                return None
            return con.execute('''SELECT p.id,p.label,p.role,p.active,s.csrf_token
                 FROM sessions s JOIN participants p ON p.id=s.participant_id
                 WHERE s.token_hash=? AND s.expires_at>? AND p.active=1''',
                 (digest(value),int(time.time()))).fetchone()
        except Exception:
            return None

    def anonymous_user(self, con):
        # Anonymously register one browser; not a one-person-one-vote guarantee.
        existing = self.current_user(con)
        if existing:
            return existing, None
        # No IP or identifying data is stored in the users table.
        random_id = secrets.token_urlsafe(32)
        label = 'Khách ẩn danh'
        pid = con.execute("INSERT INTO participants(label, code_hash, role, created_at) VALUES(?, ?, 'voter', ?)", (label, digest(random_id), utcnow())).lastrowid
        session = secrets.token_urlsafe(32)
        csrf = secrets.token_urlsafe(24)
        con.execute('INSERT INTO sessions(token_hash,participant_id,csrf_token,expires_at) VALUES(?,?,?,?)',
                    (digest(session), pid, csrf, int(time.time())+SESSION_AGE))
        user = con.execute('''SELECT p.id,p.label,p.role,p.active,s.csrf_token
                 FROM sessions s JOIN participants p ON p.id=s.participant_id
                 WHERE s.token_hash=?''', (digest(session),)).fetchone()
        return user, self.cookie_header(session)

    def require(self, con, admin=False, mutate=False):
        user = self.current_user(con)
        if not user:
            raise ApiError(401,'Phiên ẩn danh chưa được tạo. Vui lòng tải lại trang.')
        if admin and user['role'] != 'admin':
            raise ApiError(403,'Bạn không có quyền quản trị.')
        if mutate:
            provided = self.headers.get('X-CSRF-Token','')
            if not hmac.compare_digest(provided, user['csrf_token']):
                raise ApiError(403,'Phiên bảo mật không hợp lệ. Hãy tải lại trang.')
        return user

    def cookie_header(self, token, delete=False):
        secure = '; Secure' if SECURE_COOKIES else ''
        if delete:
            return f'{COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0{secure}'
        return f'{COOKIE}={token}; Path=/; HttpOnly; SameSite=Strict; Max-Age={SESSION_AGE}{secure}'

    def handle_request(self, method):
        try:
            path = urllib.parse.urlparse(self.path).path
            if method == 'GET' and path in CSS_JS:
                name, content_type = CSS_JS[path]
                fpath = ROOT / 'static' / name
                return self.response(200, fpath.read_bytes(), ctype=content_type,
                    headers={'Cache-Control':'no-cache'})
            if not path.startswith('/api/'):
                return self.response(404,{'error':'Không tìm thấy.'})
            with db() as con:
                if method == 'POST' and path == '/api/login':
                    return self.login(con)
                if method == 'GET' and path == '/api/me':
                    user, cookie_header = self.anonymous_user(con)
                    hdr = {'Set-Cookie':cookie_header} if cookie_header else None
                    return self.response(200,{'user':participant_api(con,user)},hdr)
                # Public, read-only directory and results. Phone numbers and user identities stay private.
                if method == 'GET' and path == '/api/public/leaders':
                    return self.get_leaders(con, {'id': -1, 'role': 'guest'})
                if method == 'GET' and path == '/api/public/overview':
                    return self.overview(con, {'id': -1, 'role': 'guest'})
                if method == 'GET' and path == '/api/public/rankings':
                    return self.rankings(con, {'id': -1, 'role': 'guest'})
                if method == 'GET' and path == '/api/public/comments':
                    return self.public_comments(con)
                if method == 'POST' and path == '/api/logout':
                    user = self.require(con,mutate=True)
                    cookie = SimpleCookie(); cookie.load(self.headers.get('Cookie',''))
                    con.execute('DELETE FROM sessions WHERE token_hash=?', (digest(cookie[COOKIE].value),))
                    return self.response(200,{'ok':True},{'Set-Cookie':self.cookie_header('',True)})
                user = self.require(con, mutate=(method!='GET'))
                if method == 'GET' and path == '/api/leaders':
                    return self.get_leaders(con, user)
                if method == 'POST' and path == '/api/vote':
                    return self.vote(con, user)
                if method == 'DELETE' and path.startswith('/api/vote/'):
                    return self.delete_vote(con,user,path.removeprefix('/api/vote/'))
                if method == 'GET' and path == '/api/overview':
                    return self.overview(con,user)
                if method == 'GET' and path == '/api/rankings':
                    return self.rankings(con,user)
                if method == 'GET' and path == '/api/comments':
                    return self.list_comments(con,user)
                if method == 'POST' and path == '/api/comments':
                    return self.add_comment(con,user)
                m = re.fullmatch(r'/api/comments/(\d+)',path)
                if method == 'DELETE' and m:
                    return self.remove_comment(con,user,int(m.group(1)))
                m = re.fullmatch(r'/api/comments/(\d+)/report',path)
                if method == 'POST' and m:
                    return self.report_comment(con,user,int(m.group(1)))
                if path.startswith('/api/admin/'):
                    self.require(con, admin=True)
                    return self.admin_api(con,user,method,path)
                raise ApiError(404,'Không tìm thấy chức năng.')
        except ApiError as ex:
            self.response(ex.status,{'error':ex.msg})
        except (BrokenPipeError,ConnectionResetError):
            pass
        except Exception as ex:
            print('ERROR:',type(ex).__name__,ex,file=sys.stderr)
            try:
                self.response(500,{'error':'Lỗi máy chủ. Vui lòng thử lại.'})
            except Exception:
                pass

    def do_GET(self): self.handle_request('GET')
    def do_POST(self): self.handle_request('POST')
    def do_PUT(self): self.handle_request('PUT')
    def do_DELETE(self): self.handle_request('DELETE')

    def login(self,con):
        if rate_limit(self.client_address[0]):
            raise ApiError(429,'Đăng nhập quá nhiều lần. Hãy thử lại sau 5 phút.')
        data = self.content_json()
        role = data.get('role','voter')
        if role != 'admin':
            raise ApiError(400,'Chỉ quản trị viên cần đăng nhập.')
        token = safe_text(data.get('code',''),200)
        if len(token) < 4:
            raise ApiError(400,'Vui lòng nhập mã đăng nhập.')
        if role == 'admin':
            row = con.execute("SELECT * FROM participants WHERE role='admin' AND active=1 LIMIT 1").fetchone()
            good = bool(row and verify_password(token,row['code_hash']))
        else:
            row = con.execute("SELECT * FROM participants WHERE role='voter' AND active=1 AND code_hash=?",
                              (digest(token.upper()),)).fetchone()
            good = bool(row)
        if not good:
            raise ApiError(401,'Mã hoặc mật khẩu không đúng.')
        session = secrets.token_urlsafe(32)
        csrf = secrets.token_urlsafe(24)
        con.execute('INSERT INTO sessions(token_hash,participant_id,csrf_token,expires_at) VALUES(?,?,?,?)',
                    (digest(session),row['id'],csrf,int(time.time())+SESSION_AGE))
        return self.response(200,{'user':{'id':row['id'],'label':row['label'],'role':row['role'],'csrf':csrf}},
            {'Set-Cookie':self.cookie_header(session)})

    def get_leaders(self,con,user):
        rows = con.execute('SELECT * FROM leaders WHERE active=1 ORDER BY ward,area,name').fetchall()
        agg, own = leader_stats(con,user['id'])
        comment_totals={r['leader_id']:r['cnt'] for r in con.execute("SELECT leader_id, COUNT(*) cnt FROM comments WHERE status='approved' GROUP BY leader_id")}
        resp=[]
        for r in rows:
            stats=agg.get(r['id'])
            n=stats['total'] if stats else 0
            reveal=(n >= MIN_PUBLIC_VOTES or user['role']=='admin')
            info={'id':r['id'],'name':r['name'],'area':r['area'], 'ward':r['ward'],
                  'aliases':json.loads(r['aliases']),'my_vote':own.get(r['id']),
                  'votes':n,'revealed':reveal,'comments':comment_totals.get(r['id'],0),
                  'counts':[stats['n'+str(i)] for i in range(1,5)] if stats and reveal else None,
                  'score':stats['score'] if stats and reveal else None}
            if user['role']=='admin':
                info.update({'phone':r['phone'],'phone_alt':r['phone_alt'],'source':r['source']})
            resp.append(info)
        return self.response(200,{'leaders':resp,'minimum':MIN_PUBLIC_VOTES})

    def overview(self,con,user):
        row=con.execute('SELECT COUNT(*) AS voters FROM participants WHERE role=\'voter\' AND active=1').fetchone()
        count=con.execute('SELECT COUNT(*) FROM votes').fetchone()[0]
        unique_voters=con.execute('SELECT COUNT(DISTINCT participant_id) FROM votes').fetchone()[0]
        wards={w:0 for w in ALLOWED_WARDS}
        wards.update({r['ward']:r['cnt'] for r in con.execute('SELECT ward,COUNT(*) AS cnt FROM leaders WHERE active=1 GROUP BY ward') if r['ward'] in wards})
        return self.response(200,{'total_votes':count,'participating_voters':unique_voters,
           'voter_accounts':row['voters'] if user['role']=='admin' else None,
           'wards':wards,'leader_count':sum(wards.values()),'minimum':MIN_PUBLIC_VOTES})

    def vote(self,con,user):
        if user['role'] != 'voter':
            raise ApiError(403,'Quản trị viên không tham gia bình chọn.')
        data=self.content_json()
        lid=safe_text(data.get('leader_id',''),36)
        level=data.get('level')
        if type(level) is not int or level not in (1,2,3,4):
            raise ApiError(400,'Mức đánh giá phải từ 1 đến 4.')
        if not con.execute('SELECT 1 FROM leaders WHERE id=? AND active=1',(lid,)).fetchone():
            raise ApiError(404,'Không tìm thấy tổ trưởng.')
        con.execute('''INSERT INTO votes(participant_id,leader_id,level,updated_at) VALUES(?,?,?,?)
           ON CONFLICT(participant_id,leader_id) DO UPDATE SET level=excluded.level,
           updated_at=excluded.updated_at''', (user['id'],lid,level,utcnow()))
        return self.response(200,{'ok':True,'message':'Đã ghi nhận bình chọn. Bạn có thể thay đổi lựa chọn.'})

    def delete_vote(self,con,user,lid):
        if user['role'] != 'voter':
            raise ApiError(403,'Tài khoản này không tham gia bình chọn.')
        con.execute('DELETE FROM votes WHERE participant_id=? AND leader_id=?',(user['id'],lid))
        return self.response(200,{'ok':True})

    def rankings(self,con,user):
        # Show only sufficient sample sizes. Equal weight for each unique participant.
        rows=con.execute('''SELECT l.id,l.name,l.area,l.ward, COUNT(v.level) votes,
            SUM(CASE WHEN v.level=1 THEN 1 ELSE 0 END) easy,
            SUM(CASE WHEN v.level=3 THEN 1 ELSE 0 END) changing,
            SUM(CASE WHEN v.level=4 THEN 1 ELSE 0 END) difficult,
            ROUND(AVG(CASE WHEN v.level IS NOT NULL THEN 5.0-v.level END),2) score
            FROM leaders l LEFT JOIN votes v ON l.id=v.leader_id
            WHERE l.active=1 GROUP BY l.id HAVING COUNT(v.level)>=?''',
            (MIN_RANK_VOTES,)).fetchall()
        people=[]
        for r in rows:
            x=dict(r)
            x['easy_pct']=round(100*x['easy']/x['votes'],1)
            x['hard_pct']=round(100*(x['changing']+x['difficult'])/x['votes'],1)
            x['severe_pct']=round(100*x['difficult']/x['votes'],1)
            people.append(x)
        easy=sorted(people,key=lambda x:(-x['easy_pct'],-x['score'],-x['votes'],x['name']))[:10]
        difficult=sorted(people,key=lambda x:(-x['hard_pct'],-x['severe_pct'],-x['votes'],x['name']))[:10]
        return self.response(200,{'easy':easy,'difficult':difficult,'minimum_votes':MIN_RANK_VOTES,
            'eligible_count':len(people)})

    def public_comments(self,con):
        query=urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        lid=safe_text((query.get('leader_id') or [''])[0],48)
        if not con.execute('SELECT 1 FROM leaders WHERE id=? AND active=1',(lid,)).fetchone():
            raise ApiError(404,'Không tìm thấy tổ trưởng.')
        rows=con.execute("SELECT id,body,created_at FROM comments WHERE leader_id=? AND status='approved' ORDER BY id DESC LIMIT 100",(lid,)).fetchall()
        total=con.execute("SELECT COUNT(*) FROM comments WHERE leader_id=? AND status='approved'",(lid,)).fetchone()[0]
        return self.response(200,{'comments':[dict(r, status='approved',is_mine=False) for r in rows], 'total_approved':total})

    def list_comments(self,con,user):
        query=urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        lid=safe_text((query.get('leader_id') or [''])[0],48)
        if not con.execute('SELECT 1 FROM leaders WHERE id=? AND active=1',(lid,)).fetchone():
            raise ApiError(404,'Không tìm thấy tổ trưởng.')
        # Published comments and own queued comments; author details are never returned.
        rows=con.execute('''SELECT c.id,c.body,c.status,c.created_at,
           (c.participant_id=?) AS is_mine,
           (SELECT COUNT(*) FROM comment_reports cr WHERE cr.comment_id=c.id) AS reports
           FROM comments c WHERE c.leader_id=? AND
           (c.status='approved' OR c.participant_id=?) ORDER BY c.id DESC LIMIT 100''',
           (user['id'],lid,user['id'])).fetchall()
        data=[]
        for r in rows:
            o=dict(r)
            o.pop('reports',None)
            o['is_mine']=bool(o['is_mine'])
            data.append(o)
        num=con.execute("SELECT COUNT(*) FROM comments WHERE leader_id=? AND status='approved'",(lid,)).fetchone()[0]
        return self.response(200,{'comments':data,'total_approved':num})

    def add_comment(self,con,user):
        if user['role'] != 'voter':
            raise ApiError(403,'Không thể bình luận bằng tài khoản quản trị.')
        data=self.content_json()
        lid=safe_text(data.get('leader_id',''),48)
        body=data.get('body')
        if not isinstance(body,str):
            raise ApiError(400,'Bình luận không hợp lệ.')
        body=re.sub(r'\s+',' ',body).strip()
        if len(body)<5 or len(body)>MAX_COMMENT_CHARS:
            raise ApiError(400,'Bình luận phải dài từ 5 đến 700 ký tự.')
        if re.search(r'(?:https?://|www\.|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,})',body,re.I):
            raise ApiError(400,'Không đăng đường dẫn hay email trong bình luận.')
        if re.search(r'(?<!\d)(?:\+?84|0)\s*[1-9](?:[\s.\-]*\d){7,10}(?!\d)',body):
            raise ApiError(400,'Vui lòng không đăng số điện thoại trong bình luận.')
        if not con.execute('SELECT 1 FROM leaders WHERE id=? AND active=1',(lid,)).fetchone():
            raise ApiError(404,'Không tìm thấy tổ trưởng.')
        recent=con.execute('''SELECT created_at FROM comments WHERE participant_id=?
            ORDER BY id DESC LIMIT 1''',(user['id'],)).fetchone()
        now=datetime.now(timezone.utc)
        if recent and (now-datetime.fromisoformat(recent['created_at'])).total_seconds()<40:
            raise ApiError(429,'Bạn có thể gửi bình luận tiếp theo sau 40 giây.')
        qty=con.execute('''SELECT COUNT(*) FROM comments WHERE participant_id=? AND leader_id=?
             AND created_at>=?''',(user['id'],lid,datetime.fromtimestamp(time.time()-86400,timezone.utc).isoformat(timespec='seconds'))).fetchone()[0]
        if qty>=3:
            raise ApiError(429,'Tối đa 3 bình luận cho một tổ trưởng trong 24 giờ.')
        cursor=con.execute('''INSERT INTO comments(leader_id,participant_id,body,status,created_at)
             VALUES(?,?,?,'pending',?)''',(lid,user['id'],body,utcnow()))
        return self.response(201,{'ok':True,'id':cursor.lastrowid,'status':'pending',
             'message':'Đã nhận bình luận ẩn danh. Nội dung sẽ hiển thị sau khi được duyệt.'})

    def remove_comment(self,con,user,cid):
        row=con.execute('SELECT participant_id FROM comments WHERE id=?',(cid,)).fetchone()
        if not row or (row['participant_id']!=user['id'] and user['role']!='admin'):
            raise ApiError(404,'Không tìm thấy bình luận của bạn.')
        con.execute('DELETE FROM comments WHERE id=?',(cid,))
        return self.response(200,{'ok':True})

    def report_comment(self,con,user,cid):
        if user['role']!='voter':
            raise ApiError(403,'Không thể báo cáo bằng tài khoản quản trị.')
        row=con.execute("SELECT participant_id,status FROM comments WHERE id=?",(cid,)).fetchone()
        if not row or row['status']!='approved':
            raise ApiError(404,'Bình luận đã không còn công khai.')
        if row['participant_id']==user['id']:
            raise ApiError(400,'Không thể báo cáo bình luận của chính bạn.')
        con.execute('INSERT OR IGNORE INTO comment_reports(comment_id,participant_id,created_at) VALUES(?,?,?)',(cid,user['id'],utcnow()))
        reported=con.execute('SELECT COUNT(*) FROM comment_reports WHERE comment_id=?',(cid,)).fetchone()[0]
        if reported>=2:
            con.execute("UPDATE comments SET status='hidden',moderated_at=? WHERE id=?",(utcnow(),cid))
        return self.response(200,{'ok':True,'message':'Đã ghi nhận báo cáo. Cảm ơn bạn.'})

    def admin_api(self,con,user,method,path):
        if method=='GET' and path=='/api/admin/comments':
            rows=con.execute('''SELECT c.id,c.leader_id,l.name AS leader_name,l.area,l.ward,
                 c.body,c.status,c.created_at,
                 (SELECT COUNT(*) FROM comment_reports r WHERE r.comment_id=c.id) reports
                 FROM comments c JOIN leaders l ON l.id=c.leader_id
                 ORDER BY CASE c.status WHEN 'pending' THEN 0 WHEN 'hidden' THEN 1 ELSE 2 END,
                 c.id DESC LIMIT 500''').fetchall()
            return self.response(200,{'comments':[dict(r) for r in rows]})
        m=re.fullmatch(r'/api/admin/comments/(\d+)',path)
        if method=='PUT' and m:
            data=self.content_json()
            status=data.get('status')
            if status not in ('approved','rejected','hidden','pending'):
                raise ApiError(400,'Trạng thái duyệt không hợp lệ.')
            cur=con.execute('UPDATE comments SET status=?,moderated_at=? WHERE id=?',
               (status,utcnow(),int(m.group(1))))
            if cur.rowcount==0:
                raise ApiError(404,'Bình luận không tồn tại.')
            return self.response(200,{'ok':True})
        if method=='GET' and path=='/api/admin/export.csv':
            out=io.StringIO()
            writer=csv.writer(out)
            writer.writerow(['Mã','Họ tên tổ trưởng','Địa bàn','Phường','Tổng phiếu'] + list(LEVELS) + ['Điểm thuận lợi (1-4)'])
            stats,_=leader_stats(con,user['id'])
            for r in con.execute('SELECT id,name,area,ward FROM leaders WHERE active=1 ORDER BY ward,area'):
                st=stats.get(r['id'])
                writer.writerow([r['id'],r['name'],r['area'],r['ward'],st['total'] if st else 0] +
                    ([st[f'n{i}'] for i in range(1,5)] if st else [0]*4) + [st['score'] if st else ''])
            data=('\ufeff'+out.getvalue()).encode('utf-8')
            return self.response(200,data,{'Content-Disposition':'attachment; filename="ket_qua_binh_chon.csv"'},
                                 ctype='text/csv; charset=utf-8')
        if method=='GET' and path=='/api/admin/leaders':
            rows=con.execute('SELECT * FROM leaders ORDER BY active DESC, ward,area').fetchall()
            return self.response(200,{'leaders':[{'id':r['id'],'name':r['name'],'area':r['area'],
              'ward':r['ward'],'phone':r['phone'],'phone_alt':r['phone_alt'],
              'aliases':json.loads(r['aliases']),'active':bool(r['active'])} for r in rows]})
        if method=='POST' and path=='/api/admin/leaders':
            data=self.content_json()
            clean=self.check_leader_data(data)
            lid='NEW-'+secrets.token_hex(5).upper()
            con.execute('''INSERT INTO leaders(id,name,area,ward,phone,phone_alt,aliases,source,created_at)
              VALUES(?,?,?,?,?,?,?,?,?)''',(lid,*clean,'Thêm thủ công',utcnow()))
            return self.response(201,{'id':lid,'ok':True})
        m=re.fullmatch(r'/api/admin/leaders/([A-Za-z0-9-]+)',path)
        if method=='PUT' and m:
            data=self.content_json()
            clean=self.check_leader_data(data)
            if not con.execute('SELECT 1 FROM leaders WHERE id=?',(m.group(1),)).fetchone():
                raise ApiError(404,'Không tìm thấy tổ trưởng.')
            active=data.get('active',True)
            if type(active) is not bool:
                raise ApiError(400,'Trạng thái không hợp lệ.')
            con.execute('''UPDATE leaders SET name=?,area=?,ward=?,phone=?,phone_alt=?,aliases=?,active=? WHERE id=?''',
                        (*clean,int(active),m.group(1)))
            return self.response(200,{'ok':True})
        raise ApiError(404,'Không tìm thấy chức năng quản trị.')

    def check_leader_data(self,data):
        name=safe_text(data.get('name'),90)
        area=safe_text(data.get('area'),100)
        ward=safe_text(data.get('ward'),100)
        phone=safe_text(data.get('phone',''),30)
        alt=safe_text(data.get('phone_alt',''),30)
        aliases=data.get('aliases',[])
        if not name or not area or not ward:
            raise ApiError(400,'Cần đủ tên tổ trưởng, tổ/thôn/xóm và xã/phường.')
        if ward not in ALLOWED_WARDS:
            raise ApiError(400,'Chỉ cho phép 6 phường trong bản đồ. Vui lòng chọn tên phường từ danh sách.')
        if not isinstance(aliases,list) or len(aliases)>20:
            raise ApiError(400,'Danh sách tên địa bàn cũ không hợp lệ.')
        aliases=[safe_text(a,90) for a in aliases if isinstance(a,str)]
        return (name,area,ward,phone,alt,json.dumps(aliases,ensure_ascii=False))


def main():
    global SECURE_COOKIES
    parser=argparse.ArgumentParser(description='He thong binh chon to truong dan pho')
    parser.add_argument('--host',default='0.0.0.0')
    parser.add_argument('--port',type=int,default=int(os.environ.get('PORT', '8765')))
    parser.add_argument('--no-browser',action='store_true')
    parser.add_argument('--reset-admin',action='store_true')
    parser.add_argument('--secure-cookies',action='store_true',help='Dung khi truy cap qua HTTPS reverse proxy')
    parser.add_argument('--cert',help='Duong dan TLS certificate (PEM)')
    parser.add_argument('--key',help='Duong dan TLS private key (PEM)')
    args=parser.parse_args()
    SECURE_COOKIES=args.secure_cookies or bool(args.cert)
    setup_db()
    if args.reset_admin:
        reset_admin_password()
        return
    server=ThreadingHTTPServer((args.host,args.port),Handler)
    server.daemon_threads=True
    scheme='http'
    if args.cert and args.key:
        ctx=ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        ctx.minimum_version=ssl.TLSVersion.TLSv1_2
        ctx.load_cert_chain(args.cert,args.key)
        server.socket=ctx.wrap_socket(server.socket,server_side=True)
        scheme='https'
    print(f'\nSERVER: {scheme}://127.0.0.1:{args.port}/')
    try:
        ips=socket.gethostbyname_ex(socket.gethostname())[2]
        for ip in ips:
            if not ip.startswith('127.'):
                print(f'ANDROID (cung Wi-Fi): {scheme}://{ip}:{args.port}/')
    except OSError: pass
    print('Ghi chu: dung HTTPS truoc khi trien khai qua Internet. Ctrl+C de dung.\n',flush=True)
    if not args.no_browser:
        threading.Timer(0.8,lambda:webbrowser.open(f'{scheme}://127.0.0.1:{args.port}/')).start()
    try: server.serve_forever(poll_interval=.25)
    except KeyboardInterrupt: print('\nDang dung may chu...')
    finally: server.server_close()


if __name__=='__main__':main()
