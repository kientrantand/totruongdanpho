'use strict';

const app = document.getElementById('app');
const toastEl = document.getElementById('toast');
const LABELS = [
  'Đáng yêu, dễ tính',
  'Bình thường, không khó cũng không dễ',
  'Quái tính, lúc nắng lúc mưa',
  'Thường xuyên gây khó khăn',
];
const COLORS = ['#18a993','#65b4e8','#eeaa53','#e5787c'];
const WARDS = ['phường Trường Thi','phường Đông A','phường Thành Nam','phường Nam Định','phường Thiên Trường','phường Mỹ Lộc'];
const GUEST = {role:'guest', label:'Khách tra cứu', csrf:''};
const GIS = [
 ['phường Trường Thi','13777_truong_thi'],
 ['phường Đông A','13693_dong_a'],
 ['phường Thành Nam','13699_thanh_nam'],
 ['phường Nam Định','13669_nam_dinh'],
 ['phường Thiên Trường','13684_thien_truong'],
 ['phường Mỹ Lộc','13708_my_loc']
];
const GIS_BASE = 'https://raw.githubusercontent.com/thanglequoc/vietnamese-provinces-database/master/json/geojson/37_ninh_binh/wards/';

const S = {
  user: GUEST, leaders: [], overview: null, mapFeatures:[], mapStatus:'loading', view:'directory', q:'', ward:'', sort:'area',
  votedOnly: false, selected: null, draftVote: null, authRole:'admin', loginError:'',
  adminSection: 'leaders', adminLeaders:[],
  editLeader:null, isSaving:false, rankings:{easy:[],difficult:[],minimum_votes:5},
  comments:[],commentDraft:'',commentTotal:0,adminComments:[]
};
const ICONS = {
  people:'<circle cx="9" cy="7" r="3"/><path d="M3 19v-1a6 6 0 0112 0v1"/><path d="M17 4a3 3 0 010 6M17 14a5 5 0 014 5"/>',
  home:'<path d="M3 10l9-7 9 7v11H3z"/><path d="M9 21v-7h6v7"/>',
  chart:'<path d="M4 20V9M10 20V4M16 20v-8M22 20V7"/>',
  check:'<path d="M20 6L9 17l-5-5"/>',
  search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="M16 16l5 5"/>',
  shield:'<path d="M12 22s8-4 8-10V5L12 2 4 5v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/>',
  file:'<path d="M5 3h10l4 4v14H5z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
  key:'<circle cx="8" cy="15" r="4"/><path d="M11 12L21 2l2 2-2 2-2-2-2 2 2 2-5 5"/>',
  pin:'<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1116 0z"/><circle cx="12" cy="10" r="2.5"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  download:'<path d="M12 3v13m-5-5l5 5 5-5M4 20h16"/>',
  arrow:'<path d="M5 12h14m-6-6l6 6-6 6"/>',
  users:'<circle cx="9" cy="7" r="3"/><path d="M3 20v-2a6 6 0 0112 0v2M17 5a3 3 0 010 6M17 15a5 5 0 014 5"/>',
  lock:'<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/>',
  filter:'<path d="M4 7h16M7 12h10M10 17h4"/>',
  edit:'<path d="M3 17l-1 5 5-1L20 8l-4-4zM14 6l4 4"/>',
  info:'<circle cx="12" cy="12" r="10"/><path d="M12 11v5M12 7v.1"/>',
  logout:'<path d="M10 3H4v18h6M16 7l5 5-5 5M8 12h13"/>',
  message:'<path d="M21 11.5a8.4 8.4 0 01-.9 3.8A8.5 8.5 0 0112.5 20a8.4 8.4 0 01-3.8-.9L3 21l1.9-5.7A8.4 8.4 0 014 11.5 8.5 8.5 0 0112.5 3h.5A8.5 8.5 0 0121 11v.5z"/>',
  trophy:'<path d="M8 21h8M12 17v4M7 3h10v8a5 5 0 01-10 0V3ZM7 5H4v3a4 4 0 004 4M17 5h3v3a4 4 0 01-4 4"/>',
  flag:'<path d="M4 22V5m0 0c3-2 5 2 8 0s5-2 8 0v11c-3-2-5 0-8 0s-5-2-8 0"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
};
function icon(name, size=20){return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]||ICONS.info}</svg>`;}
function e(x){return String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function norm(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase();}
function initial(name){return e((name||'?').split(/\s+/).slice(-2).map(w=>w[0]||'').join('').toUpperCase());}
function wardName(s){return String(s||'').replace(/^phường\s+/i,'');}
function fnum(n){return Number(n||0).toLocaleString('vi-VN');}
function percent(count,total){return total ? Math.round(100 * count / total) : 0;}
function showToast(msg){toastEl.textContent=msg;toastEl.classList.add('show');clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>toastEl.classList.remove('show'),3500);}
async function req(path, method='GET', data){
  let opts={method,credentials:'same-origin',headers:{}};
  if(data!==undefined){opts.headers['Content-Type']='application/json';opts.body=JSON.stringify(data);}
  if(method!=='GET' && S.user)opts.headers['X-CSRF-Token']=S.user.csrf;
  const r=await fetch(path,opts);
  if(!r.ok){let message='Không thể kết nối với máy chủ.';try{message=(await r.json()).error||message;}catch(_){/* ignore */}
    if(r.status===401&&path!=='/api/login'){S.user=GUEST;S.leaders=[];render();}
    throw new Error(message);
  }
  if(r.headers.get('Content-Type')?.includes('text/csv'))return r.blob();
  return r.json();
}
async function loadMain(){
  const p=S.user?.role==='guest'?'/api/public':'/api';let [ls,ov,ranks]=await Promise.all([req(p+'/leaders'),req(p+'/overview'),req(p+'/rankings')]);
  S.leaders=ls.leaders;S.overview=ov;S.rankings=ranks;
}
async function loadAdmin(){
  if(S.user?.role!=='admin')return;
  if(S.adminSection==='leaders')S.adminLeaders=(await req('/api/admin/leaders')).leaders;
  else S.adminComments=(await req('/api/admin/comments')).comments;
}
async function bootstrap(){
  try{const result=await req('/api/me');S.user=result.user||GUEST;
    await loadMain();if(S.user.role==='admin')await loadAdmin();
  }catch(err){S.user=GUEST;showToast(err.message)}render();loadMap();
}
async function loadComments(id){
  const ret=await req((S.user.role==='guest'?'/api/public/comments':'/api/comments')+'?leader_id='+encodeURIComponent(id));
  S.comments=ret.comments; S.commentTotal=ret.total_approved;
}
function dateText(value){try{return new Date(value).toLocaleString('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});}catch(_){return '';}}
function coordsFlat(geom){
  const out=[];
  function walk(v){if(Array.isArray(v)&&v.length>=2&&typeof v[0]==='number'&&typeof v[1]==='number'){out.push(v);return;}if(Array.isArray(v))v.forEach(walk);}
  walk(geom.coordinates);return out;
}
async function loadMap(){
  const files=await Promise.all(GIS.map(async ([ward,file])=>{
    try{
      const ctrl=new AbortController();const timeout=setTimeout(()=>ctrl.abort(),10000);
      let r;try{r=await fetch(GIS_BASE+file+'.geojson',{signal:ctrl.signal,mode:'cors'});}finally{clearTimeout(timeout);}
      if(!r.ok)throw Error('GIS '+r.status);
      const j=await r.json();const feat=j.features?.[0]||j;
      if(!feat?.geometry || !coordsFlat(feat.geometry).length)throw Error('GeoJSON không hợp lệ');
      return {ward,geometry:feat.geometry};
    }catch(err){console.warn('Không thể tải ranh giới',ward,err);return null;}
  }));
  S.mapFeatures=files.filter(Boolean);
  S.mapStatus=S.mapFeatures.length===GIS.length?'ready':'limited';
  if(S.view==='directory')render();
}
function mapShapes(){
 const all=S.mapFeatures.flatMap(x=>coordsFlat(x.geometry));
 if(!all.length)return '';
 let left=Infinity,right=-Infinity,bottom=Infinity,top=-Infinity;
 for(const p of all){left=Math.min(left,p[0]);right=Math.max(right,p[0]);bottom=Math.min(bottom,p[1]);top=Math.max(top,p[1]);}
 const cx=(left+right)/2,cy=(bottom+top)/2;const k=Math.cos(cy*Math.PI/180);
 const dx=Math.max(.01,(right-left)*k),dy=Math.max(.01,top-bottom);
 const scale=Math.min(830/dx,515/dy);
 const point=p=>[500+((p[0]-cx)*k)*scale,305-(p[1]-cy)*scale];
 function paths(geom){
   const polygons=geom.type==='MultiPolygon'?geom.coordinates:geom.type==='Polygon'?[geom.coordinates]:[];
   return polygons.map(poly=>poly.map(ring=>'M'+ring.map((p,i)=>{const [x,y]=point(p);return (i?'L':'')+x.toFixed(1)+','+y.toFixed(1)}).join('')+'Z').join('')).join('');
 }
 const fills=['#5689dc','#63b0a3','#c996d7','#f1b869','#86a6cd','#f09d9b'];
 return S.mapFeatures.map(({ward,geometry})=>{
   const i=WARDS.indexOf(ward);const selected=ward===S.ward;
   const cs=coordsFlat(geometry);const bbox=[Infinity,-Infinity,Infinity,-Infinity];for(const p of cs){bbox[0]=Math.min(bbox[0],p[0]);bbox[1]=Math.max(bbox[1],p[0]);bbox[2]=Math.min(bbox[2],p[1]);bbox[3]=Math.max(bbox[3],p[1]);}
   const label=point([(bbox[0]+bbox[1])/2,(bbox[2]+bbox[3])/2]);
   return `<g class="ward-shape ${selected?'selected':''}" data-action="map-ward" data-value="${e(ward)}" role="button" tabindex="0" aria-label="Xem tổ trưởng ${e(ward)}"><path d="${paths(geometry)}" fill="${fills[i]}" fill-rule="evenodd"></path><text x="${label[0].toFixed(1)}" y="${label[1].toFixed(1)}" text-anchor="middle" dominant-baseline="middle">${e(wardName(ward))}</text></g>`;
 }).join('');
}
function mapView(){
 const counts=S.overview?.wards||{};
 const chips=WARDS.map((w,i)=>`<button class="ward-chip ${S.ward===w?'active':''}" data-action="map-ward" data-value="${e(w)}"><span class="map-dot cward${i}"></span><span>${e(wardName(w))}</span><b>${fnum(counts[w]||0)}</b></button>`).join('');
 const status=S.mapStatus==='loading'?'Đang tải dữ liệu địa giới…':S.mapStatus==='ready'?'Ranh giới hành chính từ dữ liệu GIS':`Không tải đủ địa giới trực tuyến. Bạn vẫn có thể chọn phường bên dưới.`;
 return `<section class="map-main" aria-label="Bản đồ chọn phường"><div class="map-head"><div><div class="map-kicker">BẢN ĐỒ TRA CỨU · NAM ĐỊNH</div><h2>Chọn phường để xem tổ trưởng</h2><p>6 phường thuộc tỉnh Ninh Bình · Không bao gồm Hồng Quang và Vị Khê</p></div><button class="map-reset" data-action="map-all">${icon('pin',16)} Tất cả phường</button></div><div class="map-body"><div class="map-graphic">${S.mapFeatures.length?`<svg viewBox="0 0 1000 610" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Bản đồ tương tác 6 phường">${mapShapes()}</svg>`:`<div class="map-fallback">${icon('pin',44)}<strong>${S.mapStatus==='loading'?'Đang dựng bản đồ…':'Chọn phường để tra cứu'}</strong><span>${status}</span></div>`}<div class="map-credit">${status}</div></div><div class="map-chooser"><div class="map-chooser-title">DANH SÁCH 6 PHƯỜNG</div>${chips}<p class="map-hint">${S.ward?`Đang xem: <b>${e(S.ward)}</b>`:'Chạm vào ranh giới trên bản đồ hoặc tên phường.'}</p></div></div><div class="map-attr">Dữ liệu địa giới: thanglequoc/vietnamese-provinces-database (MIT); tham chiếu bản đồ sáp nhập của NXB Tài nguyên Môi trường và Bản đồ Việt Nam. Bản đồ phục vụ tra cứu.</div></section>`;
}
function loginView(){
return `<div class="login-shell"><section class="login-showcase"><div class="login-logo">✦ TỔ PHỐ / BÌNH CHỌN</div>
<div class="showcase-text"><h1>Quản trị hệ thống</h1><p>Đăng nhập chỉ dành cho người quản trị duyệt bình luận và quản lý danh sách tổ trưởng.</p></div>
<div class="showcase-footer">Người dân bình chọn và bình luận ẩn danh không cần đăng nhập.</div></section>
<section class="login-main"><div class="login-card"><div class="login-tag">QUẢN TRỊ VIÊN</div><h2>Đăng nhập quản trị</h2>
<button class="btn btn-ghost" data-action="guest" style="margin-bottom:14px">← Trở về trang bình chọn</button>
<form id="login-form"><div class="form-field"><label for="code">Mật khẩu quản trị</label><input id="code" name="code" type="password" autocomplete="current-password" placeholder="Nhập mật khẩu quản trị" required autofocus></div>
${S.loginError?`<div class="error-msg">${e(S.loginError)}</div>`:''}
<button class="btn btn-primary btn-full" type="submit">Đăng nhập ${icon('arrow',17)}</button></form>
<div class="login-note">Bình luận công khai phải được quản trị viên duyệt.</div></div></section></div>`;
}
function navItem(v, ico, label){return `<button data-action="nav" data-value="${v}" class="${S.view===v?'active':''}">${icon(ico)}<span>${label}</span></button>`;}
function pageLayout(){
const titles={directory:'Bản đồ 6 phường & Tổ trưởng',results:'Kết quả bình chọn',admin:'Quản lý hệ thống'};
return `<div class="shell"><aside class="sidebar"><div class="brand-mark"><span class="logo-symbol">✦</span><div>TỔ PHỐ<small>HỆ THỐNG BÌNH CHỌN</small></div></div>
  <div class="side-caption">KHÔNG GIAN LÀM VIỆC</div><nav class="side-nav" aria-label="Điều hướng">
    ${navItem('directory','people','Danh sách tổ trưởng')}${navItem('results','trophy','Bảng xếp hạng & Kết quả')}
    ${S.user.role==='admin'?navItem('admin','shield','Quản trị hệ thống'):''}
  </nav><div class="sidebar-bottom"><div class="account-chip"><div class="avatar">${initial(S.user.label)}</div><div style="min-width:0"><b title="${e(S.user.label)}">${e(S.user.label)}</b><small>${S.user.role==='admin'?'Quản trị viên':S.user.role==='guest'?'Tra cứu công khai':'Khách ẩn danh'}</small></div></div><button class="logout-btn" data-action="${S.user.role==='admin'?'logout':'show-login'}">${icon('logout',15)} ${S.user.role==='admin'?'Đăng xuất':'Quản trị viên'}</button></div>
  </aside><main class="main"><header class="topbar"><div class="breadcrumbs">Hệ thống <span>›</span> <b>${titles[S.view]||''}</b></div><div class="topbar-right"><span class="topbar-dot"></span> Không gian đánh giá nội bộ <button class="btn btn-sm btn-ghost" data-action="${S.user.role==='admin'?'logout':'show-login'}" style="color:#7386a5">${S.user.role==='admin'?'Đăng xuất':'Quản trị'}</button></div></header>
  <div class="content">${S.view==='directory'?directoryView():S.view==='results'?resultsView():adminView()}
  <div class="fine-print">Phiếu bình chọn phản ánh cảm nhận chủ quan, không phải thông tin xác minh hay kết luận chính thức. Không sử dụng kết quả để bôi nhọ, quy chụp hoặc phát tán thông tin cá nhân.</div></div></main></div>
