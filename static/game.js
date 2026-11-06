/* E-TDP V6 — Vượt ải tổ trưởng: một tờ giấy vượt đường đi, một phiếu cho mỗi người.
 * Game hoạt hình hư cấu; không có vũ khí hay va chạm với nhân vật.
 */
(()=>{'use strict';
const WIDTH=960, HEIGHT=400, GROUND=312;
const MODES=[
 {sky:['#d4f4ed','#f6fff8'],terrain:'#e2f4cf',hill:'#a5d9b9',road:'#f3d79d',ink:'#178b66',weather:'sun',title:'Con đường thênh thang',desc:'Thủ tục suôn sẻ, bác đón giấy bằng nụ cười',obstacles:[]},
 {sky:['#d9edff','#f4faff'],terrain:'#d9e9ca',hill:'#a5cbe0',road:'#f5d49e',ink:'#386db2',weather:'cloud',title:'Vài khúc cua nho nhỏ',desc:'Bình thường, làm việc vẫn ổn áp',obstacles:[{x:386,type:'folder'}]},
 {sky:['#e9e7ff','#fff7e7'],terrain:'#e9e2be',hill:'#b0bfd4',road:'#edc88c',ink:'#b47b22',weather:'mixed',title:'Lúc nắng lúc mưa',desc:'Có chút vòng vèo, nhưng vẫn đến đích',obstacles:[{x:314,type:'puddle'},{x:568,type:'folder'}]},
 {sky:['#e5e4f9','#fdf2e5'],terrain:'#d6dec9',hill:'#aaabbf',road:'#e5c28d',ink:'#bd626c',weather:'rain',title:'Một hành trình quanh co',desc:'Hơi nhiều chướng ngại, giấy vẫn tới nơi',obstacles:[{x:300,type:'folder'},{x:460,type:'puddle'},{x:615,type:'folder'}]}
];
let active=null;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function mount(canvas,options={}){
 if(active)active.destroy();
 const ctx=canvas.getContext('2d');if(!ctx)return null;
 const dpr=clamp(window.devicePixelRatio||1,1,2);
 const VIEW_W=window.matchMedia('(max-width:650px)').matches?640:WIDTH;
 canvas.style.aspectRatio=VIEW_W+'/'+HEIGHT;
 canvas.width=Math.round(VIEW_W*dpr);canvas.height=Math.round(HEIGHT*dpr);
 ctx.setTransform(dpr,0,0,dpr,0,0);
 let level=clamp(Number(options.level)||1,1,4);
 let state='idle',x=102,vY=0,jumpY=0,crashes=0,clock=0,flash=0,particles=[],last=0;
 let raf=0,alive=true,finishing=false,lastUpdate=0,announced=new Set();
 const frameInterval=VIEW_W===WIDTH?25:33; // 30–40 fps to reduce GPU/CPU load on phones.
 const elder=new Image();elder.decoding='async';
 function reloadMascot(){elder.src=`/static/assets/mascots/mascot-${level}.svg`;}
 reloadMascot();
 function inform(msg){options.onStatus?.(msg);}
 function progress(){options.onProgress?.(Math.round(clamp((x-102)/690,0,1)*100));}
 function reset(){x=102;vY=0;jumpY=0;clock=0;flash=0;crashes=0;particles=[];announced.clear();state='idle';finishing=false;progress();inform('Chọn mức trải nghiệm, bấm “Bắt đầu vượt ải” rồi chạm màn chơi để nhảy.');}
 function start(){if(!alive||finishing)return false;if(state==='running')return false;
  x=102;vY=0;jumpY=0;clock=0;crashes=0;particles=[];announced.clear();state='running';progress();inform('Tờ giấy đang lên đường! Chạm vào cảnh hoặc bấm Nhảy để vượt vật cản.');options.onState?.('running');return true;
 }
 function jump(){if(!alive||state!=='running'||jumpY>3)return false;
  vY=475;jumpY=0.1;options.onState?.('jump');return true;
 }
 function setLevel(n){n=Number(n);if(n<1||n>4||n===level)return;
  level=n;reloadMascot();reset();options.onState?.('idle');
 }
 function bump(t){flash=.4;crashes++;for(let i=0;i<9;i++)particles.push({x:x,y:GROUND-25,vx:(i-4)*42,vy:-50-Math.random()*100,life:.55});
  inform(['Ôi, kẹp giấy! Đường vẫn đi được.','Úi, lỡ dẫm vũng mực!','Giấy hơi nhàu nhưng không sao!'][crashes%3]);
 }
 function onPointer(ev){if(state==='running'){ev.preventDefault();jump();}}
 function onKey(ev){if(!alive||!document.contains(canvas))return;
  if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;
  if((ev.key===' '||ev.key==='ArrowUp')&&(document.activeElement===canvas||canvas.closest('.modal')?.contains(document.activeElement))){ev.preventDefault();if(state==='idle')start();else jump();}
 }
 canvas.addEventListener('pointerdown',onPointer);window.addEventListener('keydown',onKey);
 const circle=(cx,cy,r,fill)=>{ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();};
 const round=(x,y,w,h,r,fill)=>{ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();};
 function cloud(cx,cy,size=1){ctx.fillStyle='#fff';circle(cx,cy,18*size,'#fff');circle(cx+18*size,cy-7*size,22*size,'#fff');circle(cx+37*size,cy,17*size,'#fff');round(cx-7*size,cy-1*size,55*size,16*size,7*size,'#fff');}
 function scene(){const m=MODES[level-1];const grad=ctx.createLinearGradient(0,0,0,HEIGHT);grad.addColorStop(0,m.sky[0]);grad.addColorStop(1,m.sky[1]);ctx.fillStyle=grad;ctx.fillRect(0,0,WIDTH,HEIGHT);
  ctx.fillStyle=m.hill;ctx.beginPath();ctx.moveTo(0,230);ctx.bezierCurveTo(130,120,240,207,365,162);ctx.bezierCurveTo(535,100,670,210,960,142);ctx.lineTo(960,HEIGHT);ctx.lineTo(0,HEIGHT);ctx.fill();
  ctx.fillStyle=m.terrain;ctx.fillRect(0,290,WIDTH,110);
  cloud(88+Math.sin(clock*.3)*10,58,.75);cloud(425,85,.52);if(level>=2)cloud(615,49,.7);
  if(m.weather==='sun'){circle(720,55,28,'#ffda77');for(let i=0;i<9;i++){let a=i*Math.PI*2/9;ctx.strokeStyle='#fac965';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(720+Math.cos(a)*38,55+Math.sin(a)*38);ctx.lineTo(720+Math.cos(a)*47,55+Math.sin(a)*47);ctx.stroke();}}
  if(m.weather==='mixed'||m.weather==='rain'){const n=m.weather==='rain'?30:13;ctx.strokeStyle='#779fd3aa';ctx.lineWidth=2;for(let i=0;i<n;i++){let px=((i*79+clock*45)%960),py=36+(i*43%205);ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px-7,py+15);ctx.stroke();}}
  // A wide continuous path, with subtle bends; obstacles never prevent recording a vote.
  ctx.strokeStyle=m.road;ctx.lineWidth=77;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(60,GROUND);ctx.bezierCurveTo(320,GROUND-7,550,GROUND+5,820,GROUND);ctx.stroke();
  ctx.strokeStyle='#fff9df';ctx.lineWidth=2.5;ctx.setLineDash([12,14]);ctx.beginPath();ctx.moveTo(60,GROUND);ctx.lineTo(835,GROUND);ctx.stroke();ctx.setLineDash([]);
  // plants along the way
  for(let i=0;i<6;i++){const px=58+i*132;ctx.fillStyle='#68ad79';circle(px,242+(i%2)*8,12,'#83c595');circle(px+9,247+(i%2)*8,9,'#74b38b');ctx.strokeStyle='#769a71';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(px+2,253);ctx.lineTo(px+2,273);ctx.stroke();}
 }
 function hud(){const m=MODES[level-1];round(16,13,281,46,18,'#ffffffeb');ctx.fillStyle='#1a4059';ctx.font='bold 17px Arial, sans-serif';ctx.fillText('📄 HÀNH TRÌNH MỘT TỜ GIẤY',31,42);
  round(15,69,245,8,4,'#ffffffab');round(15,69,clamp((x-102)/690,0,1)*245,8,4,m.ink);
  round(18,85,236,27,12,'#ffffffce');ctx.font='bold 13px Arial, sans-serif';ctx.fillStyle=m.ink;ctx.fillText(m.title,29,103);
 }
 function obstacle(o){const yy=GROUND-14;if(o.type==='folder'){
  round(o.x-16,yy-25,33,30,5,'#c98c54');round(o.x-14,yy-34,21,11,2,'#edc99a');ctx.strokeStyle='#875a3b';ctx.lineWidth=2;ctx.strokeRect(o.x-16,yy-23,33,25);
 }else{ctx.fillStyle='#85b9d5';ctx.beginPath();ctx.ellipse(o.x,yy+5,29,12,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#c1e5ff';ctx.lineWidth=2;ctx.stroke();}}
 function paper(){const px=x,py=GROUND-34-jumpY;ctx.save();if(flash>0)ctx.translate(Math.sin(clock*40)*5,0);ctx.translate(px,py);ctx.rotate(-.065+Math.sin(clock*7)*.06);
  round(-25,-33,50,54,5,'#fff');ctx.strokeStyle='#7ba0be';ctx.lineWidth=2.5;ctx.strokeRect(-25,-33,50,54);
  ctx.fillStyle='#d9eefc';ctx.beginPath();ctx.moveTo(12,-33);ctx.lineTo(25,-20);ctx.lineTo(12,-20);ctx.closePath();ctx.fill();ctx.strokeStyle='#91b5d5';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-13,-8);ctx.lineTo(13,-8);ctx.moveTo(-13,-2);ctx.lineTo(8,-2);ctx.stroke();
  circle(-8,9,2,'#30597b');circle(8,9,2,'#30597b');ctx.strokeStyle='#30597b';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,10,5,0,Math.PI);ctx.stroke();ctx.restore();
  ctx.fillStyle='#314d6b4f';ctx.beginPath();ctx.ellipse(x,GROUND+16,29-Math.min(jumpY/12,12),7,0,0,Math.PI*2);ctx.fill();
 }
 function target(){if(elder.complete&&elder.naturalWidth){ctx.drawImage(elder,764,114,172,196);}else{
  circle(859,184,38,'#f3c69b');round(834,224,50,81,16,'#baa078');}
  // Sign + receiving point is before the mascot: document reaches hands, never hits person.
  round(805,306,127,23,7,'#4f806b');ctx.fillStyle='#fff';ctx.font='bold 12px Arial,sans-serif';ctx.textAlign='center';ctx.fillText('ĐIỂM TIẾP NHẬN',868,322);ctx.textAlign='left';
 }
 function overlay(){if(state==='idle'||state==='finished'){ctx.fillStyle='#14304f33';ctx.fillRect(0,114,WIDTH,180);
  const center=VIEW_W/2;round(center-202,143,404,113,23,'#fffffff2');ctx.textAlign='center';ctx.fillStyle='#244c76';ctx.font='bold 26px Arial,sans-serif';ctx.fillText(state==='finished'?'HOÀN THÀNH CHUYẾN ĐI!':'SẴN SÀNG VƯỢT ẢI?',center,185);
  ctx.font='16px Arial,sans-serif';ctx.fillText(state==='finished'?'Bác đã nhận giấy. Đánh giá được gửi đi.':'Chọn cảm xúc · Bắt đầu · Chạm để nhảy',center,215);ctx.textAlign='left';}
 }
 function draw(t){if(!alive)return;
  if(document.hidden){last=t;raf=requestAnimationFrame(draw);return;}
  if(last && t-last<frameInterval){raf=requestAnimationFrame(draw);return;}
  const dt=Math.min(.045,last?(t-last)/1000:0);last=t;if(state==='running'){
  clock+=dt;const oldX=x;
  x=Math.min(794,x+117*dt);
  if(vY!==0||jumpY>0){jumpY+=vY*dt;vY-=1130*dt;if(jumpY<0){jumpY=0;vY=0;}}
  for(const [i,o] of MODES[level-1].obstacles.entries()){
   if(!announced.has(i)&&oldX<o.x+12&&x>=o.x-21){announced.add(i);if(jumpY<26)bump(o.type);}
  }
  if(x>=794&&!finishing){state='finished';finishing=true;progress();options.onState?.('finished');inform('Đã tới nơi! Đang lưu một phiếu đánh giá vào hệ thống…');
   Promise.resolve().then(()=>options.onComplete?.()).then(()=>{if(alive){inform('🎉 Bác đã nhận giấy! Phiếu đã được xử lý; bạn có thể chơi lại.');options.onState?.('done');}}).catch(err=>{if(alive){inform('Chưa ghi phiếu được: '+(err?.message||'Vui lòng thử lại.'));options.onState?.('error');}}).finally(()=>{finishing=false;});
  }
  if(t-lastUpdate>100){lastUpdate=t;progress();}
 }
 const cameraX=VIEW_W===WIDTH?0:clamp(x-180,0,WIDTH-VIEW_W);ctx.save();ctx.translate(-cameraX,0);
 scene();for(const o of MODES[level-1].obstacles)obstacle(o);paper();target();
 for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;if(p.life<=0){particles.splice(i,1);continue;}circle(p.x,p.y,3+p.life*3,'#f4c456');}
 ctx.restore();hud();if(flash>0)flash-=dt;overlay();raf=requestAnimationFrame(draw);
 }
 function destroy(){alive=false;cancelAnimationFrame(raf);canvas.removeEventListener('pointerdown',onPointer);window.removeEventListener('keydown',onKey);}
 const control={start,jump,setLevel,reset,destroy,get state(){return state;}};active=control;raf=requestAnimationFrame(draw);
 return control;
}
function dispose(){if(active){active.destroy();active=null;}}
window.TDPGame={mount,dispose,start(){return active?.start();},jump(){return active?.jump();},setLevel(n){return active?.setLevel(n);},reset(){return active?.reset();},get state(){return active?.state;}};
})();
