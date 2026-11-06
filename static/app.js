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
  adminSection: 'leaders', adminLeaders:[], showWardList:false, sidebarCollapsed:false, mobileNav:false, importResult:null, importFile:null, rankMode:'easy', listLimit:80, mapShapeHTML:null, mapCacheLabels:null, mapViewBox:null,
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
  menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
  list:'<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  upload:'<path d="M12 16V3m-5 5 5-5 5 5M4 16v4h16v-4"/>',
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
async function uploadExcel(body){const r=await fetch('/api/admin/import-xlsx',{method:'POST',credentials:'same-origin',headers:{'X-CSRF-Token':S.user.csrf},body});const j=await r.json().catch(()=>({}));if(!r.ok)throw Error(j.error||'Không đọc được file Excel.');return j;}
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
  S.mapFeatures=files.filter(Boolean);S.mapShapeHTML=null;S.mapCacheLabels=null;S.mapViewBox=null;
  S.mapStatus=S.mapFeatures.length===GIS.length?'ready':'limited';
  if(S.view==='directory')render();
}
function mapProjection(){
 // Project true coordinates with the same scale on both axes. Fit the actual
 // geographic bounds instead of the old, oversized fixed canvas margins.
 const all=S.mapFeatures.flatMap(x=>coordsFlat(x.geometry));
 if(!all.length)return null;
 let left=Infinity,right=-Infinity,bottom=Infinity,top=-Infinity;
 all.forEach(p=>{left=Math.min(left,p[0]);right=Math.max(right,p[0]);bottom=Math.min(bottom,p[1]);top=Math.max(top,p[1]);});
 const cy=(bottom+top)/2,k=Math.cos(cy*Math.PI/180),cx=(left+right)/2;
 const w=Math.max(.000001,(right-left)*k),h=Math.max(.000001,top-bottom);
 const scale=1000/Math.max(w,h);
 const point=p=>[(p[0]-cx)*k*scale,(cy-p[1])*scale];
 const xmin=-w*scale/2,xmax=w*scale/2,ymin=-h*scale/2,ymax=h*scale/2;
 const margin=Math.max(24,Math.max(xmax-xmin,ymax-ymin)*.06);
 S.mapViewBox=[xmin-margin,ymin-margin,(xmax-xmin)+2*margin,(ymax-ymin)+2*margin].map(v=>v.toFixed(2)).join(' ');
 return {point};
}
function regionRings(geom){return geom.type==='MultiPolygon'?geom.coordinates:geom.type==='Polygon'?[geom.coordinates]:[];}
function ringContains(point,ring){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const a=ring[i],b=ring[j];if(((a[1]>point[1])!==(b[1]>point[1]))&&(point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0]))inside=!inside;}
 return inside;}
