/* GR SUMMIT DASH — original pseudo-3D mini racing game for GR SUMMIT 2027 LP */
(function(){
'use strict';
const cv=document.getElementById('cv'), ctx=cv.getContext('2d');
const $=id=>document.getElementById(id);
const BEST_KEY='grsummit-dash-best';
const LAPS=2, TOKEN_BONUS=300; // ms per token

/* ---------- storage (safe) ---------- */
function loadBest(){ try{ const v=parseInt(localStorage.getItem(BEST_KEY),10); return isFinite(v)&&v>0?v:null; }catch(e){ return null; } }
function saveBest(v){ try{ localStorage.setItem(BEST_KEY,String(v)); }catch(e){} }
const fmt=ms=>{ ms=Math.max(0,Math.round(ms)); const m=Math.floor(ms/60000), s=Math.floor(ms%60000/1000), c=Math.floor(ms%1000/10); return `${m}'${String(s).padStart(2,'0')}"${String(c).padStart(2,'0')}`; };

/* ---------- world constants ---------- */
const STEP=1/60, SEG=200, RUMBLE=3, ROADW=2000, LANES=3, CAMH=1000, DRAW=200, FOV=100;
const camDepth=1/Math.tan((FOV/2)*Math.PI/180);
const playerZ=CAMH*camDepth;
const MAXSPD=SEG/STEP;                    // 12000 units/s
const ACCEL=MAXSPD/5, BRAKE=-MAXSPD, DECEL=-MAXSPD/5, OFF_DECEL=-MAXSPD/2, OFF_LIMIT=MAXSPD/4;
const CENTRIFUGAL=0.3;
const COL={
  sky1:'#7cc4ef', sky2:'#d9eefa',
  light:{road:'#55565b',grass:'#5d9b3a',rumble:'#f2f2f2',lane:'#f2f2f2'},
  dark:{road:'#4e4f54',grass:'#548f34',rumble:'#eb0a1e'},
  start:{road:'#f2f2f2',grass:'#5d9b3a',rumble:'#f2f2f2'},
  finish:{road:'#111',grass:'#5d9b3a',rumble:'#111'}
};

/* ---------- utils ---------- */
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const easeIn=(a,b,t)=>a+(b-a)*Math.pow(t,2);
const easeInOut=(a,b,t)=>a+(b-a)*((-Math.cos(t*Math.PI)/2)+0.5);
const pctRemain=(n,total)=>(n%total)/total;
const overlap=(x1,w1,x2,w2,pct)=>{ const h=(pct||1)/2; return !((x1+w1*h)<(x2-w2*h)||(x1-w1*h)>(x2+w2*h)); };
const rnd=(a,b)=>a+Math.random()*(b-a);
const pick=a=>a[Math.floor(Math.random()*a.length)];

/* ---------- sprite factory (all drawn in code, original designs) ---------- */
function mk(w,h,draw){ const c=document.createElement('canvas'); c.width=w; c.height=h; draw(c.getContext('2d'),w,h); return c; }
function carRear(body,accent,stripe,wing,lean){
  return mk(200,120,(g,w,h)=>{
    g.translate(w/2,0);
    const sk=lean*10;
    // tyres
    g.fillStyle='#111'; g.fillRect(-86+sk*.3,78,30,38); g.fillRect(56+sk*.3,78,30,38);
    // lower body / diffuser
    g.fillStyle='#16161a'; g.beginPath(); g.moveTo(-90,84); g.lineTo(90,84); g.lineTo(80,108); g.lineTo(-80,108); g.closePath(); g.fill();
    // main body
    g.fillStyle=body; g.beginPath(); g.moveTo(-92,86); g.lineTo(-84,50); g.lineTo(-58+sk,22); g.lineTo(58+sk,22); g.lineTo(84,50); g.lineTo(92,86); g.closePath(); g.fill();
    // rear window
    g.fillStyle='#1d2b36'; g.beginPath(); g.moveTo(-48+sk,28); g.lineTo(48+sk,28); g.lineTo(62+sk*.6,50); g.lineTo(-62+sk*.6,50); g.closePath(); g.fill();
    g.fillStyle='rgba(255,255,255,.18)'; g.fillRect(-40+sk,31,26,4);
    // stripe
    if(stripe){ g.fillStyle=stripe; g.beginPath(); g.moveTo(-14+sk,22); g.lineTo(14+sk,22); g.lineTo(18,86); g.lineTo(-18,86); g.closePath(); g.fill(); }
    // tail lights
    g.fillStyle='#ff2a2a'; g.fillRect(-84,58,46,8); g.fillRect(38,58,46,8);
    g.fillStyle=accent; g.fillRect(-36,58,72,4);
    // number panel (blank)
    g.fillStyle='#0d0d0f'; g.fillRect(-22,70,44,13);
    // exhaust
    g.fillStyle='#888'; g.fillRect(-30,102,12,6); g.fillRect(18,102,12,6);
    // wing
    if(wing){ g.fillStyle='#0d0d0f'; g.fillRect(-60,40,4,16); g.fillRect(56,40,4,16); g.fillRect(-96+sk*.5,30,192,9); g.fillStyle=accent; g.fillRect(-96+sk*.5,30,8,9); g.fillRect(88+sk*.5,30,8,9); }
  });
}
const SPR={};
function buildSprites(){
  SPR.player=[-1,0,1].map(l=>carRear('#eb0a1e','#ffffff','#f4f4f4',true,l));
  SPR.cars=[
    carRear('#f3f3f3','#eb0a1e','#111',false,0), carRear('#1a1a1e','#eb0a1e',null,true,0),
    carRear('#9aa2aa','#111',null,false,0), carRear('#1f5fbf','#fff',null,false,0),
    carRear('#f1c40f','#111','#111',false,0), carRear('#e9e9e9','#111',null,true,0)
  ];
  SPR.cone=mk(60,70,(g)=>{ g.fillStyle='#222'; g.fillRect(4,62,52,8); g.fillStyle='#ff6a00'; g.beginPath(); g.moveTo(30,2); g.lineTo(50,62); g.lineTo(10,62); g.closePath(); g.fill(); g.fillStyle='#fff'; g.beginPath(); g.moveTo(22,26); g.lineTo(38,26); g.lineTo(42,38); g.lineTo(18,38); g.closePath(); g.fill(); });
  SPR.token=mk(90,90,(g)=>{ g.translate(45,45); g.rotate(Math.PI/4); g.fillStyle='#fff'; g.fillRect(-30,-30,60,60); g.fillStyle='#eb0a1e'; g.fillRect(-25,-25,50,50); g.setTransform(1,0,0,1,0,0); g.fillStyle='#fff'; g.font='800 30px "LINE Seed JP",sans-serif'; g.textAlign='center'; g.textBaseline='middle'; g.fillText('GR',45,47); });
  SPR.tree=mk(120,200,(g)=>{ g.fillStyle='#4a3424'; g.fillRect(54,150,12,50); g.fillStyle='#2f6b2a'; g.beginPath(); g.moveTo(60,0); g.lineTo(112,160); g.lineTo(8,160); g.closePath(); g.fill(); g.fillStyle='#3d8434'; g.beginPath(); g.moveTo(60,30); g.lineTo(96,130); g.lineTo(24,130); g.closePath(); g.fill(); });
  SPR.flag=mk(60,200,(g)=>{ g.fillStyle='#ddd'; g.fillRect(4,0,5,200); g.fillStyle='#eb0a1e'; g.beginPath(); g.moveTo(9,8); g.lineTo(56,14); g.lineTo(52,120); g.lineTo(9,126); g.closePath(); g.fill(); g.fillStyle='#fff'; g.fillRect(9,60,45,10); });
  SPR.board=mk(320,150,(g,w)=>{ g.fillStyle='#777'; g.fillRect(40,90,10,60); g.fillRect(270,90,10,60); g.fillStyle='#0d0d0f'; g.fillRect(0,0,w,96); g.fillStyle='#eb0a1e'; g.fillRect(0,0,14,96); g.fillStyle='#fff'; g.font='800 38px "LINE Seed JP",sans-serif'; g.textBaseline='middle'; g.fillText('GR SUMMIT',30,38); g.font='700 20px "LINE Seed JP",sans-serif'; g.fillStyle='#ccc'; g.fillText('2027.03.14 SUN  FUJI',30,74); });
  SPR.board2=mk(320,150,(g,w)=>{ g.fillStyle='#777'; g.fillRect(40,90,10,60); g.fillRect(270,90,10,60); g.fillStyle='#fff'; g.fillRect(0,0,w,96); g.fillStyle='#111'; g.font='800 46px "LINE Seed JP",sans-serif'; g.textBaseline='middle'; g.fillText('GO TO',22,50); g.fillStyle='#eb0a1e'; g.fillText('GR!!',186,50); });
  SPR.dist=mk(80,120,(g)=>{ g.fillStyle='#ddd'; g.fillRect(36,60,8,60); g.fillStyle='#fff'; g.fillRect(4,4,72,60); g.fillStyle='#eb0a1e'; g.fillRect(4,4,72,8); g.fillStyle='#111'; g.font='800 30px "LINE Seed JP",sans-serif'; g.textAlign='center'; g.fillText('100',40,50); });
  SPR.gate=mk(400,60,(g,w)=>{ g.fillStyle='#0d0d0f'; g.fillRect(0,0,w,60); for(let i=0;i<20;i++){ g.fillStyle=i%2?'#fff':'#0d0d0f'; g.fillRect(i*20,44,20,16);} g.fillStyle='#fff'; g.font='800 32px "LINE Seed JP",sans-serif'; g.textAlign='center'; g.textBaseline='middle'; g.fillText('START / FINISH',w/2,22); });
}

/* ---------- track ---------- */
let segments=[], trackLength=0, cars=[];
function lastY(){ return segments.length?segments[segments.length-1].p2.world.y:0; }
function addSegment(curve,y){
  const n=segments.length;
  segments.push({index:n,
    p1:{world:{y:lastY(),z:n*SEG},camera:{},screen:{}},
    p2:{world:{y:y,z:(n+1)*SEG},camera:{},screen:{}},
    curve, sprites:[], cars:[], color:Math.floor(n/RUMBLE)%2?COL.dark:COL.light});
}
function addRoad(enter,hold,leave,curve,y){
  const sy=lastY(), ey=sy+(y||0)*SEG, tot=enter+hold+leave;
  for(let n=0;n<enter;n++) addSegment(easeIn(0,curve,n/enter),easeInOut(sy,ey,n/tot));
  for(let n=0;n<hold;n++)  addSegment(curve,easeInOut(sy,ey,(enter+n)/tot));
  for(let n=0;n<leave;n++) addSegment(easeInOut(curve,0,n/leave),easeInOut(sy,ey,(enter+hold+n)/tot));
}
function buildTrack(){
  segments=[];
  // Original course inspired by a mountain-side circuit: long main straight, tight first corner, flowing middle, twisty final sector
  addRoad(60,180,60,0,0);         // main straight
  addRoad(40,60,40,-5,0);         // T1 tight left... (heavy)
  addRoad(30,40,30,0,10);         // short uphill straight
  addRoad(40,80,40,3,0);          // long right
  addRoad(30,30,30,-2,-10);       // left + downhill
  addRoad(60,60,60,0,0);          // back straight
  addRoad(30,40,30,4,20);         // uphill right
  addRoad(25,25,25,-4,0);         // S left
  addRoad(25,25,25,4,0);          // S right
  addRoad(40,40,40,0,-20);        // downhill straight
  addRoad(40,60,40,-6,0);         // hairpin left
  addRoad(30,30,30,3,10);         // final sector
  addRoad(30,30,30,-3,0);
  addRoad(40,60,40,2,-10);        // last corner onto the straight
  addRoad(40,80,40,0,0);
  // colour start/finish
  for(let n=0;n<RUMBLE;n++){ segments[n+3].color=COL.start; }
  segments[2].color=COL.finish;
  trackLength=segments.length*SEG;
  // scenery
  const add=(n,src,off,kind)=>{ if(segments[n]) segments[n].sprites.push({src,offset:off,kind:kind||'deco',w:(kind==='token'?320:kind==='cone'?280:null)}); };
  add(6,SPR.gate,-0.0,'gate');
  for(let n=10;n<segments.length;n+=8){
    const s=segments[n];
    if(n%40===0) add(n,SPR.board,-1.9); else if(n%40===20) add(n,SPR.board2,1.9);
    else if(Math.abs(s.curve)>2 && n%16===0) add(n,SPR.flag,s.curve>0?-1.25:1.25);
    else { add(n,SPR.tree,-rnd(1.6,3.4)); add(n,SPR.tree,rnd(1.6,3.4)); }
  }
  for(let n=40;n<segments.length;n+=50){ add(n,SPR.dist,1.35); }
  // GR tokens in short lines
  for(let n=120;n<segments.length-60;n+=Math.floor(rnd(45,75))){
    const lane=pick([-0.66,0,0.66]), cnt=Math.floor(rnd(2,4));
    for(let k=0;k<cnt;k++) add(n+k*5,SPR.token,lane,'token');
  }
  // cone chicanes
  for(let n=260;n<segments.length-80;n+=Math.floor(rnd(110,170))){
    const lanes=pick([[-0.66,0],[0,0.66],[-0.66,0.66]]);
    lanes.forEach(l=>{ add(n,SPR.cone,l-0.12,'cone'); add(n,SPR.cone,l+0.12,'cone'); });
  }
  // traffic
  cars=[];
  for(let i=0;i<22;i++){
    const z=Math.floor(rnd(30,segments.length))*SEG, spd=MAXSPD*rnd(.28,.55);
    const car={offset:pick([-0.66,0,0.66])+rnd(-.08,.08),z,speed:spd,src:pick(SPR.cars),w:620,percent:0};
    findSeg(z).cars.push(car); cars.push(car);
  }
}
const findSeg=z=>segments[Math.floor(z/SEG)%segments.length];

/* ---------- state ---------- */
let W=0,H=0,DPR=1;
let position=0, playerX=0, speed=0, lap=1, elapsed=0, tokens=0, state='start', shake=0, best=loadBest(), countdown=0;
let skyOff=0, hillOff=0, treeOff=0;
const keys={left:false,right:false,up:false,down:false};

/* ---------- input ---------- */
const KEYMAP={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ArrowUp:'up',KeyW:'up',Space:'up',ArrowDown:'down',KeyS:'down'};
document.addEventListener('keydown',e=>{
  const k=KEYMAP[e.code];
  if(k){ keys[k]=true; if(state==='run'||state==='count') e.preventDefault(); }
  if((e.code==='Enter'||e.code==='Space') && state==='start' && document.activeElement && document.activeElement.id!=='btnStart'){ e.preventDefault(); start(); }
});
document.addEventListener('keyup',e=>{ const k=KEYMAP[e.code]; if(k) keys[k]=false; });
window.addEventListener('blur',()=>{ for(const k in keys) keys[k]=false; });
document.querySelectorAll('.pb').forEach(b=>{
  const k=b.dataset.k;
  const on=e=>{ e.preventDefault(); keys[k]=true; b.classList.add('on'); try{b.setPointerCapture(e.pointerId);}catch(_){} };
  const off=e=>{ keys[k]=false; b.classList.remove('on'); };
  b.addEventListener('pointerdown',on); b.addEventListener('pointerup',off); b.addEventListener('pointercancel',off); b.addEventListener('lostpointercapture',off);
  b.addEventListener('contextmenu',e=>e.preventDefault());
});
// tap zones on the canvas itself (left / right half steer, accel while touching)
const game=$('game');
const touches=new Map();
function zoneUpdate(){ let l=false,r=false; touches.forEach(x=>{ if(x<0.5) l=true; else r=true; }); keys.tl=l; keys.tr=r; keys.ta=touches.size>0; }
game.addEventListener('pointerdown',e=>{ if(e.pointerType!=='touch'||state!=='run') return; const r=game.getBoundingClientRect(); touches.set(e.pointerId,(e.clientX-r.left)/r.width); zoneUpdate(); });
game.addEventListener('pointermove',e=>{ if(!touches.has(e.pointerId)) return; const r=game.getBoundingClientRect(); touches.set(e.pointerId,(e.clientX-r.left)/r.width); zoneUpdate(); });
['pointerup','pointercancel','pointerleave'].forEach(t=>game.addEventListener(t,e=>{ touches.delete(e.pointerId); zoneUpdate(); }));

/* ---------- flow ---------- */
function reset(){
  buildTrack(); position=0; playerX=0; speed=0; lap=1; elapsed=0; tokens=0; shake=0;
  updHud();
}
/* ---------- 累計プレイ数（js/plays.js） ---------- */
const P=window.GRPlays, playsBox=$('plays'), playsN=$('playsN');
let lastHit=0;
// カウントアップはせず、数字をそのまま表示（本人指示 2026-11-15）
function showPlays(total){ if(!P||!playsBox) return; playsBox.hidden=false; total=Math.max(total,+(playsN.dataset.v||0)); playsN.dataset.v=total; playsN.textContent=Math.round(total).toLocaleString('ja-JP'); }
if(P){ showPlays(P.OFFSET+(P.cached()||0)); P.get().then(v=>{ if(v!=null) showPlays(P.OFFSET+v); }).catch(()=>{}); }
function countPlay(){
  if(!P) return;
  const now=Date.now(); if(now-lastHit<2000) return; lastHit=now;   // 連打・ダブルタップは1回に
  const cur=+(playsN.dataset.v||P.OFFSET);
  showPlays(cur+1); playsN.classList.add('bump'); setTimeout(()=>playsN.classList.remove('bump'),300);
  P.hit().then(v=>{ if(v!=null && P.OFFSET+v>+(playsN.dataset.v||0)) showPlays(P.OFFSET+v); }).catch(()=>{});
}
function start(){
  if(state==='count'||state==='run') return;
  countPlay();
  $('ovStart').classList.remove('on'); $('ovEnd').classList.remove('on');
  reset(); state='count'; countdown=3; flash('3',1);
  game.focus && game.focus({preventScroll:true});
}
function finish(){
  state='end';
  const total=Math.max(0,elapsed*1000-tokens*TOKEN_BONUS);
  const isBest=!best||total<best;
  if(isBest){ best=Math.round(total); saveBest(best); }
  $('rRun').textContent=fmt(elapsed*1000);
  $('rGr').textContent=`${tokens}枚（−${(tokens*TOKEN_BONUS/1000).toFixed(1)}秒）`;
  $('rTot').textContent=fmt(total);
  $('rNew').hidden=!isBest;
  $('rBest').textContent=best?`ベスト ${fmt(best)}`:'';
  $('hBest').textContent=best?fmt(best):'--';
  setTimeout(()=>{ $('ovEnd').classList.add('on'); $('btnRetry').focus({preventScroll:true}); },700);
}
$('btnStart').addEventListener('click',start);
$('btnRetry').addEventListener('click',start);
$('stBest').textContent=best?`あなたのベスト ${fmt(best)}`:'';
$('hBest').textContent=best?fmt(best):'--';

let msgT=0;
function flash(t,dur){ const m=$('msg'); m.textContent=t; m.classList.add('on'); msgT=dur||0.9; }

/* ---------- update ---------- */
function update(dt){
  if(msgT>0){ msgT-=dt; if(msgT<=0) $('msg').classList.remove('on'); }
  if(state==='count'){
    const before=Math.ceil(countdown); countdown-=dt; const after=Math.ceil(countdown);
    if(after!==before && after>0) flash(String(after),1);
    if(countdown<=0){ state='run'; flash('GO!',0.8); }
    updateCars(dt); return;
  }
  if(state!=='run' && state!=='end') { updateCars(dt); return; }
  const left=keys.left||keys.tl, right=keys.right||keys.tr, up=state==='run'&&(keys.up||keys.ta), down=keys.down;
  const pseg=findSeg(position+playerZ), sp=speed/MAXSPD, dx=dt*2*sp;
  const prev=position;
  position+=dt*speed; while(position>=trackLength) position-=trackLength; while(position<0) position+=trackLength;
  if(state==='run'){
    elapsed+=dt;
    if(position<prev){ // crossed the line
      lap++;
      if(lap>LAPS){ lap=LAPS; finish(); }
      else flash('FINAL LAP',1.2);
    }
  }
  if(left) playerX-=dx; else if(right) playerX+=dx;
  playerX-=dx*sp*pseg.curve*CENTRIFUGAL;
  if(state==='end'){ speed+=DECEL*2*dt; }
  else if(up) speed+=ACCEL*dt; else if(down) speed+=BRAKE*dt; else speed+=DECEL*dt;
  if((playerX<-1||playerX>1) && speed>OFF_LIMIT) speed+=OFF_DECEL*dt;
  // sprite collisions
  const pw=0.30;
  for(const s of pseg.sprites){
    if(s.hit) continue;
    if(s.kind==='token' && overlap(playerX,pw,s.offset,0.24)){ s.hit=true; tokens++; speed=Math.min(MAXSPD,speed*1.04); }
    else if(s.kind==='cone' && overlap(playerX,pw,s.offset,0.1)){ s.hit=true; speed*=0.45; shake=0.35; }
    else if((s.kind==='deco') && Math.abs(s.offset)<2.2 && overlap(playerX,pw,s.offset+(s.offset<0?-0.15:0.15),0.3)){ speed=Math.min(speed,MAXSPD/5); shake=0.3; playerX=Math.sign(playerX)*1.05; }
  }
  for(const c of pseg.cars){
    if(speed>c.speed && overlap(playerX,pw,c.offset,0.28,0.85)){
      speed=c.speed*(c.speed/speed)*0.8; position=c.z-playerZ; if(position<0) position+=trackLength; shake=0.4; break;
    }
  }
  playerX=clamp(playerX,-1.7,1.7); speed=clamp(speed,0,MAXSPD);
  if(shake>0) shake-=dt;
  skyOff=(skyOff+0.001*pseg.curve*sp)%1; hillOff=(hillOff+0.002*pseg.curve*sp)%1; treeOff=(treeOff+0.003*pseg.curve*sp)%1;
  updateCars(dt);
  if(state==='end' && speed<=0) speed=0;
}
function updateCars(dt){
  for(const c of cars){
    const old=findSeg(c.z);
    c.z+=dt*c.speed; while(c.z>=trackLength) c.z-=trackLength;
    c.percent=pctRemain(c.z,SEG);
    const ns=findSeg(c.z);
    if(old!==ns){ const i=old.cars.indexOf(c); if(i>=0) old.cars.splice(i,1); ns.cars.push(c); }
  }
}

/* ---------- render ---------- */
function project(p,cx,cy,cz){
  p.camera.x=(p.world.x||0)-cx; p.camera.y=(p.world.y||0)-cy; p.camera.z=(p.world.z||0)-cz;
  p.screen.scale=camDepth/p.camera.z;
  p.screen.x=Math.round(W/2+p.screen.scale*p.camera.x*W/2);
  p.screen.y=Math.round(H/2-p.screen.scale*p.camera.y*H/2);
  p.screen.w=Math.round(p.screen.scale*ROADW*W/2);
}
function poly(x1,y1,x2,y2,x3,y3,x4,y4,c){ ctx.fillStyle=c; ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.lineTo(x3,y3); ctx.lineTo(x4,y4); ctx.closePath(); ctx.fill(); }
function drawSegment(x1,y1,w1,x2,y2,w2,col,first){
  const r1=w1/Math.max(6,2*LANES), r2=w2/Math.max(6,2*LANES), l1=w1/40, l2=w2/40;
  ctx.fillStyle=col.grass; ctx.fillRect(0,y2,W,y1-y2);
  poly(x1-w1-r1,y1,x1-w1,y1,x2-w2,y2,x2-w2-r2,y2,col.rumble);
  poly(x1+w1+r1,y1,x1+w1,y1,x2+w2,y2,x2+w2+r2,y2,col.rumble);
  poly(x1-w1,y1,x1+w1,y1,x2+w2,y2,x2-w2,y2,col.road);
  if(col.lane){
    const lw1=w1*2/LANES, lw2=w2*2/LANES; let lx1=x1-w1+lw1, lx2=x2-w2+lw2;
    for(let l=1;l<LANES;l++,lx1+=lw1,lx2+=lw2) poly(lx1-l1/2,y1,lx1+l1/2,y1,lx2+l2/2,y2,lx2-l2/2,y2,col.lane);
  }
}
let bgFar=null,bgMid=null;
function buildBg(){
  // far layer: Mt. Fuji-like peak + range (original drawing)
  bgFar=mk(2048,400,(g,w,h)=>{
    g.fillStyle='#8fb3cf'; g.beginPath(); g.moveTo(0,h);
    for(let x=0;x<=w;x+=64) g.lineTo(x,h-60-40*Math.sin(x/170)-24*Math.sin(x/53)); g.lineTo(w,h); g.closePath(); g.fill();
    const peak=(cx)=>{ g.fillStyle='#5b7894'; g.beginPath(); g.moveTo(cx-520,h); g.lineTo(cx-90,h-300); g.lineTo(cx+90,h-300); g.lineTo(cx+520,h); g.closePath(); g.fill();
      g.fillStyle='#f6f8fb'; g.beginPath(); g.moveTo(cx-90,h-300); g.lineTo(cx+90,h-300); g.lineTo(cx+170,h-215); g.lineTo(cx+120,h-228); g.lineTo(cx+70,h-205); g.lineTo(cx+20,h-232); g.lineTo(cx-40,h-208); g.lineTo(cx-95,h-230); g.lineTo(cx-170,h-215); g.closePath(); g.fill(); };
    peak(700);
  });
  bgMid=mk(2048,300,(g,w,h)=>{
    g.fillStyle='#3f7a39'; g.beginPath(); g.moveTo(0,h);
    for(let x=0;x<=w;x+=32) g.lineTo(x,h-70-30*Math.sin(x/120)-18*Math.sin(x/37+1)); g.lineTo(w,h); g.closePath(); g.fill();
    g.fillStyle='#2f6430'; for(let x=0;x<w;x+=26){ const y=h-50-24*Math.sin(x/120); g.beginPath(); g.moveTo(x,y-34); g.lineTo(x+14,y+10); g.lineTo(x-14,y+10); g.closePath(); g.fill(); }
  });
}
function drawLayer(img,off,yBase,hgt){
  const iw=img.width, ih=img.height, sw=iw/2; let sx=Math.floor(iw*off)%iw; if(sx<0) sx+=iw;
  const dh=hgt, dy=yBase-dh;
  // draw two parts to wrap
  const sw1=Math.min(sw,iw-sx);
  ctx.drawImage(img,sx,0,sw1,ih,0,dy,W*sw1/sw,dh);
  if(sw1<sw) ctx.drawImage(img,0,0,sw-sw1,ih,W*sw1/sw-1,dy,W*(sw-sw1)/sw+1,dh);
}
function drawSprite(src,scale,destX,destY,offX,offY,clipY,worldW){
  const ww=worldW||(src.width*6);
  const dw=ww*scale*W/2, dh=dw*src.height/src.width;
  destX+=dw*(offX||0); destY+=dh*(offY||0);
  const clipH=clipY?Math.max(0,destY+dh-clipY):0;
  if(clipH<dh && dw>0.5) ctx.drawImage(src,0,0,src.width,src.height-src.height*clipH/dh,destX,destY,dw,dh-clipH);
}
function render(t){
  const base=findSeg(position), bp=pctRemain(position,SEG);
  const pseg=findSeg(position+playerZ), pp=pctRemain(position+playerZ,SEG);
  const playerY=lerp(pseg.p1.world.y,pseg.p2.world.y,pp);
  let maxy=H, x=0, dx=-(base.curve*bp);
  ctx.save();
  if(shake>0){ ctx.translate(rnd(-1,1)*shake*16*DPR,rnd(-1,1)*shake*10*DPR); }
  const g=ctx.createLinearGradient(0,0,0,H*0.6); g.addColorStop(0,COL.sky1); g.addColorStop(1,COL.sky2);
  ctx.fillStyle=g; ctx.fillRect(-20,-20,W+40,H+40);
  const horizon=H*0.56;
  drawLayer(bgFar,skyOff,horizon+H*0.04,H*0.42);
  drawLayer(bgMid,hillOff,horizon+H*0.08,H*0.22);
  ctx.fillStyle=COL.light.grass; ctx.fillRect(-20,horizon+H*0.075,W+40,H);
  for(let n=0;n<DRAW;n++){
    const s=segments[(base.index+n)%segments.length];
    s.looped=s.index<base.index; s.clip=maxy;
    const cz=position-(s.looped?trackLength:0);
    project(s.p1,playerX*ROADW-x,playerY+CAMH,cz);
    project(s.p2,playerX*ROADW-x-dx,playerY+CAMH,cz);
    x+=dx; dx+=s.curve;
    if(s.p1.camera.z<=camDepth||s.p2.screen.y>=s.p1.screen.y||s.p2.screen.y>=maxy) continue;
    drawSegment(s.p1.screen.x,s.p1.screen.y,s.p1.screen.w,s.p2.screen.x,s.p2.screen.y,s.p2.screen.w,s.color);
    maxy=s.p1.screen.y;
  }
  for(let n=DRAW-1;n>0;n--){
    const s=segments[(base.index+n)%segments.length];
    for(const c of s.cars){
      const sc=lerp(s.p1.screen.scale,s.p2.screen.scale,c.percent);
      const sx=lerp(s.p1.screen.x,s.p2.screen.x,c.percent)+sc*c.offset*ROADW*W/2;
      const sy=lerp(s.p1.screen.y,s.p2.screen.y,c.percent);
      drawSprite(c.src,sc,sx,sy,-0.5,-1,s.clip,c.w);
    }
    for(const sp of s.sprites){
      if(sp.hit) continue;
      const sc=s.p1.screen.scale, sx=s.p1.screen.x+sc*sp.offset*ROADW*W/2, sy=s.p1.screen.y;
      let ww=sp.w, offX=sp.offset<0?-1:0;
      if(sp.kind==='token'||sp.kind==='cone'){ offX=-0.5; }
      if(sp.kind==='gate'){ ww=ROADW*2.3; offX=-0.5; drawSprite(sp.src,sc,sx,sy-ROADW*1.0*sc*W/2,offX,-1,s.clip,ww); continue; }
      if(!ww) ww=sp.src.width*6;
      let yOff=-1;
      if(sp.kind==='token'){ const bob=Math.sin(t/180+s.index)*0.12; yOff=-1.25+bob; }
      drawSprite(sp.src,sc,sx,sy,offX,yOff,s.clip,ww);
    }
    if(s===pseg){
      const left=keys.left||keys.tl, right=keys.right||keys.tr;
      const bounce=(1.5*Math.random()*(speed/MAXSPD)*(W/480))*(Math.random()>.5?1:-1);
      const spr=SPR.player[left?0:right?2:1];
      const sc=camDepth/playerZ;
      const py=H/2-(sc*lerp(pseg.p1.camera.y,pseg.p2.camera.y,pp)*H/2);
      drawSprite(spr,sc,W/2,py+bounce,-0.5,-1,0,H>W?680:500);
    }
  }
  ctx.restore();
}

/* ---------- HUD ---------- */
let hudT=0;
function updHud(){
  $('hLap').textContent=`${Math.min(lap,LAPS)}/${LAPS}`;
  $('hTime').textContent=fmt(elapsed*1000);
  $('hSpd').textContent=Math.round(speed/MAXSPD*260);
  $('hGr').textContent=tokens;
}

/* ---------- size ---------- */
function resize(){
  const r=game.getBoundingClientRect();
  DPR=Math.min(window.devicePixelRatio||1,1.5);
  let w=Math.round(r.width*DPR), h=Math.round(r.height*DPR);
  const maxW=1400; if(w>maxW){ h=Math.round(h*maxW/w); w=maxW; }
  if(cv.width!==w||cv.height!==h){ cv.width=w; cv.height=h; }
  W=cv.width; H=cv.height;
}
window.addEventListener('resize',resize);
if('ResizeObserver' in window) new ResizeObserver(resize).observe(game);

/* ---------- loop ---------- */
let last=0, acc=0;
function frame(now){
  if(!last) last=now;
  let dt=Math.min(0.1,(now-last)/1000); last=now; acc+=dt;
  while(acc>=STEP){ update(STEP); acc-=STEP; }
  render(now);
  hudT+=dt; if(hudT>0.05){ updHud(); hudT=0; }
  requestAnimationFrame(frame);
}
function boot(){ buildSprites(); buildBg(); reset(); resize(); requestAnimationFrame(frame); }
// wait for the web font so canvas text uses LINE Seed JP (falls back after 1.5s)
const fontReady=(document.fonts&&document.fonts.load)?Promise.race([document.fonts.load('800 30px "LINE Seed JP"'),new Promise(r=>setTimeout(r,1500))]):Promise.resolve();
fontReady.then(boot,boot);
})();