${S.selected?detailModal():''}${S.editLeader!==null?leaderModal():''}`;
}
function statCard(label,n,ico,klass){return `<div class="summary-card"><div><div class="label">${e(label)}</div><div class="value">${fnum(n)}</div></div><div class="summary-icon ${klass||''}">${icon(ico)}</div></div>`;}
function summary(){const o=S.overview||{},mine=S.leaders.filter(x=>x.my_vote!=null).length;return `<div class="summary-grid">${statCard('Tổ trưởng dân phố',o.leader_count??S.leaders.length,'people')}${statCard('Phường trong bản đồ',6,'pin','purple')}${statCard('Tổng lượt bình chọn',o.total_votes||0,'chart','orange')}${statCard(S.user.role==='admin'?'Người đã tham gia':S.user.role==='guest'?'Phường có dữ liệu':'Bạn đã bình chọn',S.user.role==='admin'?(o.participating_voters||0):S.user.role==='guest'?Object.values(o.wards||{}).filter(n=>n>0).length:mine,'check','green')}</div>`;}
function wards(){return WARDS;}
function filters(){return `<div class="filters"><div class="search-wrap">${icon('search')}<input id="search" class="search-input" type="search" placeholder="Tìm theo tên tổ trưởng, tổ/xóm, địa bàn cũ…" value="${e(S.q)}" aria-label="Tìm kiếm"></div>
<select class="select" id="ward-select" aria-label="Lọc theo phường"><option value="">Tất cả phường</option>${wards().map(w=>`<option value="${e(w)}" ${w===S.ward?'selected':''}>${e(w)}</option>`).join('')}</select>
<select class="select" id="sort-select" aria-label="Sắp xếp"><option value="area" ${S.sort==='area'?'selected':''}>Theo địa bàn</option><option value="votes" ${S.sort==='votes'?'selected':''}>Nhiều phiếu nhất</option><option value="name" ${S.sort==='name'?'selected':''}>Theo tên A – Z</option></select></div>`;}
function filtered(){let arr=S.leaders.filter(x=>(!S.ward||x.ward===S.ward)&&(!S.votedOnly||x.my_vote!==null)&&norm([x.name,x.area,x.ward,...x.aliases].join(' ')).includes(norm(S.q)));
const cmp=(a,b)=>a.localeCompare(b,'vi');
if(S.sort==='votes')arr.sort((a,b)=>b.votes-a.votes||cmp(a.ward,b.ward)||cmp(a.area,b.area));
else if(S.sort==='name')arr.sort((a,b)=>cmp(a.name,b.name));
else arr.sort((a,b)=>cmp(a.ward,b.ward)||cmp(a.area,b.area));return arr;}
function miniBar(counts,total){return `<div class="mini-chart" role="img" aria-label="Phân bố 4 mức đánh giá">${(counts||[0,0,0,0]).map((n,i)=>`<span class="c${i+1}" style="width:${total ? 100*n/total : 0}%"></span>`).join('')}</div>`;}
function personCard(x){const shown=x.revealed&&x.votes>0;const peak=shown?x.counts.indexOf(Math.max(...x.counts)):null;
  return `<article class="person-card"><div class="person-top"><div class="person-avatar">${initial(x.name)}</div><div class="person-meta"><div class="person-name" title="${e(x.name)}">${e(x.name)}</div><div class="person-sub">${e(x.area)}</div><div class="person-sub">${e(x.ward)} · Ninh Bình</div></div></div>
  <div class="person-sep"></div><div class="card-stat"><span class="muted">${icon('users',14)} ${fnum(x.votes)} phiếu · ${icon('message',14)} ${fnum(x.comments)} bình luận</span>${x.my_vote?'<span class="pill">✓ Đã đánh giá</span>':S.user.role==='guest'?'':'<span class="pill neutral">Chưa đánh giá</span>'}</div>
  ${shown?miniBar(x.counts,x.votes):miniBar(null,0)}
  <div class="card-bottom"><div class="muted">${shown?`Phổ biến: <b>${e(LABELS[peak])}</b>`:x.votes===0?'Chưa có lượt bình chọn':'Chưa đủ 3 phiếu để hiển thị'}</div><button class="btn btn-outline btn-sm" data-action="details" data-id="${e(x.id)}">${S.user.role==='admin'?'Xem nhận xét':'Xem & đánh giá'} ${icon('arrow',14)}</button></div></article>`;}
function cardsGrid(){const items=filtered();return `<div class="count-caption">Hiển thị <strong id="visible-count">${items.length}</strong> / ${S.leaders.length} tổ trưởng · Tỉnh Ninh Bình</div><div id="cards-grid" class="directory-grid">${items.length?items.map(personCard).join(''):'<div class="empty-box"><h3>Không có kết quả phù hợp</h3><p>Thử thay đổi từ khóa hoặc chọn phường khác.</p></div>'}</div>`;}
function directoryView(){return `<div class="page-head"><div><span class="eyebrow">BẢN ĐỒ HÀNH CHÍNH · 6 PHƯỜNG</span><h1 class="page-title">Tra cứu tổ trưởng dân phố</h1><p class="page-desc">Nhấn trực tiếp trên bản đồ để lọc danh sách theo phường, rồi mở hồ sơ từng tổ trưởng.</p></div></div>${mapView()}${summary()}
  <div class="section-head" id="directory-list"><div><h3>Danh bạ tổ trưởng ${S.ward?'· '+e(S.ward):''}</h3><p>Đã có 126 tổ trưởng thuộc 5 phường; Thiên Trường bổ sung sau</p></div>${S.user.role==='voter'?`<button class="btn btn-sm ${S.votedOnly?'btn-primary':''}" data-action="voted-only">${icon('check',16)} ${S.votedOnly?'Xem tất cả':'Chỉ hiện đã bình chọn'}</button>`:''}</div>
  ${filters()}${cardsGrid()}`;}
function rankItem(x,i,kind){
 const val=kind==='easy'?x.easy_pct:x.hard_pct;
 const short=kind==='easy'?'Chọn mức 1':'Chọn mức 3–4';
 return `<button class="leaderboard-row" data-action="details" data-id="${e(x.id)}" title="Mở chi tiết ${e(x.name)}"><span class="leaderboard-pos ${i===0?'first':''}">${String(i+1).padStart(2,'0')}</span><span class="leaderboard-person"><strong>${e(x.name)}</strong><small>${e(x.area)} · ${e(wardName(x.ward))}</small></span><span class="leaderboard-value"><strong>${Number(val).toFixed(1).replace('.',',')}%</strong><small>${short} · ${fnum(x.votes)} phiếu</small></span></button>`;
}
function leaderboardView(){
 const rs=S.rankings||{},n=rs.minimum_votes||5;
 return `<div class="leaderboard-heading"><span class="eyebrow">BẢNG XẾP HẠNG THEO PHIẾU</span><h2>Những gương mặt nổi bật</h2><p>Cùng một tiêu chí tối thiểu <b>${n} phiếu</b> cho mỗi tổ trưởng. Đây là kết quả cảm nhận chủ quan, không phải xếp loại chính thức.</p></div>
 <div class="leaderboard-grid"><section class="leaderboard-panel good"><div class="board-head"><span class="board-symbol">♡</span><div><span class="eyebrow">CỘNG ĐỒNG ĐÁNH GIÁ</span><h3>Tổ trưởng dễ tính nhất</h3><p>Tỷ lệ phiếu “Đáng yêu, dễ tính” cao nhất</p></div></div><div class="leaderboard-list">${rs.easy?.length?rs.easy.slice(0,7).map((x,i)=>rankItem(x,i,'easy')).join(''):`<div class="ranking-empty">${icon('trophy',26)}<b>Chưa đủ dữ liệu</b><span>Mỗi tổ trưởng cần ${n} phiếu để xuất hiện tại đây.</span></div>`}</div></section>
 <section class="leaderboard-panel hard"><div class="board-head"><span class="board-symbol">!</span><div><span class="eyebrow">CỘNG ĐỒNG ĐÁNH GIÁ</span><h3>Tổ trưởng khó tính nhất</h3><p>Tỷ lệ tổng phiếu mức 3 và mức 4 cao nhất</p></div></div><div class="leaderboard-list">${rs.difficult?.length?rs.difficult.slice(0,7).map((x,i)=>rankItem(x,i,'difficult')).join(''):`<div class="ranking-empty">${icon('chart',26)}<b>Chưa đủ dữ liệu</b><span>Mỗi tổ trưởng cần ${n} phiếu để xuất hiện tại đây.</span></div>`}</div></section></div><div class="board-disclaimer">${icon('info',17)} Thứ hạng có thể thay đổi khi thêm phiếu. Không suy diễn bình luận hay xếp hạng thành sự thật về tính cách của cá nhân.</div>`;
}
function resultsView(){const pub=S.leaders.filter(x=>x.votes>0&&x.revealed);const c=[0,0,0,0];let total=0;for(const l of pub){for(let i=0;i<4;i++)c[i]+=l.counts[i];total+=l.votes;}
const top=[...S.leaders].filter(l=>l.votes).sort((a,b)=>b.votes-a.votes||a.name.localeCompare(b.name,'vi')).slice(0,7);
const maxWard=Math.max(...Object.values(S.overview?.wards||{}),1);
return `<div class="page-head"><div><span class="eyebrow">BÁO CÁO & THỐNG KÊ</span><h1 class="page-title">Kết quả bình chọn</h1><p class="page-desc">Theo dõi tỷ lệ các mức đánh giá, số lượt tham gia và mức độ phản hồi ở từng phường.</p></div>${S.user.role==='admin'?`<button class="btn btn-outline" data-action="export">${icon('download',17)} Xuất kết quả CSV</button>`:''}</div>${summary()}${leaderboardView()}
<div class="result-layout"><div class="card-panel"><div class="section-head"><div><h3>Phân bố các mức đánh giá</h3><p>${S.user.role==='admin'?'Tổng hợp toàn bộ lượt bình chọn':'Chỉ bao gồm những tổ trưởng đã đủ 3 phiếu để công khai tỷ lệ'}</p></div>${icon('chart',22)}</div>
${miniBar(c,total).replace('mini-chart','mini-chart overall-bar')}
<div class="report-legend">${LABELS.map((l,i)=>`<div class="legend-row"><div class="legend-left"><span class="legend-dot c${i+1}"></span><span>${e(l)}</span></div><b>${percent(c[i],total)}%</b></div>`).join('')}</div><div class="report-note"><b>${fnum(total)}</b> lượt bình chọn trong thống kê hiển thị. Các mức đánh giá là ý kiến chủ quan và không phải xác nhận sự việc.</div></div>
<div class="card-panel"><div class="section-head"><div><h3>Phân bố tổ trưởng theo phường</h3><p>Danh sách quản lý hiện hành</p></div>${icon('pin',21)}</div>${wards().map(w=>`<div class="ward-row"><b>${e(wardName(w))}</b><div class="line"><span style="width:${S.overview.wards[w]*100/maxWard}%"></span></div><small>${fnum(S.overview.wards[w])} người</small></div>`).join('')}
<div class="section-head" style="margin-top:30px"><div><h3>Được bình chọn nhiều</h3><p>Sắp xếp theo lượt tham gia, không phải xếp hạng tốt/xấu</p></div></div>${top.length?top.map((x,i)=>`<div class="rank-row"><span class="rank-num">${String(i+1).padStart(2,'0')}</span><div><div class="rank-name">${e(x.name)}</div><div class="muted micro">${e(x.area)} · ${e(wardName(x.ward))}</div></div><div class="rank-side"><b>${fnum(x.votes)}</b> phiếu</div></div>`).join(''):'<div class="notice">Chưa có dữ liệu bình chọn. Kết quả sẽ xuất hiện khi người dùng tham gia.</div>'}</div></div>`;}
function leaderRows(){const items=S.adminLeaders;return `<div class="table-scroll"><table class="table"><thead><tr><th>Tổ trưởng</th><th>Địa bàn</th><th>Số điện thoại</th><th>Trạng thái</th><th></th></tr></thead><tbody>${items.map(x=>`<tr><td><b>${e(x.name)}</b><small>${e(x.id)}</small></td><td>${e(x.area)}<br><small>${e(x.ward)}</small></td><td>${e(x.phone||'—')}</td><td><span class="badge-status ${x.active?'':'off'}">${x.active?'Đang sử dụng':'Đã ẩn'}</span></td><td class="right"><button class="btn btn-sm" data-action="edit-leader" data-id="${e(x.id)}">${icon('edit',14)} Sửa</button></td></tr>`).join('')}</tbody></table></div>`;}
function adminCommentsView(){
 const list=S.adminComments||[]; const pending=list.filter(c=>c.status==='pending'||c.status==='hidden').length;
 const label={pending:'Chờ duyệt',approved:'Đã công khai',hidden:'Đã ẩn',rejected:'Từ chối'};
 return `<div class="card-panel"><div class="section-head"><div><h3>Duyệt bình luận ẩn danh</h3><p>Có ${pending} bình luận chờ xem xét hoặc bị báo cáo. Không công khai thông tin người gửi.</p></div><span class="badge-status">${list.length} bình luận</span></div>
 <div class="moderation-list">${list.length?list.map(c=>`<div class="moderation-item"><div class="moderation-head"><strong>${e(c.leader_name)}</strong><span class="mod-status status-${e(c.status)}">${label[c.status]||c.status}</span></div><div class="muted micro">${e(c.area)} · ${e(c.ward)} · ${dateText(c.created_at)} ${c.reports?' · '+c.reports+' báo cáo':''}</div><p class="moderation-text">${e(c.body)}</p><div class="moderation-actions"><button class="btn btn-sm btn-primary" data-action="moderate" data-id="${c.id}" data-status="approved">${icon('check',14)} Duyệt</button><button class="btn btn-sm" data-action="moderate" data-id="${c.id}" data-status="hidden">Ẩn</button><button class="btn btn-sm btn-danger" data-action="moderate" data-id="${c.id}" data-status="rejected">Từ chối</button></div></div>`).join(''):'<div class="notice">Chưa có bình luận.</div>'}</div></div>`;
}
function adminView(){return `<div class="page-head"><div><span class="eyebrow">QUẢN TRỊ DỮ LIỆU</span><h1 class="page-title">Quản lý hệ thống</h1><p class="page-desc">Chỉnh sửa danh sách tổ trưởng và duyệt bình luận ẩn danh. Số điện thoại chỉ hiển thị cho quản trị viên.</p></div></div>${summary()}
<div class="admin-tabs"><button data-action="admin-tab" data-value="leaders" class="${S.adminSection==='leaders'?'active':''}">Quản lý tổ trưởng</button><button data-action="admin-tab" data-value="comments" class="${S.adminSection==='comments'?'active':''}">Duyệt bình luận</button></div>
${S.adminSection==='comments'?adminCommentsView():`<div class="card-panel"><div class="section-head"><div><h3>Danh sách tổ trưởng <span class="muted">(${S.adminLeaders.length})</span></h3><p>Giữ nguyên dữ liệu nguồn 126 tổ trưởng, có thể bổ sung, chỉnh sửa hoặc ẩn.</p></div><button class="btn btn-primary" data-action="add-leader">${icon('plus',17)} Thêm tổ trưởng</button></div>${leaderRows()}</div>`}`;}
function commentItems(){
 if(!S.comments.length)return `<div class="comment-empty">${icon('message',24)}<strong>Chưa có bình luận công khai</strong><span>Hãy chia sẻ trải nghiệm cụ thể, lịch sự và có tính xây dựng.</span></div>`;
 const labels={pending:'Đang chờ duyệt',approved:'Đã đăng',hidden:'Đã ẩn để kiểm tra',rejected:'Không được duyệt'};
 return S.comments.map(c=>`<article class="comment-item"><div class="comment-top"><span class="anon-avatar">${icon('shield',15)}</span><div><strong>Người bình luận ẩn danh ${c.is_mine?'<span class="my-marker">· của bạn</span>':''}</strong><div class="muted micro">${dateText(c.created_at)}</div></div>${c.is_mine&&c.status!=='approved'?`<span class="comment-pending">${labels[c.status]||''}</span>`:''}</div><p class="comment-text">${e(c.body)}</p><div class="comment-tools">${c.is_mine?`<button data-action="remove-comment" data-id="${c.id}">Xóa bình luận của tôi</button>`:S.user.role==='voter'?`<button data-action="report-comment" data-id="${c.id}">${icon('flag',12)} Báo cáo</button>`:''}</div></article>`).join('');
}
function detailModal(){const x=S.leaders.find(l=>l.id===S.selected);if(!x)return '';const counts=x.counts||[0,0,0,0];const s=S.draftVote;
return `<div class="modal-bg" data-action="close-bg"><div class="modal modal-profile" role="dialog" aria-modal="true" aria-labelledby="detail-title">
<div class="profile-banner"><div class="profile-kicker">HỒ SƠ ĐÁNH GIÁ TỔ TRƯỞNG DÂN PHỐ <span>${e(wardName(x.ward))} · Ninh Bình</span></div><div class="profile-title-line"><span class="profile-avatar">${initial(x.name)}</span><div class="profile-title-text"><span class="profile-tag">TỔ TRƯỞNG DÂN PHỐ</span><h2 id="detail-title">${e(x.name)}</h2><p>${icon('pin',15)} ${e(x.area)}, ${e(x.ward)}, Ninh Bình</p></div><button class="icon-btn profile-close" data-action="close-modal" aria-label="Đóng cửa sổ">×</button></div><div class="profile-metrics"><span>${icon('users',16)} <b>${fnum(x.votes)}</b> lượt bình chọn</span><span>${icon('message',16)} <b>${fnum(S.commentTotal)}</b> bình luận công khai</span></div></div>
<div class="profile-columns"><div class="profile-vote"><div class="profile-section-head"><span class="eyebrow">01 / BÌNH CHỌN</span><h3>Đánh giá của bạn</h3><p>Bình chọn theo trải nghiệm phối hợp thực tế.</p></div>
${S.user.role==='voter'?`<div class="option-list">${LABELS.map((l,i)=>`<button type="button" class="vote-option ${s===i+1?'selected':''}" data-action="choose" data-level="${i+1}"><span class="option-mark c${i+1}"></span><b>${i+1}. ${e(l)}</b><span class="check-circle">${s===i+1?'✓':''}</span></button>`).join('')}</div><div class="btn-row"><button class="btn btn-primary" data-action="save-vote" ${s==null?'disabled':''}>${icon('check',16)} ${x.my_vote?'Cập nhật phiếu':'Gửi bình chọn'}</button>${x.my_vote?'<button class="btn btn-ghost btn-sm" data-action="remove-vote">Hủy phiếu</button>':''}</div>`:`<div class="notice">${S.user.role==='guest'?'Đang khởi tạo phiên ẩn danh, vui lòng tải lại trang.':'Quản trị viên chỉ xem kết quả, không tham gia bình chọn.'}</div>`}
<div class="profile-section-head result-sect"><span class="eyebrow">02 / KẾT QUẢ</span><h3>Phân bố đánh giá</h3><p>${fnum(x.votes)} phiếu từ người tham gia</p></div>
${x.revealed&&x.votes?LABELS.map((l,i)=>`<div class="result-row"><div><div class="title"><span>${e(l)}</span><span>${fnum(counts[i])} phiếu</span></div><div class="bar"><span style="width:${counts[i]*100/x.votes}%;background:${COLORS[i]}"></span></div></div><div class="percent">${percent(counts[i],x.votes)}%</div></div>`).join('')+`<div class="notice">Điểm trung bình: <strong>${Number(x.score).toFixed(2).replace('.',',')}/4</strong>, 4 là mức thuận lợi nhất.</div>`:`<div class="notice orange">${x.votes===0?'Chưa có bình chọn nào.':'Cần tối thiểu 3 phiếu để công bố tỷ lệ.'}</div>`}
</div><div class="profile-comments"><div class="profile-section-head"><span class="eyebrow">03 / GÓC CHIA SẺ</span><h3>${icon('message',21)} Bình luận ẩn danh</h3><p>Danh tính không hiển thị với người xem. Chỉ bình luận về trải nghiệm phối hợp, không đưa thông tin cá nhân.</p></div>
${S.user.role==='voter'?`<form id="comment-form" class="comment-compose"><div class="comment-compose-top"><span class="anon-avatar">${icon('shield',16)}</span><div><strong>Bình luận dưới tên Ẩn danh</strong><small>Không yêu cầu đăng nhập, không công bố danh tính của bạn</small></div></div><textarea id="comment-text" name="body" required minlength="5" maxlength="700" rows="4" placeholder="Ví dụ: Bác phối hợp khá nhanh khi nhận giấy mời, hướng dẫn rõ địa chỉ...">${e(S.commentDraft)}</textarea><div class="compose-foot"><small><span id="comment-length">${S.commentDraft.length}</span>/700 ký tự · Nội dung sẽ được duyệt trước khi hiển thị</small><button class="btn btn-primary btn-sm" type="submit">${icon('message',15)} Gửi ẩn danh</button></div></form>`:`<div class="notice">${S.user.role==='guest'?'Đang khởi tạo phiên ẩn danh, vui lòng tải lại trang.':'Quản trị viên có thể duyệt bình luận trong khu vực Quản trị.'}</div>`}
<div class="comment-list-head"><h4>Bình luận cộng đồng</h4><span>${fnum(S.commentTotal)} bình luận công khai</span></div><div class="comment-list">${commentItems()}</div>
<div class="safe-comment-note">${icon('shield',17)} Bình luận hiển thị ẩn danh. Trình duyệt được cấp mã ngẫu nhiên để giới hạn phiếu và bình luận; xóa cookie hoặc dùng thiết bị khác có thể tạo mã mới. Những nhận xét này không phải kết luận xác minh.</div></div></div></div></div>`;
}
function leaderModal(){const x=S.editLeader==='new'?null:S.adminLeaders.find(l=>l.id===S.editLeader);return `<div class="modal-bg" data-action="close-bg"><div class="modal large" role="dialog" aria-modal="true" aria-labelledby="edit-title"><div class="modal-head"><div><h2 id="edit-title">${x?'Chỉnh sửa tổ trưởng':'Thêm tổ trưởng dân phố'}</h2><p>Phạm vi quản lý: tỉnh Ninh Bình</p></div><button class="icon-btn" data-action="close-modal" aria-label="Đóng">×</button></div>
<div class="modal-body"><form id="leader-form" data-id="${e(x?.id||'')}"><div class="form-grid">
<div class="form-field"><label>Họ và tên tổ trưởng *</label><input name="name" required maxlength="90" value="${e(x?.name||'')}"></div>
<div class="form-field"><label>Tổ / thôn / xóm / đội *</label><input name="area" required maxlength="100" value="${e(x?.area||'')}"></div>
<div class="form-field"><label>Xã / phường *</label><input name="ward" required maxlength="100" list="ward-datalist" value="${e(x?.ward||'')}"><datalist id="ward-datalist">${wards().map(w=>`<option value="${e(w)}">`).join('')}</datalist></div>
<div class="form-field"><label>Tỉnh</label><input value="Ninh Bình" disabled></div>
<div class="form-field"><label>Số điện thoại</label><input name="phone" maxlength="30" inputmode="tel" value="${e(x?.phone||'')}"></div>
<div class="form-field"><label>Số điện thoại phụ</label><input name="phone_alt" maxlength="30" inputmode="tel" value="${e(x?.phone_alt||'')}"></div>
<div class="form-field span2"><label>Địa bàn cũ hoặc tên gọi khác (ngăn cách bằng dấu phẩy)</label><textarea name="aliases" rows="2">${e((x?.aliases||[]).join(', '))}</textarea></div>
${x?`<div class="form-field span2"><label><input name="active" type="checkbox" style="width:auto;margin-right:8px" ${x.active?'checked':''}>Hiển thị tổ trưởng trong bình chọn</label></div>`:''}
</div><div class="modal-foot"><button type="button" class="btn" data-action="close-modal">Hủy</button><button class="btn btn-primary" type="submit">${icon('check',16)} Lưu thông tin</button></div></form></div></div></div>`;}
function render(){app.innerHTML=S.user?pageLayout():loginView();}
function rerenderCards(){const wrap=document.getElementById('cards-grid');if(!wrap)return;const list=filtered();wrap.innerHTML=list.length?list.map(personCard).join(''):'<div class="empty-box"><h3>Không có kết quả phù hợp</h3><p>Thử thay đổi từ khóa hoặc chọn phường khác.</p></div>';const n=document.getElementById('visible-count');if(n)n.textContent=list.length;}
async function refresh(){await loadMain();if(S.view==='admin')await loadAdmin();render();}
async function copyText(txt){try{await navigator.clipboard.writeText(txt);showToast('Đã sao chép.');}catch(err){const ta=document.createElement('textarea');ta.value=txt;ta.style.position='fixed';ta.style.left='-9999px';document.body.appendChild(ta);ta.select();let ok=document.execCommand('copy');ta.remove();showToast(ok?'Đã sao chép.':'Không thể sao chép tự động. Hãy chọn và sao chép mã trên màn hình.');}}
async function onClick(ev){const b=ev.target.closest('[data-action]');if(!b)return;
const act=b.dataset.action;
try{
if(act==='map-ward'){S.ward=b.dataset.value;S.view='directory';render();document.getElementById('directory-list')?.scrollIntoView({behavior:'smooth',block:'start'});return;}
if(act==='map-all'){S.ward='';S.view='directory';render();return;}
if(act==='show-login'){S.user=null;render();return;}
if(act==='guest'){const r=await req('/api/me');S.user=r.user||GUEST;S.loginError='';await loadMain();render();return;}

if(act==='nav'){S.view=b.dataset.value;if(S.view==='admin')await loadAdmin();render();return;}
if(act==='logout'){await req('/api/logout','POST',{});const r=await req('/api/me');S.user=r.user||GUEST;S.selected=null;S.editLeader=null;await loadMain();render();return;}
if(act==='voted-only'){S.votedOnly=!S.votedOnly;render();return;}
if(act==='details'){S.selected=b.dataset.id;S.draftVote=S.leaders.find(l=>l.id===S.selected)?.my_vote??null;S.commentDraft='';S.comments=[];S.commentTotal=0;await loadComments(S.selected);render();return;}
if(act==='close-modal'){S.selected=null;S.editLeader=null;render();return;}
if(act==='close-bg'){if(ev.target===b){S.selected=null;S.editLeader=null;render();}return;}
if(act==='choose'){S.draftVote=Number(b.dataset.level);render();return;}
if(act==='save-vote'){if(S.isSaving)return;S.isSaving=true;try{await req('/api/vote','POST',{leader_id:S.selected,level:S.draftVote});showToast('Đã ghi nhận bình chọn thành công.');await loadMain();render();}finally{S.isSaving=false;}return;}
if(act==='remove-vote'){if(!window.confirm('Hủy phiếu bình chọn của bạn cho tổ trưởng này?'))return;await req('/api/vote/'+encodeURIComponent(S.selected),'DELETE');await loadMain();render();showToast('Đã hủy phiếu.');return;}
if(act==='admin-tab'){S.adminSection=b.dataset.value;await loadAdmin();render();return;}
if(act==='moderate'){await req('/api/admin/comments/'+b.dataset.id,'PUT',{status:b.dataset.status});await loadAdmin();render();showToast('Đã cập nhật trạng thái bình luận.');return;}
if(act==='remove-comment'){if(!window.confirm('Bạn muốn xóa bình luận này?'))return;await req('/api/comments/'+b.dataset.id,'DELETE');await loadComments(S.selected);await loadMain();render();showToast('Đã xóa bình luận.');return;}
if(act==='report-comment'){if(!window.confirm('Báo cáo bình luận này vì nội dung không phù hợp?'))return;await req('/api/comments/'+b.dataset.id+'/report','POST',{});await loadComments(S.selected);await loadMain();render();showToast('Đã gửi báo cáo để quản trị viên xem xét.');return;}
if(act==='add-leader'){S.editLeader='new';render();return;}
if(act==='edit-leader'){S.editLeader=b.dataset.id;render();return;}
if(act==='export'){
 const blob=await req('/api/admin/export.csv');const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='ket_qua_binh_chon.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);return;
}
}catch(err){showToast(err.message);}
}
app.addEventListener('click',onClick);
app.addEventListener('input',ev=>{if(ev.target.id==='search'){S.q=ev.target.value;rerenderCards();}
  if(ev.target.id==='comment-text'){S.commentDraft=ev.target.value;const counter=document.getElementById('comment-length');if(counter)counter.textContent=S.commentDraft.length;}});
app.addEventListener('change',ev=>{if(ev.target.id==='ward-select'){S.ward=ev.target.value;rerenderCards();}if(ev.target.id==='sort-select'){S.sort=ev.target.value;rerenderCards();}});
app.addEventListener('submit',async ev=>{
  ev.preventDefault();let form=ev.target;
  try{
    if(form.id==='login-form'){
      const code=form.elements.code.value.trim();const resp=await req('/api/login','POST',{role:'admin',code});
      S.user=resp.user;S.loginError='';S.view='directory';await loadMain();if(S.user.role==='admin')await loadAdmin();render();showToast('Đăng nhập thành công.');return;
    }
    if(form.id==='comment-form'){
      const lid=S.selected;
      await req('/api/comments','POST',{leader_id:lid,body:S.commentDraft});
      S.commentDraft='';await loadComments(lid);await loadMain();render();showToast('Đã gửi bình luận ẩn danh. Nội dung sẽ hiển thị sau khi được duyệt.');return;
    }
    if(form.id==='leader-form'){
      const fd=new FormData(form);const data={name:String(fd.get('name')||'').trim(),area:String(fd.get('area')||'').trim(),ward:String(fd.get('ward')||'').trim(),phone:String(fd.get('phone')||'').trim(),phone_alt:String(fd.get('phone_alt')||'').trim(),aliases:String(fd.get('aliases')||'').split(',').map(x=>x.trim()).filter(Boolean),active:S.editLeader==='new'?true:fd.has('active')};
      if(S.editLeader==='new')await req('/api/admin/leaders','POST',data);
      else await req('/api/admin/leaders/'+encodeURIComponent(form.dataset.id),'PUT',data);
      S.editLeader=null;await loadMain();await loadAdmin();render();showToast('Đã lưu thông tin tổ trưởng.');return;
    }
  }catch(err){if(form.id==='login-form'){S.loginError=err.message;render();}else showToast(err.message);}
});
window.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&(S.selected||S.editLeader!==null)){S.selected=null;S.editLeader=null;render();}});
bootstrap();