function labelCenter(geom){
 const rings=regionRings(geom);const outer=rings.map(x=>x[0]).sort((a,b)=>b.length-a.length)[0];
 if(!outer)return [0,0];
 const minX=Math.min(...outer.map(x=>x[0])),maxX=Math.max(...outer.map(x=>x[0]));
 const minY=Math.min(...outer.map(x=>x[1])),maxY=Math.max(...outer.map(x=>x[1]));
 // Choose an interior point far from edges by sampling, never trust bbox center alone.
 let best=null,bestScore=-Infinity;
 for(let r=1;r<=13;r++)for(let c=1;c<=17;c++){
   const lon=minX+(maxX-minX)*c/18,lat=minY+(maxY-minY)*r/14;
   if(!ringContains([lon,lat],outer))continue;
   const score=Math.min(c,18-c)/18+Math.min(r,14-r)/14;
   if(score>bestScore){bestScore=score;best=[lon,lat];}
 }
 return best||outer[Math.floor(outer.length/2)];
}
function mapShapes(){
 // GeoJSON may contain thousands of vertices; cache the paths once instead of rebuilding for every button press.
 if(S.mapShapeHTML!==null){S.mapLabels=S.mapCacheLabels||[];return S.mapShapeHTML;}
 const proj=mapProjection();S.mapLabels=[];if(!proj)return '';
 const fills=['#5284d9','#4ba99c','#ad8bd5','#ebb364','#7d9cce','#df8784'];
 const result=S.mapFeatures.map(({ward,geometry})=>{
  const i=WARDS.indexOf(ward);
  const path=regionRings(geometry).map(poly=>poly.map(ring=>'M'+ring.map((p,i)=>{const [x,y]=proj.point(p);return (i?'L':'')+x.toFixed(2)+','+y.toFixed(2)}).join('')+'Z').join('')).join('');
  const [lx,ly]=proj.point(labelCenter(geometry));S.mapLabels.push({ward,x:lx,y:ly});
  return `<path class="ward-polygon" data-action="map-ward" data-value="${e(ward)}" d="${path}" fill="${fills[i]}" fill-rule="evenodd" role="button" tabindex="0" aria-label="Chọn ${e(ward)}"></path>`;
 }).join('');
 S.mapShapeHTML=result;S.mapCacheLabels=S.mapLabels;return result;
}
function updateMapSelection(){
 document.querySelectorAll('.ward-polygon').forEach(el=>el.classList.toggle('selected',el.dataset.value===S.ward));
}
function positionMapLabels(){
 // Labels are DOM elements OUTSIDE the animated SVG: keep them crisp and
 // reposition in the local coordinate system, not from 3D screen bounds.
 const svg=document.getElementById('map-svg'),layer=document.getElementById('map-label-layer');
 if(!svg||!layer)return;
 const vb=svg.viewBox.baseVal,sw=layer.clientWidth,sh=layer.clientHeight;
 if(!vb.width||!vb.height||!sw||!sh)return;
 const scale=Math.min(sw/vb.width,sh/vb.height);
 const ox=(sw-vb.width*scale)/2,oy=(sh-vb.height*scale)/2;
 const placed=[];
 layer.querySelectorAll('[data-map-label]').forEach(btn=>{
   const x=Number(btn.dataset.x),y=Number(btn.dataset.y),bw=Math.max(72,btn.offsetWidth||110),bh=Math.max(29,btn.offsetHeight||40);
   const cx=ox+(x-vb.x)*scale, cy=oy+(y-vb.y)*scale;
   const clamp=(n,low,high)=>Math.max(low,Math.min(high,n));
   const inside=(px,py)=>({x:clamp(px,bw/2+7,Math.max(bw/2+7,sw-bw/2-7)),y:clamp(py,bh/2+7,Math.max(bh/2+7,sh-bh/2-7))});
   const offsets=[[0,0]];
   for(let r=1;r<=5;r++)for(const [dx,dy] of [[0,-1],[0,1],[-1,0],[1,0],[-1,-1],[1,-1],[-1,1],[1,1]])offsets.push([dx*r*(bw*.60+6),dy*r*(bh*.95+6)]);
   let best=null,bestPenalty=Infinity;
   for(const [dx,dy] of offsets){
     const loc=inside(cx+dx,cy+dy);
     const overlap=placed.reduce((p,q)=>{
       const xover=Math.max(0,(bw+q.w)/2+7-Math.abs(loc.x-q.x));
       const yover=Math.max(0,(bh+q.h)/2+7-Math.abs(loc.y-q.y));
       return p+xover*yover;
     },0);
     const penalty=overlap*120+Math.hypot(loc.x-cx,loc.y-cy);
     if(penalty<bestPenalty){bestPenalty=penalty;best=loc;}
     if(overlap===0&&dx===0&&dy===0)break;
   }
   placed.push({x:best.x,y:best.y,w:bw,h:bh});
   btn.style.left=best.x+'px';btn.style.top=best.y+'px';btn.style.visibility='visible';
 });
}
function mapView(){
 const counts=S.overview?.wards||{};
 const chips=WARDS.map((w,i)=>`<button class="ward-chip ${S.ward===w?'active':''}" data-action="map-ward" data-value="${e(w)}"><span class="map-dot cward${i}"></span><span>${e(wardName(w))}</span><b>${fnum(counts[w]||0)}</b></button>`).join('');
 const status=S.mapStatus==='loading'?'Đang tải bản đồ địa giới…':S.mapStatus==='ready'?'Bản đồ vector · Nhấn chọn một phường':`Chưa tải đủ dữ liệu địa giới. Vẫn có thể chọn phường phía dưới.`;
 const shapes=mapShapes();
 const labels=S.mapLabels.map(item=>`<button class="map-name" data-map-label data-action="map-ward" data-value="${e(item.ward)}" data-x="${item.x.toFixed(2)}" data-y="${item.y.toFixed(2)}" style="visibility:hidden" aria-label="Xem ${e(item.ward)}"><small>PHƯỜNG</small><b>${e(wardName(item.ward))}</b></button>`).join('');
 return `<section class="map-main map-v5 map-v51" aria-label="Bản đồ hành chính 6 phường"><div class="map-head"><div><div class="map-kicker">E-TDP · 6 PHƯỜNG · NINH BÌNH</div><h2>Bản đồ tra cứu tổ trưởng dân phố</h2><p>Chạm vào một phường để lọc, hoặc mở danh sách theo địa bàn.</p></div><div class="map-actions"><button class="btn btn-outline" data-action="ward-list-show">${icon('list',16)} ${S.ward?'Danh sách '+e(wardName(S.ward)):'Xem danh sách theo phường'}</button><button class="map-reset" data-action="map-all">${icon('pin',16)} Toàn bộ</button></div></div>
 <div class="map-tilt-zone" id="map-tilt-zone"><div class="map-graphic map-tilt-surface" id="map-tilt-surface">${shapes?`<svg id="map-svg" viewBox="${e(S.mapViewBox||'0 0 1200 740')}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Địa giới hành chính 6 phường">${shapes}</svg>`:`<div class="map-fallback">${icon('pin',44)}<strong>${S.mapStatus==='loading'?'Đang dựng bản đồ…':'Chọn phường để tra cứu'}</strong><span>${e(status)}</span></div>`}</div><div class="map-label-layer" id="map-label-layer">${labels}</div><div class="map-credit">${e(status)}</div></div>
 <div class="map-chip-strip" aria-label="Chọn phường">${chips}</div><div class="map-attr">Đường ranh giới từ dữ liệu GeoJSON công khai, sử dụng để tra cứu tham khảo. Nhãn được hiển thị độc lập để không bị mờ khi chuyển động.</div></section>`;
}
function loginView(){
return `<div class="login-shell"><section class="login-showcase"><div class="login-logo">✦ E-TDP / BÌNH CHỌN</div>
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
const titles={directory:'Bản đồ và tra cứu tổ trưởng',results:'Kết quả bình chọn',admin:'Quản lý hệ thống'};
return `<div class="shell ${S.sidebarCollapsed?'sidebar-collapsed':''} ${S.mobileNav?'mobile-nav-open':''}"><div class="sidebar-scrim" data-action="sidebar-close"></div><aside class="sidebar"><div class="brand-mark"><span class="logo-symbol">✦</span><div>E-TDP<small>HỆ THỐNG BÌNH CHỌN</small></div></div><button class="sidebar-toggle" data-action="sidebar-toggle" aria-label="Thu gọn hoặc mở thanh menu" title="Thu gọn / mở thanh menu">${icon('menu',19)}</button>
  <div class="side-caption">KHÔNG GIAN LÀM VIỆC</div><nav class="side-nav" aria-label="Điều hướng">
    ${navItem('directory','pin','Bản đồ tra cứu')}<button data-action="ward-list-show" title="Danh sách tổ trưởng theo phường">${icon('list')}<span>Danh sách theo phường</span></button>${navItem('results','trophy','Bảng xếp hạng & Kết quả')}
    ${S.user.role==='admin'?navItem('admin','shield','Quản trị hệ thống'):''}
  </nav><div class="sidebar-bottom"><div class="account-chip"><div class="avatar">${initial(S.user.label)}</div><div style="min-width:0"><b title="${e(S.user.label)}">${e(S.user.label)}</b><small>${S.user.role==='admin'?'Quản trị viên':S.user.role==='guest'?'Tra cứu công khai':'Khách ẩn danh'}</small></div></div><button class="logout-btn" data-action="${S.user.role==='admin'?'logout':'show-login'}">${icon('logout',15)} ${S.user.role==='admin'?'Đăng xuất':'Quản trị viên'}</button></div>
  </aside><main class="main"><header class="topbar"><button class="topbar-menu" data-action="sidebar-toggle" aria-label="Mở hoặc đóng menu">${icon('menu',22)}</button><div class="breadcrumbs">Hệ thống <span>›</span> <b>${titles[S.view]||''}</b></div><div class="topbar-right"><span class="topbar-dot"></span> Không gian đánh giá nội bộ <button class="btn btn-sm btn-ghost" data-action="${S.user.role==='admin'?'logout':'show-login'}" style="color:#7386a5">${S.user.role==='admin'?'Đăng xuất':'Quản trị'}</button></div></header>
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
function filtered(){if(norm(S.q).trim().length<2&&!S.showWardList)return [];let arr=S.leaders.filter(x=>(!S.ward||x.ward===S.ward)&&(!S.votedOnly||x.my_vote!==null)&&(norm(S.q).trim().length<2 || norm([x.name,x.area,x.ward,...x.aliases].join(' ')).includes(norm(S.q))));
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
function cardsGrid(){const ready=norm(S.q).trim().length>=2||S.showWardList;const items=filtered();const label=S.showWardList&&norm(S.q).trim().length<2?'Danh sách '+(S.ward?wardName(S.ward):'6 phường')+' · '+items.length+' người':`Tìm thấy ${items.length} người phù hợp`;
return `<div class="count-caption">${ready?e(label):'Nhập ít nhất 2 ký tự để tìm kiếm tổ trưởng, hoặc chọn Xem danh sách theo phường.'}</div><div id="cards-grid" class="directory-grid">${ready?(items.length?items.slice(0,S.listLimit).map(personCard).join('')+(items.length>S.listLimit?`<button class="btn btn-outline list-more" data-action="list-more">Xem thêm ${Math.min(80,items.length-S.listLimit)} tổ trưởng</button>`:''):'<div class="empty-box"><h3>Chưa có tổ trưởng</h3><p>Có thể bổ sung trong tài khoản quản trị viên.</p></div>'):'<div class="empty-box search-empty">'+icon('search',32)+'<h3>Tìm kiếm theo tên hoặc địa bàn</h3><p>Bạn cũng có thể mở toàn bộ danh sách của phường vừa chọn.</p></div>'}</div>`;}
function miniRanking(){
 const mode=S.rankMode==='difficult'?'difficult':'easy',rs=S.rankings||{},min=rs.minimum_votes||5;
 const entries=(rs[mode]||[]).slice(0,6);
 return `<div class="home-rank-top"><div class="rank-eyebrow">${icon('trophy',17)} BẢNG XẾP HẠNG CỘNG ĐỒNG</div><h3>Tổ trưởng nổi bật</h3><p>Thống kê theo tỷ lệ trên ít nhất ${min} phiếu, chỉ để tham khảo.</p></div><div class="home-rank-tabs" role="group" aria-label="Loại bảng xếp hạng"><button type="button" data-action="rank-mode" data-value="easy" aria-pressed="${mode==='easy'}" class="${mode==='easy'?'active':''}">😊 Dễ tính</button><button type="button" data-action="rank-mode" data-value="difficult" aria-pressed="${mode==='difficult'}" class="${mode==='difficult'?'active':''}">🤨 Khó tính</button></div><div class="home-rank-results">${entries.length?entries.map((x,i)=>rankItem(x,i,mode)).join(''):`<div class="home-rank-empty">${icon('chart',25)}<b>Chưa đủ dữ liệu bình chọn</b><span>Cần tối thiểu ${min} phiếu cho một tổ trưởng để hiển thị.</span></div>`}</div><div class="home-rank-note">${icon('info',14)} Đây là đánh giá chủ quan; không phải nhận định chính thức về một cá nhân.</div><button class="rank-more" data-action="nav" data-value="results">Xem bảng xếp hạng đầy đủ ${icon('arrow',15)}</button>`;
}
function directoryView(){return `<div class="page-head"><div><span class="eyebrow">HỆ THỐNG TỔ TRƯỞNG DÂN PHỐ · 6 PHƯỜNG</span><h1 class="page-title">Bản đồ & trải nghiệm phối hợp</h1><p class="page-desc">Chọn phường, tìm đúng người và tham gia trò chơi đánh giá vui nhộn. Mỗi phiên ẩn danh chỉ có một phiếu cho mỗi tổ trưởng.</p></div></div>${mapView()}
 <div class="home-below-map"><section class="finder-panel" id="directory-list"><div class="section-head"><div><span class="eyebrow">TÌM KIẾM TỔ TRƯỞNG</span><h3>${S.ward?'Đang chọn '+e(S.ward):'Bạn muốn tìm ai?'}</h3><p>Tìm theo tên hoặc mở danh sách của phường đã chọn.</p></div><button class="btn btn-outline" data-action="ward-list-toggle">${icon('list',17)} ${S.showWardList?'Ẩn danh sách':'Xem danh sách '+(S.ward?'phường '+e(wardName(S.ward)):'theo phường')}</button></div>${filters()}${cardsGrid()}</section><aside class="home-ranking" id="home-ranking">${miniRanking()}</aside></div>${summary()}`;}
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
function leaderRows(){const items=S.adminLeaders;return `<div class="table-scroll"><table class="table"><thead><tr><th>Tổ trưởng</th><th>Địa bàn</th><th>Số điện thoại</th><th>Trạng thái</th><th></th></tr></thead><tbody>${items.map(x=>`<tr><td><b>${e(x.name)}</b><small>${e(x.id)}</small></td><td>${e(x.area)}<br><small>${e(x.ward)}</small></td><td>${x.phone?`<a href="tel:${e(String(x.phone).replace(/[^+0-9]/g,''))}">${e(x.phone)}</a>`:'<span class="muted">Chưa có SĐT</span>'}${x.phone_alt?`<br><small>Số khác: ${e(x.phone_alt)}</small>`:''}</td><td><span class="badge-status ${x.active?'':'off'}">${x.active?'Đang sử dụng':'Đã ẩn'}</span></td><td class="right"><button class="btn btn-sm" data-action="edit-leader" data-id="${e(x.id)}">${icon('edit',14)} Sửa</button></td></tr>`).join('')}</tbody></table></div>`;}
function adminCommentsView(){
 const list=S.adminComments||[]; const pending=list.filter(c=>c.status==='pending'||c.status==='hidden').length;
 const label={pending:'Chờ duyệt',approved:'Đã công khai',hidden:'Đã ẩn',rejected:'Từ chối'};
 return `<div class="card-panel"><div class="section-head"><div><h3>Duyệt bình luận ẩn danh</h3><p>Có ${pending} bình luận chờ xem xét hoặc bị báo cáo. Không công khai thông tin người gửi.</p></div><span class="badge-status">${list.length} bình luận</span></div>
 <div class="moderation-list">${list.length?list.map(c=>`<div class="moderation-item"><div class="moderation-head"><strong>${e(c.leader_name)}</strong><span class="mod-status status-${e(c.status)}">${label[c.status]||c.status}</span></div><div class="muted micro">${e(c.area)} · ${e(c.ward)} · ${dateText(c.created_at)} ${c.reports?' · '+c.reports+' báo cáo':''}</div><p class="moderation-text">${e(c.body)}</p><div class="moderation-actions"><button class="btn btn-sm btn-primary" data-action="moderate" data-id="${c.id}" data-status="approved">${icon('check',14)} Duyệt</button><button class="btn btn-sm" data-action="moderate" data-id="${c.id}" data-status="hidden">Ẩn</button><button class="btn btn-sm btn-danger" data-action="moderate" data-id="${c.id}" data-status="rejected">Từ chối</button></div></div>`).join(''):'<div class="notice">Chưa có bình luận.</div>'}</div></div>`;
}
function importPanel(){const preview=S.importResult;
return `<div class="excel-panel"><div class="excel-heading"><div><h4>Nhập danh sách tổ trưởng từ Excel</h4><p>Tải danh sách đang có về sửa hoặc lấy mẫu trống. Xem trước thay đổi rồi mới lưu vào Supabase.</p></div><div class="btn-row"><button class="btn btn-outline btn-sm" data-action="excel-blank">${icon('download',15)} Tải mẫu trống</button><button class="btn btn-outline btn-sm" data-action="excel-current">${icon('download',15)} Tải danh sách hiện tại</button></div></div><form id="excel-import-form"><label class="excel-upload"><span>${icon('upload',22)} Chọn file .xlsx</span><input type="file" id="excel-file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" required></label><button class="btn btn-primary" type="submit">Xem trước dữ liệu</button></form><p class="micro muted">Tối đa 500 dòng/lần, file không quá 2 MB. Cột Mã tổ trưởng dùng để cập nhật đúng người, tránh mất kết quả Vote.</p>
 ${preview?`<div class="excel-preview"><strong>Kết quả kiểm tra: ${preview.total} dòng</strong><div class="excel-stats"><span>Thêm mới: <b>${preview.create}</b></span><span>Cập nhật: <b>${preview.update}</b></span><span>Giữ nguyên: <b>${preview.skip}</b></span><span>Lỗi: <b>${preview.errors.length}</b></span></div>${preview.errors.length?`<ul class="excel-errors">${preview.errors.slice(0,12).map(x=>`<li>${e(x)}</li>`).join('')}</ul>`:''}<div class="btn-row"><button class="btn btn-primary" data-action="excel-commit" ${preview.errors.length||!(preview.create+preview.update)?'disabled':''}>${icon('check',15)} Xác nhận lưu ${preview.create+preview.update} dòng</button><button class="btn" data-action="excel-clear">Hủy xem trước</button></div></div>`:''}</div>`;
}
function adminView(){return `<div class="page-head"><div><span class="eyebrow">QUẢN TRỊ DỮ LIỆU</span><h1 class="page-title">Quản lý hệ thống</h1><p class="page-desc">Chỉnh sửa danh sách tổ trưởng và duyệt bình luận ẩn danh. Số điện thoại chỉ hiển thị cho quản trị viên.</p></div></div>${summary()}
<div class="admin-tabs"><button data-action="admin-tab" data-value="leaders" class="${S.adminSection==='leaders'?'active':''}">Quản lý tổ trưởng</button><button data-action="admin-tab" data-value="comments" class="${S.adminSection==='comments'?'active':''}">Duyệt bình luận</button></div>
${S.adminSection==='comments'?adminCommentsView():`<div class="card-panel"><div class="section-head"><div><h3>Danh sách tổ trưởng <span class="muted">(${S.adminLeaders.length})</span></h3><p>Thêm người mới, khôi phục số điện thoại bằng Excel riêng, hoặc xuất danh sách để chỉnh sửa và nhập lại. Giữ nguyên mã ID để bảo toàn phiếu bình chọn.</p></div><button class="btn btn-primary" data-action="add-leader">${icon('plus',17)} Thêm tổ trưởng</button></div>${importPanel()}${leaderRows()}</div>`}`;}
function commentItems(){
 if(!S.comments.length)return `<div class="comment-empty">${icon('message',24)}<strong>Chưa có bình luận công khai</strong><span>Hãy chia sẻ trải nghiệm cụ thể, lịch sự và có tính xây dựng.</span></div>`;
 const labels={pending:'Đang chờ duyệt',approved:'Đã đăng',hidden:'Đã ẩn để kiểm tra',rejected:'Không được duyệt'};
 return S.comments.map(c=>`<article class="comment-item"><div class="comment-top"><span class="anon-avatar">${icon('shield',15)}</span><div><strong>Người bình luận ẩn danh ${c.is_mine?'<span class="my-marker">· của bạn</span>':''}</strong><div class="muted micro">${dateText(c.created_at)}</div></div>${c.is_mine&&c.status!=='approved'?`<span class="comment-pending">${labels[c.status]||''}</span>`:''}</div><p class="comment-text">${e(c.body)}</p><div class="comment-tools">${c.is_mine?`<button data-action="remove-comment" data-id="${c.id}">Xóa bình luận của tôi</button>`:S.user.role==='voter'?`<button data-action="report-comment" data-id="${c.id}">${icon('flag',12)} Báo cáo</button>`:''}</div></article>`).join('');
}
function detailModal(){const x=S.leaders.find(l=>l.id===S.selected);if(!x)return '';const counts=x.counts||[0,0,0,0];const s=S.draftVote;
 const canComment=S.user.role==='voter'&&x.my_vote!=null;
 return `<div class="modal-bg" data-action="close-bg"><div class="modal modal-profile v5-profile" role="dialog" aria-modal="true" aria-labelledby="detail-title">
 <div class="profile-banner"><div class="profile-kicker">TRẢI NGHIỆM PHỐ MÌNH <span>${e(wardName(x.ward))} · Ninh Bình</span></div><div class="profile-title-line"><span class="profile-avatar">${initial(x.name)}</span><div class="profile-title-text"><span class="profile-tag">TỔ TRƯỞNG DÂN PHỐ</span><h2 id="detail-title">${e(x.name)}</h2><p>${icon('pin',15)} ${e(x.area)} · ${e(x.ward)}</p></div><button class="icon-btn profile-close" data-action="close-modal" aria-label="Đóng cửa sổ">×</button></div><div class="profile-metrics"><span>${icon('users',16)} <b>${fnum(x.votes)}</b> phiếu</span><span>${icon('message',16)} <b>${fnum(S.commentTotal)}</b> bình luận đã duyệt</span></div></div>
 <div class="v5-layout"><section class="vote-play"><div class="profile-section-head"><span class="eyebrow">01 / CHỌN TRẢI NGHIỆM</span><h3>Gặp bác tổ trưởng, bạn cảm thấy thế nào?</h3><p>Chọn một mức rồi kéo hướng súng và bắn bóng xốp vào nhân vật hoạt hình.</p></div>
 ${S.user.role==='voter'?`<div class="v5-options">${LABELS.map((label,i)=>`<button type="button" class="v5-option ${s===i+1?'selected':''}" data-action="choose" data-level="${i+1}" style="--state-color:${COLORS[i]}"><span class="face-emoji">${['😊','😐','🤨','😠'][i]}</span><b>${e(label)}</b></button>`).join('')}</div><div class="game-frame"><canvas id="ball-game" aria-label="Trò bắn bóng mềm: kéo để ngắm rồi bấm nút bắn" role="img"></canvas><div class="game-buttons"><span id="shot-counter">0 bóng đã bắn</span><button class="btn btn-primary" data-action="game-fire" ${s==null?'disabled':''}>🎯 BẮN BÓNG</button></div></div><div class="game-notice" id="game-status">${x.my_vote?'✓ Bạn đã đánh giá ở mức '+x.my_vote+'. Bắn trúng với mức khác để đổi phiếu.':'Bạn chưa bình chọn. Bắn trúng nhân vật để xác nhận một phiếu.'}</div><p class="game-fairness">Bắn bao nhiêu bóng cũng được, nhưng chỉ tính <b>1 phiếu cho mỗi tổ trưởng trên mỗi phiên ẩn danh</b>. Các phát bắn thêm không cộng lượt. Nhân vật hoàn toàn hư cấu.</p>${x.my_vote?'<button class="btn btn-ghost btn-sm" data-action="remove-vote">Hủy phiếu của tôi</button>':''}`:`<div class="notice">Quản trị viên chỉ xem kết quả, không tham gia bình chọn.</div>`}
 </section><aside class="vote-insights"><div class="profile-section-head"><span class="eyebrow">02 / KẾT QUẢ</span><h3>Ý kiến cộng đồng</h3><p>${fnum(x.votes)} phiếu đã ghi nhận</p></div>${x.revealed&&x.votes?LABELS.map((l,i)=>`<div class="result-row"><div><div class="title"><span>${e(l)}</span><span>${fnum(counts[i])} phiếu</span></div><div class="bar"><span style="width:${counts[i]*100/x.votes}%;background:${COLORS[i]}"></span></div></div><div class="percent">${percent(counts[i],x.votes)}%</div></div>`).join(''):`<div class="notice orange">${x.votes===0?'Chưa có lượt bình chọn.':'Chỉ công bố tỷ lệ khi đủ ít nhất 3 phiếu.'}</div>`}
 <div class="profile-section-head"><span class="eyebrow">03 / BÌNH LUẬN ẨN DANH</span><h3>Góc chia sẻ</h3><p>Gửi nhận xét sau khi bình chọn; mọi bình luận đều được duyệt.</p></div>
 ${canComment?`<form id="comment-form" class="comment-compose"><div class="comment-compose-top"><span class="anon-avatar">${icon('shield',16)}</span><div><strong>Người bình luận ẩn danh</strong><small>Không hiển thị danh tính công khai</small></div></div><textarea id="comment-text" name="body" required minlength="5" maxlength="700" rows="4" placeholder="Chia sẻ một trải nghiệm cụ thể, lịch sự…">${e(S.commentDraft)}</textarea><div class="compose-foot"><small><span id="comment-length">${S.commentDraft.length}</span>/700 ký tự</small><button class="btn btn-primary btn-sm" type="submit">Gửi chờ duyệt</button></div></form>`:`<div class="notice">🔒 ${S.user.role==='voter'?'Hãy bắn trúng và lưu phiếu trước khi bình luận.':'Tài khoản quản trị chỉ duyệt bình luận.'}</div>`}
 <div class="comment-list-head"><h4>Bình luận cộng đồng</h4><span>${fnum(S.commentTotal)} công khai</span></div><div class="comment-list">${commentItems()}</div><div class="safe-comment-note">Nhận xét là cảm nhận chủ quan. Không đăng số điện thoại, thông tin cá nhân hoặc nội dung xúc phạm.</div></aside></div></div></div>`;
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
async function onGameHit(){
 const lid=S.selected,level=S.draftVote;
 if(!lid||level==null||S.isSaving)return;
 const x=S.leaders.find(l=>l.id===lid);if(!x)return;
 if(x.my_vote===level){const status=document.getElementById('game-status');if(status)status.textContent='🎉 Trúng! Phiếu hiện tại của bạn đã được ghi nhận; bắn tiếp chỉ là trò chơi.';return;}
 S.isSaving=true;
 try{
   await req('/api/vote','POST',{leader_id:lid,level});
   await loadMain();if(S.selected===lid){await loadComments(lid);}
   showToast(x.my_vote?'Đã đổi mức đánh giá (vẫn chỉ một phiếu).':'🎉 Bắn trúng! Đã lưu một phiếu đánh giá.');
   render();
 }catch(err){showToast('Chưa lưu phiếu: '+err.message);}finally{S.isSaving=false;}
}
function mountVisibleGame(){
 const canvas=document.getElementById('ball-game');
 if(canvas && S.user?.role==='voter'){
   window.TDPGame?.mount(canvas,{level:S.draftVote||2,onHit:onGameHit,alreadyVoted:!!S.leaders.find(l=>l.id===S.selected)?.my_vote});
   canvas.addEventListener('tdp-shot',ev=>{const el=document.getElementById('shot-counter');if(el)el.textContent=ev.detail.count+' bóng đã bắn';});
 }
}
function renderDialogOnly(){
 // Preserve the map, navigation and search DOM when opening / closing a popup.
 window.TDPGame?.dispose();
 app.querySelectorAll(':scope > .modal-bg').forEach(el=>el.remove());
 const markup=S.selected?detailModal():S.editLeader!==null?leaderModal():'';
 if(markup)app.insertAdjacentHTML('beforeend',markup);
 mountVisibleGame();
}
function render(){
 window.TDPGame?.dispose();
 app.innerHTML=S.user?pageLayout():loginView();
 requestAnimationFrame(()=>{positionMapLabels();updateMapSelection();window.__trackMapResize?.();});
 mountVisibleGame();
}
function rerenderCards(){const wrap=document.getElementById('cards-grid');if(!wrap)return;const ready=norm(S.q).trim().length>=2||S.showWardList;const list=filtered();wrap.innerHTML=ready?(list.length?list.slice(0,S.listLimit).map(personCard).join('')+(list.length>S.listLimit?`<button class="btn btn-outline list-more" data-action="list-more">Xem thêm ${Math.min(80,list.length-S.listLimit)} tổ trưởng</button>`:''):'<div class="empty-box"><h3>Chưa có kết quả</h3></div>'):'<div class="empty-box search-empty">'+icon('search',32)+'<h3>Nhập tên hoặc mở danh sách theo phường</h3></div>';const n=document.querySelector('.count-caption');if(n)n.textContent=ready?`Có ${list.length} tổ trưởng phù hợp`:'Nhập tên tổ trưởng hoặc nhấn Xem danh sách theo phường';}
async function refresh(){await loadMain();if(S.view==='admin')await loadAdmin();render();}
async function copyText(txt){try{await navigator.clipboard.writeText(txt);showToast('Đã sao chép.');}catch(err){const ta=document.createElement('textarea');ta.value=txt;ta.style.position='fixed';ta.style.left='-9999px';document.body.appendChild(ta);ta.select();let ok=document.execCommand('copy');ta.remove();showToast(ok?'Đã sao chép.':'Không thể sao chép tự động. Hãy chọn và sao chép mã trên màn hình.');}}
async function onClick(ev){const b=ev.target.closest('[data-action]');if(!b)return;
const act=b.dataset.action;
const remoteActions=new Set(['guest','nav','logout','details','save-vote','remove-vote','admin-tab','moderate','remove-comment','report-comment','excel-commit','export']);
if(b.getAttribute('aria-busy')==='true')return;
if(remoteActions.has(act)){b.setAttribute('aria-busy','true');b.classList.add('is-busy');}
try{
if(act==='map-ward'){S.ward=b.dataset.value;S.q='';S.listLimit=80;S.showWardList=false;S.view='directory';render();document.getElementById('directory-list')?.scrollIntoView({behavior:'smooth',block:'start'});document.getElementById('search')?.focus({preventScroll:true});return;}
if(act==='map-all'){S.ward='';S.q='';S.showWardList=false;S.listLimit=80;S.view='directory';render();return;}
if(act==='rank-mode'){S.rankMode=b.dataset.value==='difficult'?'difficult':'easy';const panel=document.getElementById('home-ranking');if(panel)panel.innerHTML=miniRanking();return;}
if(act==='sidebar-toggle'){if(window.matchMedia('(max-width:850px)').matches){S.mobileNav=!S.mobileNav;}else{S.sidebarCollapsed=!S.sidebarCollapsed;try{localStorage.setItem('etdp-sidebar',S.sidebarCollapsed?'1':'0');}catch(_){}}const shell=document.querySelector('.shell');shell?.classList.toggle('sidebar-collapsed',S.sidebarCollapsed);shell?.classList.toggle('mobile-nav-open',S.mobileNav);return;}
if(act==='sidebar-close'){S.mobileNav=false;document.querySelector('.shell')?.classList.remove('mobile-nav-open');return;}
if(act==='ward-list-show'){S.view='directory';S.listLimit=80;S.showWardList=true;S.mobileNav=false;render();document.getElementById('directory-list')?.scrollIntoView({behavior:'smooth'});return;}
if(act==='ward-list-toggle'){S.showWardList=!S.showWardList;S.listLimit=80;render();return;}
if(act==='list-more'){S.listLimit+=80;rerenderCards();return;}
if(act==='show-login'){S.user=null;render();return;}
if(act==='guest'){const r=await req('/api/me');S.user=r.user||GUEST;S.loginError='';await loadMain();render();return;}

if(act==='nav'){S.view=b.dataset.value;S.mobileNav=false;if(S.view==='admin')await loadAdmin();render();return;}
if(act==='logout'){await req('/api/logout','POST',{});const r=await req('/api/me');S.user=r.user||GUEST;S.selected=null;S.editLeader=null;await loadMain();render();return;}
if(act==='voted-only'){S.votedOnly=!S.votedOnly;render();return;}
if(act==='details'){S.selected=b.dataset.id;S.draftVote=S.leaders.find(l=>l.id===S.selected)?.my_vote??null;S.commentDraft='';S.comments=[];S.commentTotal=0;await loadComments(S.selected);renderDialogOnly();return;}
if(act==='close-modal'){S.selected=null;S.editLeader=null;renderDialogOnly();return;}
if(act==='close-bg'){if(ev.target===b){S.selected=null;S.editLeader=null;renderDialogOnly();}return;}
if(act==='choose'){S.draftVote=Number(b.dataset.level);document.querySelectorAll('.v5-option').forEach(el=>el.classList.toggle('selected',Number(el.dataset.level)===S.draftVote));const fire=document.querySelector('[data-action="game-fire"]');if(fire)fire.disabled=false;window.TDPGame?.setLevel(S.draftVote);const status=document.getElementById('game-status');if(status)status.textContent='Đã chọn '+LABELS[S.draftVote-1]+'. Kéo ngắm và bắn trúng để lưu một phiếu.';return;}
if(act==='game-fire'){if(S.draftVote!=null){b.classList.add('tap-pulse');setTimeout(()=>b.classList.remove('tap-pulse'),220);window.TDPGame?.fire();}return;}
if(act==='save-vote'){if(S.isSaving)return;S.isSaving=true;try{await req('/api/vote','POST',{leader_id:S.selected,level:S.draftVote});showToast('Đã ghi nhận bình chọn thành công.');await loadMain();render();}finally{S.isSaving=false;}return;}
if(act==='remove-vote'){if(!window.confirm('Hủy phiếu bình chọn của bạn cho tổ trưởng này?'))return;await req('/api/vote/'+encodeURIComponent(S.selected),'DELETE');await loadMain();render();showToast('Đã hủy phiếu.');return;}
if(act==='admin-tab'){S.adminSection=b.dataset.value;await loadAdmin();render();return;}
if(act==='moderate'){await req('/api/admin/comments/'+b.dataset.id,'PUT',{status:b.dataset.status});await loadAdmin();render();showToast('Đã cập nhật trạng thái bình luận.');return;}
if(act==='remove-comment'){if(!window.confirm('Bạn muốn xóa bình luận này?'))return;await req('/api/comments/'+b.dataset.id,'DELETE');await loadComments(S.selected);await loadMain();render();showToast('Đã xóa bình luận.');return;}
if(act==='report-comment'){if(!window.confirm('Báo cáo bình luận này vì nội dung không phù hợp?'))return;await req('/api/comments/'+b.dataset.id+'/report','POST',{});await loadComments(S.selected);await loadMain();render();showToast('Đã gửi báo cáo để quản trị viên xem xét.');return;}
if(act==='excel-blank'||act==='excel-current'){window.location.href=act==='excel-blank'?'/api/admin/template.xlsx':'/api/admin/leaders.xlsx';return;}
if(act==='excel-clear'){S.importResult=null;S.importFile=null;render();return;}
if(act==='excel-commit'){if(!S.importFile||!S.importResult||S.importResult.errors.length)throw Error('Hãy xem trước file hợp lệ trước khi lưu.');if(!window.confirm('Xác nhận ghi thay đổi Excel vào Supabase?'))return;const form=new FormData();form.append('file',S.importFile);form.append('mode','commit');const saved=await uploadExcel(form);S.importResult=null;S.importFile=null;await loadMain();await loadAdmin();render();showToast('Đã nhập '+saved.create+' mới, cập nhật '+saved.update+' tổ trưởng.');return;}
if(act==='add-leader'){S.editLeader='new';renderDialogOnly();return;}
if(act==='edit-leader'){S.editLeader=b.dataset.id;renderDialogOnly();return;}
if(act==='export'){
 const blob=await req('/api/admin/export.csv');const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='ket_qua_binh_chon.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);return;
}
}catch(err){showToast(err.message);}finally{b.removeAttribute('aria-busy');b.classList.remove('is-busy');}
}
app.addEventListener('click',onClick);
app.addEventListener('input',ev=>{if(ev.target.id==='search'){S.q=ev.target.value;S.listLimit=80;rerenderCards();}
  if(ev.target.id==='comment-text'){S.commentDraft=ev.target.value;const counter=document.getElementById('comment-length');if(counter)counter.textContent=S.commentDraft.length;}});
app.addEventListener('change',ev=>{if(ev.target.id==='ward-select'){S.ward=ev.target.value;S.listLimit=80;rerenderCards();}if(ev.target.id==='sort-select'){S.sort=ev.target.value;rerenderCards();}});
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
    if(form.id==='excel-import-form'){const file=document.getElementById('excel-file')?.files?.[0];if(!file)throw Error('Hãy chọn file Excel .xlsx.');const body=new FormData();body.append('file',file);body.append('mode','preview');const result=await uploadExcel(body);S.importFile=file;S.importResult=result;render();showToast('Đã kiểm tra '+result.total+' dòng; chưa ghi thay đổi.');return;}
    if(form.id==='leader-form'){
      const fd=new FormData(form);const data={name:String(fd.get('name')||'').trim(),area:String(fd.get('area')||'').trim(),ward:String(fd.get('ward')||'').trim(),phone:String(fd.get('phone')||'').trim(),phone_alt:String(fd.get('phone_alt')||'').trim(),aliases:String(fd.get('aliases')||'').split(',').map(x=>x.trim()).filter(Boolean),active:S.editLeader==='new'?true:fd.has('active')};
      if(S.editLeader==='new')await req('/api/admin/leaders','POST',data);
      else await req('/api/admin/leaders/'+encodeURIComponent(form.dataset.id),'PUT',data);
      S.editLeader=null;await loadMain();await loadAdmin();render();showToast('Đã lưu thông tin tổ trưởng.');return;
    }
  }catch(err){if(form.id==='login-form'){S.loginError=err.message;render();}else showToast(err.message);}
});
window.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&S.mobileNav){S.mobileNav=false;render();return;}if(ev.key==='Escape'&&(S.selected||S.editLeader!==null)){S.selected=null;S.editLeader=null;renderDialogOnly();}});
try{S.sidebarCollapsed=localStorage.getItem('etdp-sidebar')==='1';}catch(_){}
window.addEventListener('resize',()=>requestAnimationFrame(positionMapLabels));
bootstrap();

