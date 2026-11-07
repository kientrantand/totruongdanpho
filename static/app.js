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
  votedOnly: false, selected: null, draftVote: null, pendingLevel: null, authRole:'admin', loginError:'',
  adminSection: 'leaders', adminLeaders:[], showWardList:false, sidebarCollapsed:false, mobileNav:false, importResult:null, importFile:null, rankMode:'easy', listLimit:80, mapShapeHTML:null, mapCacheLabels:null, mapViewBox:null,
  featuredId:null, editLeader:null, isSaving:false, rankings:{easy:[],difficult:[],minimum_votes:5},
  comments:[],commentDraft:'',commentTotal:0,commentOwner:null,commentRequestSeq:0,adminComments:[],adminCommentFilter:'all',peekLeader:null,peekComments:[],peekOffset:0,peekTotal:0,peekLoading:false,peekRequestSeq:0
};
const ICONS = {
  people:'<circle cx="9" cy="7" r="3"/><path d="M3 19v-1a6 6 0 0112 0v1"/><path d="M17 4a3 3 0 010 6M17 14a5 5 0 014 5"/>',
  phone:'<path d="M22 16.9v3a2 2 0 01-2.18 2A19.8 19.8 0 012 4.18 2 2 0 014 2h3a2 2 0 012 1.72l.5 3a2 2 0 01-.57 1.82L7.8 9.68a16 16 0 006.52 6.52l1.14-1.13a2 2 0 011.82-.57l3 .5A2 2 0 0122 16.9z"/>',
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
function publicPhone(x, className='person-phone'){
  const numbers=[x.phone, x.phone_alt].map(v=>String(v||'').trim()).filter(Boolean);
  const elements=numbers.map((raw,i)=>{
    const dial=raw.replace(/[^+0-9]/g,'');
    const link=/^\+?[0-9]{9,15}$/.test(dial);
    const value=link?`<a href="tel:${e(dial)}" aria-label="Gọi ${e(raw)}">${e(raw)}</a>`:`<span>${e(raw)}</span>`;
    return `<span class="phone-number">${i?'<small>Số phụ:</small>':''}${value}</span>`;
  });
  return `<div class="${className}">${icon('phone',15)}${elements.length?elements.join(''):'<span class="phone-unavailable">Chưa cập nhật số điện thoại</span>'}</div>`;
}

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
  const requestedId=String(id||'');
  const seq=++S.commentRequestSeq;
  const path=(S.user.role==='guest'?'/api/public/comments':'/api/comments')+'?leader_id='+encodeURIComponent(requestedId);
  const ret=await req(path);
  // Người dùng đã chuyển hồ sơ trong khi yêu cầu trước còn đang tải.
  if(seq!==S.commentRequestSeq||S.selected!==requestedId)return false;
  if(String(ret.leader_id)!==requestedId||String(ret.leader?.id)!==requestedId){
    throw new Error('Máy chủ trả bình luận không đúng tổ trưởng. Đã chặn hiển thị.');
  }
  if(!Array.isArray(ret.comments)||ret.comments.some(c=>String(c.leader_id)!==requestedId)){
    throw new Error('Phát hiện bình luận thuộc hồ sơ khác. Đã chặn hiển thị.');
  }
  S.commentOwner=requestedId;
  S.comments=ret.comments;
  S.commentTotal=Number(ret.total_approved)||0;
  return true;
}
function clearLeaderComments(){
  ++S.commentRequestSeq; // hủy hiệu lực của yêu cầu đang chờ
  S.comments=[];S.commentOwner=null;S.commentTotal=0;
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
 const labels=S.mapLabels.map(item=>`<button class="map-name" data-map-label data-action="map-ward" data-value="${e(item.ward)}" data-x="${item.x.toFixed(2)}" data-y="${item.y.toFixed(2)}" style="visibility:hidden" aria-label="Xem ${e(item.ward)}"><b>${e(wardName(item.ward))}</b></button>`).join('');
 return `<section class="map-main map-v5 map-v51" aria-label="Bản đồ hành chính 6 phường"><div class="map-head"><div><div class="map-kicker">BẢN ĐỒ TƯƠNG TÁC</div><h2>Bản đồ 6 phường</h2><p>Nhấn vào phường để tra cứu</p></div><div class="map-actions"><button class="map-reset" data-action="map-all">${icon('pin',16)} Toàn bộ</button></div></div>
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
return `<div class="shell ${S.sidebarCollapsed?'sidebar-collapsed':''} ${S.mobileNav?'mobile-nav-open':''}"><div class="sidebar-scrim" data-action="sidebar-close"></div><aside class="sidebar"><div class="brand-mark"><span class="logo-symbol">⌖</span><div>E-TDP<small>TRA CỨU & LIÊN HỆ</small></div></div><button class="sidebar-toggle" data-action="sidebar-toggle" aria-label="Thu gọn hoặc mở thanh menu" title="Thu gọn / mở thanh menu">${icon('menu',19)}</button>
  <div class="side-caption">DANH MỤC</div><nav class="side-nav" aria-label="Điều hướng">
    ${navItem('directory','home','Trang chủ & bản đồ')}${navItem('results','trophy','Xếp hạng đánh giá')}
    ${S.user.role==='admin'?navItem('admin','shield','Quản trị hệ thống'):''}
  </nav><div class="sidebar-bottom"><div class="account-chip"><div class="avatar">${initial(S.user.label)}</div><div style="min-width:0"><b title="${e(S.user.label)}">${e(S.user.label)}</b><small>${S.user.role==='admin'?'Quản trị viên':S.user.role==='guest'?'Tra cứu công khai':'Khách ẩn danh'}</small></div></div><button class="logout-btn" data-action="${S.user.role==='admin'?'logout':'show-login'}">${icon('logout',15)} ${S.user.role==='admin'?'Đăng xuất':'Quản trị viên'}</button></div>
  </aside><main class="main"><header class="topbar"><button class="topbar-menu" data-action="sidebar-toggle" aria-label="Mở hoặc đóng menu">${icon('menu',22)}</button><div class="breadcrumbs">Hệ thống <span>›</span> <b>${titles[S.view]||''}</b></div><div class="topbar-right"><span class="etdp-top-stats">${dashboardStat("people",S.overview?.leader_count??S.leaders.length,"Tổ trưởng")}${dashboardStat("pin",6,"Phường")}${dashboardStat("chart",S.overview?.total_votes||0,"Lượt đánh giá")}</span><span class="version-tag">E-TDP v7.4</span><button class="btn btn-sm btn-ghost" data-action="${S.user.role==='admin'?'logout':'show-login'}" style="color:#7386a5">${S.user.role==='admin'?'Đăng xuất':'Quản trị'}</button></div></header>
  <div class="content">${S.view==='directory'?directoryView():S.view==='results'?resultsView():adminView()}
  <div class="fine-print">Phiếu bình chọn phản ánh cảm nhận chủ quan, không phải thông tin xác minh hay kết luận chính thức. Không sử dụng kết quả để bôi nhọ, quy chụp hoặc phát tán thông tin cá nhân.</div></div></main></div>
${S.selected?detailModal():''}${S.editLeader!==null?leaderModal():''}${S.peekLeader?commentPeekModal():''}`;
}
function statCard(label,n,ico,klass){return `<div class="summary-card"><div><div class="label">${e(label)}</div><div class="value">${fnum(n)}</div></div><div class="summary-icon ${klass||''}">${icon(ico)}</div></div>`;}
function summary(){const o=S.overview||{},mine=S.leaders.filter(x=>x.my_vote!=null).length;return `<div class="summary-grid">${statCard('Tổ trưởng dân phố',o.leader_count??S.leaders.length,'people')}${statCard('Phường trong bản đồ',6,'pin','purple')}${statCard('Tổng lượt bình chọn',o.total_votes||0,'chart','orange')}${statCard(S.user.role==='admin'?'Người đã tham gia':S.user.role==='guest'?'Phường có dữ liệu':'Bạn đã bình chọn',S.user.role==='admin'?(o.participating_voters||0):S.user.role==='guest'?Object.values(o.wards||{}).filter(n=>n>0).length:mine,'check','green')}</div>`;}
function wards(){return WARDS;}
function filters(){return `<div class="filters"><div class="search-wrap">${icon('search')}<input id="search" class="search-input" type="search" placeholder="Tìm theo tên tổ trưởng, tổ/xóm, địa bàn cũ…" value="${e(S.q)}" aria-label="Tìm kiếm"></div>
<label class="etdp-ward-checkbox" title="Chọn phường trước, sau đó đánh dấu để xem danh sách đầy đủ"><input type="checkbox" id="ward-list-check" ${S.showWardList?'checked':''} aria-label="Hiển thị danh sách của phường đã chọn"><span>Danh sách phường</span></label>
<select class="select" id="ward-select" aria-label="Lọc theo phường"><option value="">Tất cả phường</option>${wards().map(w=>`<option value="${e(w)}" ${w===S.ward?'selected':''}>${e(w)}</option>`).join('')}</select>
<select class="select" id="sort-select" aria-label="Sắp xếp"><option value="area" ${S.sort==='area'?'selected':''}>Theo địa bàn</option><option value="votes" ${S.sort==='votes'?'selected':''}>Nhiều phiếu nhất</option><option value="name" ${S.sort==='name'?'selected':''}>Theo tên A – Z</option></select></div>`;}
function filtered(){if(norm(S.q).trim().length<2&&!S.showWardList)return [];let arr=S.leaders.filter(x=>(!S.ward||x.ward===S.ward)&&(!S.votedOnly||x.my_vote!==null)&&(norm(S.q).trim().length<2 || norm([x.name,x.area,x.ward,...x.aliases].join(' ')).includes(norm(S.q))));
const cmp=(a,b)=>a.localeCompare(b,'vi');
if(S.sort==='votes')arr.sort((a,b)=>b.votes-a.votes||cmp(a.ward,b.ward)||cmp(a.area,b.area));
else if(S.sort==='name')arr.sort((a,b)=>cmp(a.name,b.name));
else arr.sort((a,b)=>cmp(a.ward,b.ward)||cmp(a.area,b.area));return arr;}
function miniBar(counts,total){return `<div class="mini-chart" role="img" aria-label="Phân bố 4 mức đánh giá">${(counts||[0,0,0,0]).map((n,i)=>`<span class="c${i+1}" style="width:${total ? 100*n/total : 0}%"></span>`).join('')}</div>`;}
function phoneText(x){return String(x?.phone||'').trim();}
function dialHref(v){const dial=String(v||'').replace(/[^+0-9]/g,'');return /^\+?[0-9]{9,15}$/.test(dial)?`tel:${e(dial)}`:'';}
function phoneActions(x,compact=false){
 const number=phoneText(x),alt=String(x?.phone_alt||'').trim(),dial=dialHref(number);
 if(!number)return `<div class="etdp-phone-empty">${icon('phone',16)} Chưa có số điện thoại</div>`;
 return `<div class="etdp-phone-block ${compact?'compact':''}"><div class="etdp-phone-label">${icon('phone',16)} SỐ ĐIỆN THOẠI LIÊN HỆ</div><div class="etdp-phone-num">${e(number)}</div>${alt?`<div class="etdp-phone-alt">Số phụ: <strong>${e(alt)}</strong></div>`:''}<div class="etdp-phone-actions">${dial?`<a class="etdp-call-btn" href="${dial}">${icon('phone',16)} Gọi ngay</a>`:''}<button class="etdp-copy-btn" type="button" data-action="copy-phone" data-number="${e(number)}">${icon('file',15)} Sao chép</button></div></div>`;
}
function featuredLeader(){
 const q=norm(S.q).trim();
 const arr = (q.length>=2||S.showWardList)?filtered():S.leaders.filter(x=>!S.ward||x.ward===S.ward);
 return arr.find(x=>x.id===S.featuredId) || arr.find(x=>phoneText(x)) || arr[0] || null;
}
function featuredContact(){
 const x=featuredLeader();
 if(!x)return `<div class="etdp-feature-inner"><div class="etdp-feature-kicker">${icon('people',16)} HỒ SƠ LIÊN HỆ</div><div class="etdp-no-feature"><div class="etdp-feature-avatar">${icon('search',34)}</div><h3>Chọn một tổ trưởng để xem</h3><p>Tìm bằng họ tên hoặc tổ dân phố để hiển thị số điện thoại và đánh giá.</p></div></div>`;
 return `<div class="etdp-feature-inner" data-featured="${e(x.id)}"><div class="etdp-feature-kicker">${icon('people',16)} THÔNG TIN LIÊN HỆ</div><div class="etdp-feature-header"><div class="etdp-feature-avatar">${initial(x.name)}</div><div><div class="etdp-overline">TỔ TRƯỞNG DÂN PHỐ</div><h3>${e(x.name)}</h3><p>${icon('pin',15)} ${e(x.area)}</p><p>${icon('home',15)} ${e(x.ward)} · Ninh Bình</p></div></div>${phoneActions(x)}<div class="etdp-feature-footer"><span>${icon('chart',15)} ${fnum(x.votes)} lượt đánh giá</span><button class="etdp-feature-review" type="button" data-action="details" data-id="${e(x.id)}">${icon('arrow',16)} Đánh giá & chơi vui</button></div></div>`;
}
function personCard(x){
 const num=phoneText(x), dial=dialHref(num);
 return `<article class="etdp-directory-row"><div class="etdp-row-person"><span class="etdp-mini-avatar">${initial(x.name)}</span><div><strong>${e(x.name)}</strong><small>${e(x.id)}</small></div></div><span class="etdp-row-area">${e(x.area)}</span><span class="etdp-row-ward">${e(wardName(x.ward))}</span><div class="etdp-row-phone">${num?`<strong>${icon('phone',16)} ${e(num)}</strong>${x.phone_alt?`<small>Số phụ: ${e(x.phone_alt)}</small>`:''}`:'<small>Chưa cập nhật</small>'}</div><div class="etdp-row-comments"><button type="button" class="etdp-comment-count" data-action="peek-comments" data-id="${e(x.id)}" aria-label="Xem ${fnum(x.comments||0)} bình luận của ${e(x.name)}">${icon('message',16)} <b>${fnum(x.comments||0)}</b><span>bình luận</span></button></div><div class="etdp-row-actions">${dial?`<a href="${dial}" class="etdp-mini-call">${icon('phone',15)} Gọi</a>`:''}<button type="button" data-action="copy-phone" data-number="${e(num)}" ${num?'':'disabled'} aria-label="Sao chép số điện thoại">${icon('file',15)}</button><button type="button" data-action="details" data-id="${e(x.id)}" title="Mở hồ sơ và đánh giá">${icon('arrow',17)}</button></div></article>`;
}
function cardsGrid(){
 const ready=norm(S.q).trim().length>=2||S.showWardList,items=filtered();
 const rows=ready?(items.length?items.slice(0,S.listLimit).map(personCard).join('')+(items.length>S.listLimit?`<button class="btn btn-outline list-more" data-action="list-more">Xem thêm ${Math.min(80,items.length-S.listLimit)} người</button>`:''):'<div class="etdp-list-empty">Không tìm thấy tổ trưởng phù hợp.</div>'):`<div class="etdp-list-empty">${icon('search',22)} Nhập ít nhất 2 ký tự để tìm hoặc chọn phường và đánh dấu “Danh sách phường”.</div>`;
 return `<div class="count-caption">${ready?`Tìm thấy ${items.length} tổ trưởng phù hợp`:'Danh sách chỉ hiển thị khi tìm kiếm hoặc yêu cầu xem theo phường'}</div><div id="cards-grid" class="etdp-directory-grid"><div class="etdp-directory-th"><span>HỌ VÀ TÊN</span><span>TỔ DÂN PHỐ</span><span>PHƯỜNG</span><span>SỐ ĐIỆN THOẠI</span><span>BÌNH LUẬN</span><span>THAO TÁC</span></div>${rows}</div>`;
}
function miniRanking(){
 const mode=S.rankMode==='difficult'?'difficult':'easy',rs=S.rankings||{},min=rs.minimum_votes||5;
 const entries=(rs[mode]||[]).slice(0,6);
 return `<div class="home-rank-top"><div class="rank-eyebrow">${icon('trophy',17)} BẢNG XẾP HẠNG CỘNG ĐỒNG</div><h3>Tổ trưởng nổi bật</h3><p>Thống kê theo tỷ lệ trên ít nhất ${min} phiếu, chỉ để tham khảo.</p></div><div class="home-rank-tabs" role="group" aria-label="Loại bảng xếp hạng"><button type="button" data-action="rank-mode" data-value="easy" aria-pressed="${mode==='easy'}" class="${mode==='easy'?'active':''}">😊 Dễ tính</button><button type="button" data-action="rank-mode" data-value="difficult" aria-pressed="${mode==='difficult'}" class="${mode==='difficult'?'active':''}">🤨 Khó tính</button></div><div class="home-rank-results">${entries.length?entries.map((x,i)=>rankItem(x,i,mode)).join(''):`<div class="home-rank-empty">${icon('chart',25)}<b>Chưa đủ dữ liệu bình chọn</b><span>Cần tối thiểu ${min} phiếu cho một tổ trưởng để hiển thị.</span></div>`}</div><div class="home-rank-note">${icon('info',14)} Đây là đánh giá chủ quan; không phải nhận định chính thức về một cá nhân.</div><button class="rank-more" data-action="nav" data-value="results">Xem bảng xếp hạng đầy đủ ${icon('arrow',15)}</button>`;
}
function dashboardStat(iconName,num,label){return `<div class="etdp-stat-pill">${icon(iconName,20)}<div><strong>${fnum(num)}</strong><small>${e(label)}</small></div></div>`;}
function directoryView(){
 const o=S.overview||{};
 return `<section class="etdp-search-hero"><div class="etdp-search-title"><span class="etdp-eyebrow">E-TDP · NINH BÌNH · 6 PHƯỜNG</span><h1>Tra cứu tổ trưởng dân phố</h1><p>Tìm theo tên, tổ dân phố hoặc phường. Gọi điện nhanh và chia sẻ trải nghiệm phối hợp.</p></div><div class="etdp-search-bar">${filters()}<button type="button" data-action="search-now" class="etdp-search-submit">${icon('search',18)} Tìm ngay</button></div></section>
 <div class="etdp-dashboard-grid"><section class="etdp-map-panel">${mapView()}</section><section class="etdp-feature-panel" id="featured-contact">${featuredContact()}</section><aside class="etdp-ranked-panel" id="home-ranking">${miniRanking()}</aside></div>
 <section class="etdp-list-panel" id="directory-list"><div class="etdp-list-head"><div><div class="etdp-eyebrow">DANH BẠ ĐỊA BÀN</div><h2>Danh sách tổ trưởng theo phường</h2></div><div class="etdp-list-ward-actions">${WARDS.map((w,i)=>`<button type="button" class="etdp-list-ward ${S.ward===w?'active':''}" data-action="ward-list-pick" data-value="${e(w)}">${e(wardName(w))} <small>${fnum(o.wards?.[w]||0)}</small></button>`).join('')}</div></div>${cardsGrid()}</section><div class="etdp-end-note">${icon('shield',16)} Các nhận xét thể hiện cảm nhận chủ quan của người tham gia, không phải đánh giá chính thức về cá nhân.</div>`;
}
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
const COMMENT_STATES={pending:'Chờ duyệt',approved:'Đã công khai',hidden:'Đã ẩn',rejected:'Đã bị xóa'};
function adminCommentButtons(c,leaderName=''){
 const id=e(c.id),name=e(leaderName),s=c.status;
 if(s==='rejected')return '<span class="muted micro">Bình luận đã bị xóa khỏi khu vực công khai, nội dung chỉ quản trị viên được xem.</span>';
 if(s==='approved')return `<button type="button" class="btn btn-sm btn-danger" data-action="admin-delete-comment" data-id="${id}" data-leader="${name}">Xóa bình luận này</button>`;
 return `${s==='pending'||s==='hidden'?`<button type="button" class="btn btn-sm btn-primary" data-action="moderate" data-id="${id}" data-status="approved">${icon('check',14)} Duyệt</button>`:''}
  ${s==='pending'?`<button type="button" class="btn btn-sm" data-action="moderate" data-id="${id}" data-status="hidden">Ẩn</button>`:''}
  <button type="button" class="btn btn-sm btn-danger-soft" data-action="moderate" data-id="${id}" data-status="rejected">Từ chối</button>`;
}
function adminCommentsView(){
 const list=S.adminComments||[];
 const counts={all:list.length,pending:0,approved:0,hidden:0,rejected:0};
 for(const c of list){if(Object.hasOwn(counts,c.status))counts[c.status]++;}
 const filter=S.adminCommentFilter||'all';
 const filteredComments=filter==='all'?list:list.filter(c=>c.status===filter);
 const tabs=[['all','Tất cả'],['pending','Chờ duyệt'],['approved','Đã công khai'],['hidden','Đã ẩn'],['rejected','Đã bị xóa']];
 return `<div class="card-panel"><div class="section-head"><div><h3>Quản lý tất cả bình luận</h3><p>Hiển thị đầy đủ cả bình luận đã công khai, chưa duyệt, bị ẩn và đã bị xóa. Bình luận bị xóa vẫn lưu để đối chiếu.</p></div><span class="badge-status">${fnum(list.length)} bình luận</span></div>
 <div class="etdp-comment-tabs" role="group" aria-label="Lọc trạng thái bình luận">${tabs.map(([key,title])=>`<button type="button" class="etdp-comment-tab ${filter===key?'active':''}" data-action="admin-comments-filter" data-value="${key}" aria-pressed="${filter===key}">${title} <b>${fnum(counts[key])}</b></button>`).join('')}</div>
 <div class="moderation-list">${filteredComments.length?filteredComments.map(c=>`<div class="moderation-item"><div class="moderation-head"><strong>${icon('people',15)} Bình luận cho: ${e(c.leader_name)} <small>(Mã ${e(c.leader_id)})</small></strong><span class="mod-status status-${e(c.status)}">${COMMENT_STATES[c.status]||e(c.status)}</span></div><div class="muted micro">${e(c.area)} · ${e(c.ward)} · ${dateText(c.created_at)} ${c.reports?' · '+c.reports+' báo cáo':''}</div><p class="moderation-text">${e(c.body)}</p><div class="moderation-actions">${adminCommentButtons(c,c.leader_name)}</div></div>`).join(''):'<div class="notice">Không có bình luận ở trạng thái này.</div>'}</div></div>`;
}
function importPanel(){const preview=S.importResult;
return `<div class="excel-panel"><div class="excel-heading"><div><h4>Nhập danh sách tổ trưởng từ Excel</h4><p>Tải danh sách đang có về sửa hoặc lấy mẫu trống. Xem trước thay đổi rồi mới lưu vào Supabase.</p></div><div class="btn-row"><button class="btn btn-outline btn-sm" data-action="excel-blank">${icon('download',15)} Tải mẫu trống</button><button class="btn btn-outline btn-sm" data-action="excel-current">${icon('download',15)} Tải danh sách hiện tại</button></div></div><form id="excel-import-form"><label class="excel-upload"><span>${icon('upload',22)} Chọn file .xlsx</span><input type="file" id="excel-file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" required></label><button class="btn btn-primary" type="submit">Xem trước dữ liệu</button></form><p class="micro muted">Tối đa 500 dòng/lần, file không quá 2 MB. Cột Mã tổ trưởng dùng để cập nhật đúng người, tránh mất kết quả Vote.</p>
 ${preview?`<div class="excel-preview"><strong>Kết quả kiểm tra: ${preview.total} dòng</strong><div class="excel-stats"><span>Thêm mới: <b>${preview.create}</b></span><span>Cập nhật: <b>${preview.update}</b></span><span>Giữ nguyên: <b>${preview.skip}</b></span><span>Lỗi: <b>${preview.errors.length}</b></span></div>${preview.errors.length?`<ul class="excel-errors">${preview.errors.slice(0,12).map(x=>`<li>${e(x)}</li>`).join('')}</ul>`:''}<div class="btn-row"><button class="btn btn-primary" data-action="excel-commit" ${preview.errors.length||!(preview.create+preview.update)?'disabled':''}>${icon('check',15)} Xác nhận lưu ${preview.create+preview.update} dòng</button><button class="btn" data-action="excel-clear">Hủy xem trước</button></div></div>`:''}</div>`;
}
function adminView(){return `<div class="page-head"><div><span class="eyebrow">QUẢN TRỊ DỮ LIỆU</span><h1 class="page-title">Quản lý hệ thống</h1><p class="page-desc">Chỉnh sửa danh sách tổ trưởng và duyệt bình luận ẩn danh. Số điện thoại liên hệ được hiển thị cho cả khách tra cứu.</p></div></div>${summary()}
<div class="admin-tabs"><button data-action="admin-tab" data-value="leaders" class="${S.adminSection==='leaders'?'active':''}">Quản lý tổ trưởng</button><button data-action="admin-tab" data-value="comments" class="${S.adminSection==='comments'?'active':''}">Duyệt bình luận</button></div>
${S.adminSection==='comments'?adminCommentsView():`<div class="card-panel"><div class="section-head"><div><h3>Danh sách tổ trưởng <span class="muted">(${S.adminLeaders.length})</span></h3><p>Thêm người mới, khôi phục số điện thoại bằng Excel riêng, hoặc xuất danh sách để chỉnh sửa và nhập lại. Giữ nguyên mã ID để bảo toàn phiếu bình chọn.</p></div><button class="btn btn-primary" data-action="add-leader">${icon('plus',17)} Thêm tổ trưởng</button></div>${importPanel()}${leaderRows()}</div>`}`;}
function commentItems(leaderId){
 const rows=S.commentOwner===leaderId?S.comments.filter(c=>String(c.leader_id)===String(leaderId)):[];
 const isAdmin=S.user?.role==='admin';
 if(S.commentOwner!==leaderId)return `<div class="comment-empty"><span>Đang tải bình luận dành riêng cho hồ sơ này…</span></div>`;
 if(!rows.length)return `<div class="comment-empty">${icon('message',24)}<strong>Chưa có bình luận ${isAdmin?'nào':'được duyệt'}</strong><span>${isAdmin?'Bình luận mới sẽ hiện ở đây để bạn xem xét.':'Chỉ bình luận đã duyệt được công khai. Bạn có thể gửi bình luận sau khi đánh giá.'}</span></div>`;
 const owner=S.leaders.find(x=>String(x.id)===String(leaderId));
 return rows.map(c=>`<article class="comment-item" id="comment-${c.id}"><div class="comment-top"><span class="anon-avatar">${icon('shield',15)}</span><div><strong>Người bình luận ẩn danh ${!isAdmin&&c.is_mine?'<span class="my-marker">· của bạn</span>':''}</strong><div class="muted micro">${dateText(c.created_at)}</div></div>${isAdmin||c.status!=='approved'?`<span class="comment-pending comment-status-${e(c.status)}">${COMMENT_STATES[c.status]||'Đang xem xét'}</span>`:''}</div><p class="comment-text">${e(c.body)}</p><div class="comment-tools">${isAdmin?adminCommentButtons(c,owner?.name||''):c.is_mine&&c.status==='pending'?`<button type="button" data-action="remove-comment" data-id="${c.id}">Hủy bình luận chờ duyệt</button>`:c.status==='approved'&&!c.is_mine&&S.user?.role==='voter'?`<button type="button" data-action="report-comment" data-id="${c.id}">${icon('flag',12)} Báo cáo</button>`:''}</div></article>`).join('');
}
function detailModal(){
 const x=S.leaders.find(l=>l.id===S.selected);if(!x)return '';
 const counts=x.counts||[0,0,0,0],locked=x.my_vote!=null,selectedLevel=locked?x.my_vote:S.pendingLevel;
 const commentReady=S.commentOwner===x.id;
 const commentTotal=commentReady?S.commentTotal:null;
 const commentList=commentReady?S.comments.filter(c=>String(c.leader_id)===String(x.id)):[];
 const canComment=['voter','admin'].includes(S.user.role)&&locked;
 return `<div class="modal-bg" data-action="close-bg"><div class="modal modal-profile v5-profile" role="dialog" aria-modal="true" aria-labelledby="detail-title" data-leader-id="${e(x.id)}">
 <div class="profile-banner"><div class="profile-kicker">TRẢI NGHIỆM PHỐ MÌNH <span>${e(wardName(x.ward))} · Ninh Bình</span></div><div class="profile-title-line"><span class="profile-avatar">${initial(x.name)}</span><div class="profile-title-text"><span class="profile-tag">TỔ TRƯỞNG DÂN PHỐ</span><h2 id="detail-title">${e(x.name)}</h2><p>${icon('pin',15)} ${e(x.area)} · ${e(x.ward)}</p>${phoneActions(x,'compact')}</div><button class="icon-btn profile-close" data-action="close-modal" aria-label="Đóng cửa sổ">×</button></div><div class="profile-metrics"><span>${icon('users',16)} <b>${fnum(x.votes)}</b> phiếu</span><button type="button" class="profile-read-comments" data-action="read-comments" aria-label="Đọc nội dung bình luận của tổ trưởng này">${icon('message',16)} <b>Đọc bình luận (${commentReady?fnum(commentTotal):'đang tải…'})</b> ${icon('arrow',14)}</button></div></div>
 <div class="v5-layout"><section class="vote-play"><div class="profile-section-head"><span class="eyebrow">01 / BÌNH CHỌN MỘT LẦN</span><h3>Gặp bác tổ trưởng, bạn cảm thấy thế nào?</h3><p>Chọn một cảm xúc rồi nhấn xác nhận để lưu phiếu ngay. Sau khi xác nhận, bạn <strong>không thể chọn lại, đổi mức hoặc hủy phiếu</strong>. Trò chơi không ảnh hưởng kết quả.</p></div>
 ${['voter','admin'].includes(S.user.role)?`<div class="v5-options">${LABELS.map((label,i)=>`<button type="button" class="v5-option ${selectedLevel===i+1?'selected':''}" data-action="choose" data-level="${i+1}" style="--state-color:${COLORS[i]}" aria-pressed="${selectedLevel===i+1}" ${locked||S.isSaving?'disabled':''}><span class="face-emoji">${['😊','😐','🤨','😠'][i]}</span><b>${e(label)}</b></button>`).join('')}</div>
 ${locked?`<div class="vote-locked-notice" role="status" aria-live="polite">${icon('lock',19)}<div><strong>Đã xác nhận và khóa phiếu</strong><p>Đánh giá của bạn: <b>${e(LABELS[x.my_vote-1])}</b>. Bạn không thể đổi hoặc hủy lựa chọn. Trò chơi dưới đây chỉ để giải trí.</p></div></div>`:S.pendingLevel!=null?`<div class="vote-confirm-box" role="group" aria-labelledby="vote-confirm-title" aria-describedby="vote-confirm-desc"><div class="vote-confirm-icon">${icon('lock',22)}</div><div class="vote-confirm-content"><h4 id="vote-confirm-title">Xác nhận đánh giá của bạn</h4><p>Bạn đã chọn: <b>${e(LABELS[S.pendingLevel-1])}</b></p><p id="vote-confirm-desc">Khi xác nhận, hệ thống ghi ngay <strong>1 phiếu duy nhất</strong> cho tổ trưởng này và khóa vĩnh viễn theo phiên của bạn. Không thể sửa, chọn lại hoặc hủy.</p><div class="vote-confirm-actions"><button type="button" class="btn btn-outline btn-sm" data-action="cancel-vote-confirm" ${S.isSaving?'disabled':''}>Quay lại chọn</button><button type="button" class="btn btn-primary btn-sm" data-action="confirm-vote" ${S.isSaving?'disabled':''}>${icon('check',16)} Xác nhận và khóa đánh giá</button></div></div></div>`:`<div class="vote-select-hint">${icon('info',16)} Chọn mức trải nghiệm để mở bước xác nhận. Chưa có phiếu nào được ghi khi bạn chỉ mở hồ sơ.</div>`}
 <div class="journey-legend" aria-label="Trò chơi giải trí"><strong>🎮 Vượt ải tổ trưởng</strong><span>Giúp tờ giấy vượt chướng ngại cho vui. Kết quả trò chơi <b>không tạo thêm hoặc thay đổi phiếu</b>.</span></div>
 ${locked?`<div class="game-frame journey-frame"><canvas id="journey-game" tabindex="0" aria-label="Trò chơi vượt ải giải trí, không ảnh hưởng kết quả đã bình chọn" role="img"></canvas><div class="journey-progress" aria-hidden="true"><span id="journey-progress-bar" style="width:0%"></span></div><div class="game-buttons journey-controls"><span class="journey-tip">🎮 Chạm màn chơi / phím ↑ / Space để nhảy</span><div class="journey-actions"><button class="btn btn-outline" data-action="game-jump" disabled>↥ Nhảy</button><button class="btn btn-primary" data-action="game-start">▶ Bắt đầu chơi</button></div></div></div><div class="game-notice" id="game-status" role="status" aria-live="polite">Phiếu đã khóa. Bạn có thể chơi bao nhiêu lần tùy thích, kết quả không đổi.</div>`:`<div class="game-locked-note">${icon('lock',23)}<div><strong>Trò chơi sẽ mở sau khi xác nhận bình chọn</strong><p>Không cần chơi mới được đánh giá. Xác nhận xong là phiếu được lưu và bạn có thể chơi cho vui.</p></div></div>`}
 <div class="journey-help"><span>🍀 Bác tổ trưởng trong trò chơi là nhân vật hoạt hình hư cấu.</span><span>🔐 Mỗi phiên ẩn danh chỉ có <b>1 phiếu đã khóa</b> cho mỗi tổ trưởng.</span></div>`:`<div class="notice">Vui lòng mở phiên bình chọn để tham gia.</div>`}
 </section><aside class="vote-insights"><div class="profile-section-head"><span class="eyebrow">02 / KẾT QUẢ</span><h3>Ý kiến cộng đồng</h3><p>${fnum(x.votes)} phiếu đã ghi nhận</p></div>${x.revealed&&x.votes?LABELS.map((l,i)=>`<div class="result-row"><div><div class="title"><span>${e(l)}</span><span>${fnum(counts[i])} phiếu</span></div><div class="bar"><span style="width:${counts[i]*100/x.votes}%;background:${COLORS[i]}"></span></div></div><div class="percent">${percent(counts[i],x.votes)}%</div></div>`).join(''):`<div class="notice orange">${x.votes===0?'Chưa có lượt bình chọn.':'Chỉ công bố tỷ lệ khi đủ ít nhất 3 phiếu.'}</div>`}
 <div class="profile-section-head"><span class="eyebrow">03 / BÌNH LUẬN ẨN DANH</span><h3>Góc chia sẻ</h3><p>Chỉ gửi bình luận sau khi phiếu đã được xác nhận; mọi bình luận đều qua kiểm duyệt.</p></div>
 ${canComment?`<form id="comment-form" class="comment-compose"><div class="comment-compose-top"><span class="anon-avatar">${icon('shield',16)}</span><div><strong>Người bình luận ẩn danh</strong><small>Không hiển thị danh tính công khai</small></div></div><textarea id="comment-text" name="body" required minlength="5" maxlength="700" rows="4" placeholder="Chia sẻ một trải nghiệm cụ thể, lịch sự…">${e(S.commentDraft)}</textarea><div class="compose-foot"><small><span id="comment-length">${S.commentDraft.length}</span>/700 ký tự</small><button class="btn btn-primary btn-sm" type="submit">Gửi chờ duyệt</button></div></form>`:`<div class="notice">🔒 ${['voter','admin'].includes(S.user.role)?'Hãy chọn mức trải nghiệm và xác nhận để gửi bình luận.':'Chỉ người đã có phiên bình chọn mới có thể gửi bình luận.'}</div>`}
 <div id="leader-comments-panel" class="etdp-comments-panel" tabindex="-1" data-comment-leader="${e(x.id)}"><div class="comment-owner"><strong>${icon('people',17)} Bình luận dành riêng cho: ${e(x.name)}</strong><small>${e(x.area)} · ${e(wardName(x.ward))} · Mã ${e(x.id)}</small></div><div class="comment-list-head"><h4>${S.user.role==='admin'?'Tất cả bình luận của tổ trưởng này':'Nội dung bình luận đã duyệt'}</h4><span>${S.user.role==='admin'?`${fnum(commentList.length)} bình luận · ${fnum(commentTotal)} công khai`:`${fnum(commentTotal)} công khai`}</span></div><div class="comment-list" aria-live="polite">${commentItems(x.id)}</div></div><div class="safe-comment-note">Nhận xét là cảm nhận chủ quan. Không đăng số điện thoại, thông tin cá nhân hoặc nội dung xúc phạm.</div></aside></div></div></div>`;
}
function commentPeekModal(){
 const owner=S.leaders.find(x=>x.id===S.peekLeader);
 if(!owner)return '';
 const isAdmin=S.user?.role==='admin';
 const more=S.peekComments.length<S.peekTotal;
 const labels=COMMENT_STATES;
 return `<div class="modal-bg etdp-peek-bg" data-action="close-peek-bg"><div class="modal etdp-peek-modal" role="dialog" aria-modal="true" aria-labelledby="peek-title" data-leader-id="${e(owner.id)}"><div class="modal-head"><div><div class="etdp-eyebrow">BÌNH LUẬN THEO TỔ TRƯỞNG</div><h2 id="peek-title">${e(owner.name)}</h2><p>${e(owner.area)} · ${e(owner.ward)} · Mã ${e(owner.id)}</p></div><button type="button" class="icon-btn" data-action="close-peek" aria-label="Đóng">×</button></div>
 <div class="etdp-peek-body"><div class="etdp-peek-overview">${icon('message',18)} <b>${fnum(S.peekTotal)}</b> ${isAdmin?'bình luận ở tất cả trạng thái':'bình luận hiển thị'} <small>${isAdmin?'Quản trị xem cả bình luận chưa duyệt.':'Chỉ bình luận đã duyệt được công khai.'}</small></div>
 <div class="etdp-peek-list">${S.peekComments.map(c=>`<article class="etdp-peek-item"><div class="etdp-peek-item-head"><span>Ẩn danh · ${dateText(c.created_at)}</span>${isAdmin?`<span class="mod-status status-${e(c.status)}">${labels[c.status]||c.status}</span>`:''}</div><p>${e(c.body)}</p>${isAdmin?`<div class="etdp-peek-actions">${adminCommentButtons(c,owner.name)}</div>`:''}</article>`).join('')}${!S.peekLoading&&!S.peekComments.length?`<div class="notice">${isAdmin?'Tổ trưởng này chưa có bình luận.':'Chưa có bình luận nào được duyệt.'}</div>`:''}</div>
 ${S.peekLoading?'<div class="etdp-peek-loading" role="status">Đang tải bình luận…</div>':''}
 ${more&&!S.peekLoading?`<button type="button" class="btn btn-outline etdp-peek-more" data-action="peek-more">Hiển thị thêm bình luận (${fnum(S.peekTotal-S.peekComments.length)} còn lại)</button>`:''}
 </div></div></div>`;
}
function renderPeekOnly(){
 const current=app.querySelector(':scope > .etdp-peek-bg .etdp-peek-body');
 const scrollTop=current?.scrollTop||0;
 app.querySelectorAll(':scope > .etdp-peek-bg').forEach(el=>el.remove());
 if(S.peekLeader){
  app.insertAdjacentHTML('beforeend',commentPeekModal());
  const next=app.querySelector(':scope > .etdp-peek-bg .etdp-peek-body');
  if(next)next.scrollTop=scrollTop;
 }
}
function closePeek(){S.peekRequestSeq++;S.peekLeader=null;S.peekComments=[];S.peekTotal=0;S.peekOffset=0;S.peekLoading=false;renderPeekOnly();}
async function loadPeekPage(reset=false){
 if(!S.peekLeader||S.peekLoading)return;
 const lid=S.peekLeader,seq=++S.peekRequestSeq;
 const offset=reset?0:S.peekComments.length;
 S.peekLoading=true;renderPeekOnly();
 try{
  const path=(S.user.role==='guest'?'/api/public/comment-pages':'/api/comment-pages')+'?leader_id='+encodeURIComponent(lid)+'&limit=5&offset='+offset;
  const result=await req(path);
  if(seq!==S.peekRequestSeq||S.peekLeader!==lid)return;
  if(String(result.leader_id)!==lid||String(result.leader?.id)!==lid||!Array.isArray(result.comments)||result.comments.some(c=>String(c.leader_id)!==lid))throw Error('Phản hồi bình luận không thuộc tổ trưởng này.');
  S.peekComments=reset?result.comments:[...S.peekComments,...result.comments];
  S.peekTotal=Number(result.total)||0;
  S.peekOffset=S.peekComments.length;
 }catch(err){if(S.peekLeader===lid)showToast(err.message);}
 finally{if(seq===S.peekRequestSeq&&S.peekLeader===lid){S.peekLoading=false;renderPeekOnly();}}
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
function onJourneyComplete(){
 // Trò chơi không gửi API bình chọn, không thay đổi phiếu đã khóa.
 showToast('🎉 Tờ giấy đã tới nơi! Đây chỉ là trò chơi giải trí, phiếu bình chọn không thay đổi.');
}
function mountVisibleGame(){
 const canvas=document.getElementById('journey-game');
 if(!canvas||!['voter','admin'].includes(S.user?.role))return;
 const start=document.querySelector('[data-action="game-start"]');
 const jump=document.querySelector('[data-action="game-jump"]');
 window.TDPGame?.mount(canvas,{
  level:S.leaders.find(l=>l.id===S.selected)?.my_vote||2,
  onComplete:onJourneyComplete,
  onProgress:p=>{const el=document.getElementById('journey-progress-bar');if(el)el.style.width=p+'%';},
  onStatus:message=>{const el=document.getElementById('game-status');if(el)el.textContent=message;},
  onState:state=>{if(start){start.disabled=state==='running';start.textContent=state==='running'?'Đang vượt ải…':state==='idle'?'▶ Bắt đầu chơi':'↻ Chơi lại cho vui';}if(jump)jump.disabled=state!=='running';}
 });
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
function rerenderCards(){
 const wrap=document.querySelector('#directory-list');if(!wrap)return;
 const list=cardsGrid();
 const old=document.querySelector('.count-caption'),table=document.querySelector('#cards-grid');
 const tmp=document.createElement('div');tmp.innerHTML=list;
 if(old)old.replaceWith(tmp.querySelector('.count-caption'));
 if(table)table.replaceWith(tmp.querySelector('#cards-grid'));
}
async function refresh(){await loadMain();if(S.view==='admin')await loadAdmin();render();}
async function copyText(txt){try{await navigator.clipboard.writeText(txt);showToast('Đã sao chép.');}catch(err){const ta=document.createElement('textarea');ta.value=txt;ta.style.position='fixed';ta.style.left='-9999px';document.body.appendChild(ta);ta.select();let ok=document.execCommand('copy');ta.remove();showToast(ok?'Đã sao chép.':'Không thể sao chép tự động. Hãy chọn và sao chép mã trên màn hình.');}}
async function onClick(ev){const b=ev.target.closest('[data-action]');if(!b)return;
const act=b.dataset.action;
const remoteActions=new Set(['guest','nav','logout','details','confirm-vote','admin-tab','moderate','remove-comment','admin-delete-comment','peek-comments','peek-more','report-comment','excel-commit','export']);
if(b.getAttribute('aria-busy')==='true')return;
if(remoteActions.has(act)){b.setAttribute('aria-busy','true');b.classList.add('is-busy');}
try{
if(act==='copy-phone'){if(b.dataset.number)await copyText(b.dataset.number);return;}
if(act==='peek-comments'){
 const id=b.dataset.id;if(!S.leaders.some(l=>l.id===id))return;
 S.peekLeader=id;S.peekComments=[];S.peekOffset=0;S.peekTotal=0;S.peekLoading=false;renderPeekOnly();await loadPeekPage(true);return;
}
if(act==='peek-more'){await loadPeekPage(false);return;}
if(act==='close-peek'){closePeek();return;}
if(act==='close-peek-bg'){if(ev.target===b)closePeek();return;}
if(act==='admin-comments-filter'){
 if(S.user.role!=='admin')return;
 S.adminCommentFilter=b.dataset.value;render();return;
}
if(act==='admin-delete-comment'){
 if(S.user.role!=='admin')throw Error('Chỉ quản trị viên được xóa bình luận.');
 const id=b.dataset.id;
 if(!window.confirm('Xóa bình luận này khỏi khu vực công khai của '+(b.dataset.leader||'tổ trưởng')+'? Nội dung vẫn được lưu riêng cho quản trị viên để kiểm tra.'))return;
 await req('/api/admin/comments/'+encodeURIComponent(id),'DELETE');
 await Promise.all([loadMain(),loadAdmin()]);
 if(S.peekLeader){const leader=S.peekLeader;S.peekRequestSeq++;S.peekComments=[];S.peekTotal=0;S.peekLoading=false;await loadPeekPage(true);}
 if(S.selected){await loadComments(S.selected);}
 render();showToast('Đã bị xóa: khách sẽ không còn nhìn thấy bình luận.');return;
}
if(act==='search-now'){S.listLimit=80;rerenderCards();document.getElementById('directory-list')?.scrollIntoView({behavior:'smooth',block:'start'});return;}
if(act==='ward-list-pick'){S.ward=b.dataset.value;S.showWardList=Boolean(S.ward);S.listLimit=80;render();document.getElementById('directory-list')?.scrollIntoView({behavior:'smooth',block:'start'});return;}
if(act==='map-ward'){S.ward=b.dataset.value;S.q='';S.listLimit=80;S.showWardList=false;S.view='directory';render();document.getElementById('directory-list')?.scrollIntoView({behavior:'smooth',block:'start'});document.getElementById('search')?.focus({preventScroll:true});return;}
if(act==='map-all'){S.ward='';S.q='';S.showWardList=false;S.listLimit=80;S.view='directory';render();return;}
if(act==='rank-mode'){S.rankMode=b.dataset.value==='difficult'?'difficult':'easy';const panel=document.getElementById('home-ranking');if(panel)panel.innerHTML=miniRanking();return;}
if(act==='sidebar-toggle'){if(window.matchMedia('(max-width:850px)').matches){S.mobileNav=!S.mobileNav;}else{S.sidebarCollapsed=!S.sidebarCollapsed;try{localStorage.setItem('etdp-sidebar',S.sidebarCollapsed?'1':'0');}catch(_){}}const shell=document.querySelector('.shell');shell?.classList.toggle('sidebar-collapsed',S.sidebarCollapsed);shell?.classList.toggle('mobile-nav-open',S.mobileNav);return;}
if(act==='sidebar-close'){S.mobileNav=false;document.querySelector('.shell')?.classList.remove('mobile-nav-open');return;}
if(act==='ward-list-toggle'){S.showWardList=!S.showWardList;S.listLimit=80;render();return;}
if(act==='list-more'){S.listLimit+=80;rerenderCards();return;}
if(act==='show-login'){S.user=null;render();return;}
if(act==='guest'){const r=await req('/api/me');S.user=r.user||GUEST;S.loginError='';await loadMain();render();return;}

if(act==='nav'){S.view=b.dataset.value;S.mobileNav=false;if(S.view==='admin')await loadAdmin();render();return;}
if(act==='logout'){await req('/api/logout','POST',{});const r=await req('/api/me');S.user=r.user||GUEST;S.selected=null;clearLeaderComments();S.editLeader=null;await loadMain();render();return;}
if(act==='voted-only'){S.votedOnly=!S.votedOnly;render();return;}
if(act==='read-comments'){const target=document.getElementById('leader-comments-panel');if(target){target.scrollIntoView({behavior:'smooth',block:'start'});target.focus({preventScroll:true});}return;}
if(act==='details'){closePeek();const id=b.dataset.id;S.selected=id;S.draftVote=S.leaders.find(l=>l.id===id)?.my_vote??null;S.pendingLevel=null;S.commentDraft='';clearLeaderComments();renderDialogOnly();try{if(await loadComments(id))renderDialogOnly();}catch(err){if(S.selected===id)showToast(err.message);}return;}
if(act==='close-modal'){closePeek();S.selected=null;S.editLeader=null;S.pendingLevel=null;clearLeaderComments();renderDialogOnly();return;}
if(act==='close-bg'){if(ev.target===b){S.selected=null;S.editLeader=null;S.pendingLevel=null;clearLeaderComments();renderDialogOnly();}return;}
if(act==='choose'){
 const x=S.leaders.find(l=>l.id===S.selected);
 if(!x||x.my_vote!=null){showToast('Đánh giá đã được khóa; không thể lựa chọn lại.');return;}
 if(S.isSaving)return;
 const level=Number(b.dataset.level);
 if(![1,2,3,4].includes(level))return;
 S.pendingLevel=level;renderDialogOnly();
 document.querySelector('[data-action="confirm-vote"]')?.focus({preventScroll:true});return;
}
if(act==='cancel-vote-confirm'){if(S.isSaving)return;S.pendingLevel=null;renderDialogOnly();return;}
if(act==='confirm-vote'){
 const lid=S.selected,level=S.pendingLevel,x=S.leaders.find(l=>l.id===lid);
 if(S.isSaving)return;
 if(!x||x.my_vote!=null){showToast('Phiếu đã được khóa.');return;}
 if(![1,2,3,4].includes(level))throw Error('Bạn chưa chọn mức đánh giá.');
 S.isSaving=true;b.disabled=true;
 try{
  await req('/api/vote','POST',{leader_id:lid,level,confirmed:true});
  S.pendingLevel=null;S.draftVote=level;
  await loadMain();
  if(S.selected===lid){await loadComments(lid);renderDialogOnly();}
  showToast('🔒 Đã ghi nhận và khóa phiếu! Không thể đổi mức hoặc hủy. Trò chơi hiện chỉ để giải trí.');
 }catch(err){
  // Khi mạng ngắt ngay sau khi ghi phiếu hoặc người dùng nhấn ở hai thiết bị,
  // hãy đọc lại dữ liệu máy chủ để xác định trạng thái đã khóa.
  try{await loadMain();if(S.selected===lid){await loadComments(lid);renderDialogOnly();}}catch(_){/* keep original error */}
  throw err;
 }finally{S.isSaving=false;b.disabled=false;}
 return;
}
if(act==='game-start'){if(S.leaders.find(l=>l.id===S.selected)?.my_vote!=null)window.TDPGame?.start();return;}
if(act==='game-jump'){window.TDPGame?.jump();return;}
if(act==='admin-tab'){S.adminSection=b.dataset.value;await loadAdmin();render();return;}
if(act==='moderate'){
 if(S.user.role!=='admin')throw Error('Chỉ quản trị viên được kiểm duyệt bình luận.');
 const action=b.dataset.status;
 if(action==='rejected'&&!window.confirm('Từ chối bình luận này? Bình luận sẽ bị xóa khỏi phần công khai, nhưng quản trị vẫn xem được với nhãn Đã bị xóa.'))return;
 const result=await req('/api/admin/comments/'+b.dataset.id,'PUT',{status:action});
 await Promise.all([loadMain(),loadAdmin()]);
 if(S.selected)await loadComments(S.selected);
 if(S.peekLeader){const lid=S.peekLeader;S.peekRequestSeq++;S.peekComments=[];S.peekTotal=0;S.peekLoading=false;await loadPeekPage(true);}
 render();showToast(result.label||'Đã cập nhật trạng thái bình luận.');return;
}
if(act==='remove-comment'){
 const own=S.comments.find(c=>String(c.id)===String(b.dataset.id));
 if(S.user.role==='admin')throw Error('Quản trị viên hãy xóa bằng chức năng quản trị.');
 if(!own||!own.is_mine||own.status!=='pending')throw Error('Bạn chỉ được hủy bình luận của mình khi đang chờ duyệt.');
 if(!window.confirm('Hủy bình luận đang chờ duyệt?'))return;
 await req('/api/comments/'+b.dataset.id,'DELETE');
 if(S.selected)await loadComments(S.selected);
 await loadMain();if(S.selected)renderDialogOnly();else render();showToast('Đã hủy bình luận chờ duyệt.');return;
}
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
app.addEventListener('input',ev=>{if(ev.target.id==='search'){S.q=ev.target.value;S.listLimit=80;rerenderCards();const node=document.getElementById('featured-contact');if(node)node.innerHTML=featuredContact();}
  if(ev.target.id==='comment-text'){S.commentDraft=ev.target.value;const counter=document.getElementById('comment-length');if(counter)counter.textContent=S.commentDraft.length;}});
app.addEventListener('change',ev=>{
 if(ev.target.id==='ward-list-check'){
  if(ev.target.checked&&!S.ward){ev.target.checked=false;showToast('Hãy chọn một phường trước khi bật danh sách.');return;}
  S.showWardList=ev.target.checked;S.listLimit=80;rerenderCards();return;
 }
 if(ev.target.id==='ward-select'){
  S.ward=ev.target.value;if(!S.ward)S.showWardList=false;
  const chk=document.getElementById('ward-list-check');if(chk)chk.checked=S.showWardList;
  S.listLimit=80;rerenderCards();const node=document.getElementById('featured-contact');if(node)node.innerHTML=featuredContact();return;
 }
 if(ev.target.id==='sort-select'){S.sort=ev.target.value;rerenderCards();}
});
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
window.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&S.peekLeader){closePeek();return;}if(ev.key==='Escape'&&S.mobileNav){S.mobileNav=false;render();return;}if(ev.key==='Escape'&&(S.selected||S.editLeader!==null)){S.selected=null;S.editLeader=null;clearLeaderComments();renderDialogOnly();}});
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
