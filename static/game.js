/* Trò bắn bóng mềm V5 - mọi phát bắn sau khi ghi phiếu chỉ là hiệu ứng. */
(()=>{'use strict';
 let active=null;
 function mount(canvas,{level,onHit,alreadyVoted=false}){
   if(active)active.destroy();
   const ctx=canvas.getContext('2d');
   let currentLevel=level||2;const person=new Image(); person.src=`/static/assets/mascots/mascot-${currentLevel}.svg`;
   const W=900,H=390,ox=105,oy=318,target={x:720,y:211,rx:83,ry:112};
   let balls=[],sparkles=[],aim={x:720,y:210},flash=0,reaction=0,shotCount=0,last=performance.now(),running=true,hitLock=false;
   canvas.width=W;canvas.height=H;
   let color=['#22b68e','#3b93ed','#eead43','#e16b72'][currentLevel-1];
   function look(x,y){const dist=Math.hypot(x-ox,y-oy);if(dist<40)return;aim.x=Math.max(250,Math.min(W-22,x));aim.y=Math.max(30,Math.min(H-38,y));}
   function pointer(ev){const r=canvas.getBoundingClientRect();look((ev.clientX-r.left)/r.width*W,(ev.clientY-r.top)/r.height*H);}
   function down(ev){canvas.setPointerCapture?.(ev.pointerId);pointer(ev);}
   function move(ev){if(ev.pointerType==='mouse'&&ev.buttons===0)return;pointer(ev);}
   canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);
   // Mouse/touch can aim by dragging; press the dedicated Fire button to fire.
   function fire(){
     if(!running)return;
     const dx=aim.x-ox,dy=aim.y-oy,d=Math.hypot(dx,dy)||1;
     balls.push({x:ox,y:oy,vx:dx/d*980,vy:dy/d*980,t:0,hit:false});shotCount++;
     canvas.dispatchEvent(new CustomEvent('tdp-shot',{detail:{count:shotCount}}));
   }
   function arc(x,y,r,c){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=c;ctx.fill();}
   function draw(t){if(!running)return;const dt=Math.min(.04,(t-last)/1000);last=t;
     ctx.clearRect(0,0,W,H);
     const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#d7eeff');sky.addColorStop(.7,'#f5fbff');sky.addColorStop(1,'#f3e9d5');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
     ctx.fillStyle='#d4dfbd';ctx.fillRect(0,350,W,40);
     for(let i=0;i<9;i++){ctx.fillStyle=i%2?'#93c8a2':'#b1d6b7';arc(50+i*125,348,34,'#a8d7ba');}
     // Mascot target: 4 SVG expressions, each scales crisply on any screen.
     if(person.complete&&person.naturalWidth){
       ctx.save();
       const bounce=currentLevel<=2 ? -Math.sin((.58-reaction)*17)*reaction*14 : Math.sin((.58-reaction)*34)*reaction*12;
       const twist=currentLevel>=3 ? Math.sin((.58-reaction)*37)*reaction*.045 : 0;
       ctx.translate(720+bounce*.2,193+bounce);ctx.rotate(twist);ctx.drawImage(person,-150,-175,300,350);ctx.restore();
     }
     reaction=Math.max(0,reaction-dt);
     // Aim guide and cannon; dragging updates the direction.
     const angle=Math.atan2(aim.y-oy,aim.x-ox);ctx.save();ctx.translate(ox,oy);ctx.rotate(angle);
     ctx.fillStyle='#173a83';ctx.shadowColor='#2b6ad7';ctx.shadowBlur=12;ctx.fillRect(-13,-19,115,38);ctx.shadowBlur=0;
     ctx.fillStyle='#f0b94a';ctx.fillRect(15,-20,85,40);ctx.strokeStyle='#bd7d21';ctx.lineWidth=5;ctx.strokeRect(17,-20,85,40);
     ctx.fillStyle='#326cce';ctx.fillRect(86,-24,26,48);ctx.restore();
     arc(82,334,32,'#2454a4');arc(82,334,16,'#f2c256');arc(131,338,24,'#2653a0');arc(131,338,11,'#f2c256');
     ctx.beginPath();ctx.setLineDash([7,12]);ctx.moveTo(ox+Math.cos(angle)*115,oy+Math.sin(angle)*115);ctx.lineTo(aim.x,aim.y);ctx.strokeStyle='#245caf99';ctx.lineWidth=3;ctx.stroke();ctx.setLineDash([]);
     for(let i=balls.length-1;i>=0;i--){const b=balls[i];b.t+=dt;b.x+=b.vx*dt;b.y+=b.vy*dt;
       if(b.x>W+25||b.y< -25||b.y>H+25||b.t>1.5){balls.splice(i,1);continue;}
       ctx.shadowColor=color;ctx.shadowBlur=13;arc(b.x,b.y,15,color);ctx.shadowBlur=0;arc(b.x-5,b.y-6,5,'#ffffffb2');
       const nx=(b.x-target.x)/target.rx,ny=(b.y-target.y)/target.ry;
       if(nx*nx+ny*ny<=1 && !b.hit){b.hit=true;flash=.45;reaction=.58;
         for(let j=0;j<16;j++){const a=j*Math.PI/8;sparkles.push({x:b.x,y:b.y,vx:Math.cos(a)*(70+Math.random()*125),vy:Math.sin(a)*(70+Math.random()*125),life:.58});}
         balls.splice(i,1);if(!hitLock){hitLock=true;Promise.resolve(onHit?.()).finally(()=>{if(running)hitLock=false;});}
       }
     }
     for(let i=sparkles.length-1;i>=0;i--){const p=sparkles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;if(p.life<=0){sparkles.splice(i,1);continue;}arc(p.x,p.y,3+p.life*4,'#ffd64d');}
     if(flash>0){flash-=dt;ctx.textAlign='center';ctx.font='bold 32px sans-serif';ctx.fillStyle=color;ctx.fillText(currentLevel<=2?'CẢM ƠN BẠN! 💛':'ÔI CHAO! 💥',700,55);}
     requestAnimationFrame(draw);
   }
   const obj={fire,setLevel(n){if(n<1||n>4||n===currentLevel)return;currentLevel=n;color=['#22b68e','#3b93ed','#eead43','#e16b72'][n-1];person.src=`/static/assets/mascots/mascot-${n}.svg`;},destroy(){running=false;canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);}};
   active=obj;requestAnimationFrame(draw);return obj;
 }
 function dispose(){if(active){active.destroy();active=null;}}
 window.TDPGame={mount,dispose,fire(){active?.fire();},setLevel(n){active?.setLevel(n);}};
})();