// Giới hạn cập nhật hiệu ứng bản đồ tối đa một lần/frame: tránh giật khi rê chuột.
let mapTiltFrame=0;let mapTiltData=null;
app.addEventListener('pointermove',ev=>{
 const zone=ev.target.closest('#map-tilt-zone');
 if(!zone||window.matchMedia('(prefers-reduced-motion:reduce)').matches||ev.pointerType==='touch')return;
 mapTiltData={zone,x:ev.clientX,y:ev.clientY};if(mapTiltFrame)return;
 mapTiltFrame=requestAnimationFrame(()=>{mapTiltFrame=0;if(!mapTiltData)return;
  const {zone,x,y}=mapTiltData;mapTiltData=null;if(!zone.isConnected)return;
  const r=zone.getBoundingClientRect();if(!r.width||!r.height)return;
  const fx=Math.max(-1,Math.min(1,((x-r.left)/r.width-.5)*2));
  const fy=Math.max(-1,Math.min(1,((y-r.top)/r.height-.5)*2));
  const surface=zone.querySelector('#map-tilt-surface');
  surface?.style.setProperty('--rx',(-1.25*fy).toFixed(2)+'deg');
  surface?.style.setProperty('--ry',(1.25*fx).toFixed(2)+'deg');
 });
});
app.addEventListener('pointerout',ev=>{
 const zone=ev.target.closest?.('#map-tilt-zone');if(!zone||zone.contains(ev.relatedTarget))return;
 const s=zone.querySelector('#map-tilt-surface');s?.style.setProperty('--rx','0deg');s?.style.setProperty('--ry','0deg');
});
if('ResizeObserver' in window){
 const mapResize=new ResizeObserver(()=>requestAnimationFrame(positionMapLabels));
 let tracked=null;
 const observe=()=>{const zone=document.getElementById('map-tilt-zone');if(zone===tracked)return;
  if(tracked)mapResize.unobserve(tracked);tracked=zone;if(zone)mapResize.observe(zone);};
 // Defer observation until content has rendered; follow subsequent page changes via existing render.
 window.__trackMapResize=observe;
}
