/* GR SUMMIT 2027 LP — interactions (base: 超日産博2026 LP) */
(function(){
'use strict';
/* =========================================================
   設定
   ========================================================= */
const PHOTOS = (window.GR_PHOTOS || []);          // [[id,w,h], ...] ギャラリー全写真（2026年）
const MV = (window.GR_MV || []);                   // メインビジュアル背景（縦長切り抜き）
const ENTRY_START = new Date(Date.UTC(2026,11,14,15,0,0)); // エントリー開始＝日本時間 2026年12月15日 0時（開始時刻未定のため日付の始まりで計算）
const AUTO_DURATION = 4200;                        // 初回自動スクロール時間(ms)
const SCENE_COUNT_PC = 160, SCENE_COUNT_SP = 96;   // 流れるギャラリーに使う枚数（毎回ランダム）
const ARC_STEP = 48;                               // 「もっと見る」1回で増やす枚数
const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
const full = id => `img/gal/${id}.webp`, thumb = id => `img/gal/s/${id}.webp`;

function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}

/* ---------- メインビジュアル背景（左右／SPは上下） ---------- */
const N = Math.max(1, Math.floor(MV.length/2));
const MV_POOL = shuffle(MV);
const L = MV_POOL.slice(0,N).map(id=>`img/mv/${id}.webp`);
const R = MV_POOL.slice(N,N*2).map(id=>`img/mv/${id}.webp`);
function build(el, arr){
  return arr.map((src,i)=>{
    const d=document.createElement('div');
    d.className='ph'+(i===0?' on':'');
    d.dataset.src=src; d.ok=false;
    if(i===0){ d.style.backgroundImage=`url("${src}")`; d.ok=true; }
    el.appendChild(d); return d;
  });
}
// 最初の1枚ずつだけ先に読み込み、残りは順番に裏で読み込む（初回表示を軽く）
const phL = build(document.getElementById('sideL'), L);
const phR = build(document.getElementById('sideR'), R);
function preloadMV(){
  const q=[]; for(let i=1;i<N;i++){ if(phL[i])q.push(phL[i]); if(phR[i])q.push(phR[i]); }
  let running=0; const MAX=4;
  (function next(){
    while(running<MAX && q.length){
      const d=q.shift(); running++;
      const im=new Image(); im.decoding='async';
      im.onload=im.onerror=()=>{ d.style.backgroundImage=`url("${d.dataset.src}")`; d.ok=true; running--; cur=-1; render(); next(); };
      im.src=d.dataset.src;
    }
  })();
}
const nearest=(arr,i)=>{ for(let k=i;k>0;k--) if(arr[k]&&arr[k].ok) return k; return 0; };

/* ---------- スクロール連動（ポスター拡大＋写真パラパラ） ---------- */
const intro=document.querySelector('.intro'), poster=document.getElementById('poster'),
      shade=document.getElementById('shade'), cue=document.getElementById('cue');
const stageEl=intro.querySelector('.stage');
let cur=-1;
const heroWord=document.getElementById('heroWord');
function introEnd(){
  const top=parseFloat(getComputedStyle(stageEl).top)||0;
  return intro.offsetTop + intro.offsetHeight - stageEl.offsetHeight - top;
}
function progress(){
  const start=intro.offsetTop, end=introEnd();
  return Math.min(1,Math.max(0,(window.scrollY-start)/(end-start)));
}
const easeOut=t=>1-Math.pow(1-t,3);
function render(){
  const p=progress();
  poster.style.transform=`translate(-50%,-50%) scale(${easeOut(p)})`;
  shade.style.opacity=(p*.82).toFixed(3);
  const idx=Math.min(N*2-1,Math.floor(p*N*2));
  if(idx!==cur){
    const li=nearest(phL,Math.min(N-1,Math.floor(idx/2))), ri=nearest(phR,Math.min(N-1,Math.floor((idx+1)/2)));
    phL.forEach((d,i)=>d.classList.toggle('on',i===li));
    phR.forEach((d,i)=>d.classList.toggle('on',i===ri));
    cur=idx;
  }
  cue.style.opacity=(p<0.05||p>=0.98)?.9:0;
  if(heroWord){ const q=Math.max(0,Math.min(1,(p-.04)/.6)); heroWord.style.opacity=(q*.95).toFixed(3); heroWord.style.transform=`scale(${(1.25-.25*easeOut(q)).toFixed(4)})`; }
}
/* ---------- ヘッダー下のスクロール進捗バー ---------- */
const hdr=document.querySelector('.hdr');
function updateProgress(){
  const max=document.documentElement.scrollHeight-window.innerHeight;
  const p=max>0?Math.min(1,Math.max(0,window.scrollY/max)):0;
  hdr.style.setProperty('--sp',p.toFixed(4));
}
let ticking=false;
/* ---------- 写真帯のパララックス ---------- */
const bands=[...document.querySelectorAll('.band-img')];
function parallax(){
  if(REDUCE) return;
  const vh=window.innerHeight;
  bands.forEach(b=>{ const r=b.parentNode.getBoundingClientRect(); if(r.bottom<0||r.top>vh) return;
    const d=(r.top+r.height/2-vh/2)/vh; b.style.transform=`translate3d(0,${(d*-14).toFixed(2)}%,0)`; });
}
window.addEventListener('scroll',()=>{if(!ticking){requestAnimationFrame(()=>{render();renderScene();updateProgress();parallax();ticking=false});ticking=true}},{passive:true});
window.addEventListener('resize',()=>{render();layoutFly();renderScene();updateProgress();});
window.addEventListener('load',updateProgress);

/* ---------- 初回自動スクロール ---------- */
if('scrollRestoration' in history) history.scrollRestoration='manual';
let autoId=null;
function stopAuto(){ if(autoId){cancelAnimationFrame(autoId);autoId=null;} }
function autoScroll(){
  const target=introEnd();
  if(REDUCE){ window.scrollTo(0,target); render(); return; }
  const from=window.scrollY, t0=performance.now();
  const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
  (function step(now){
    const t=Math.min(1,(now-t0)/AUTO_DURATION);
    window.scrollTo(0, from+(target-from)*ease(t));
    if(t<1) autoId=requestAnimationFrame(step); else autoId=null;
  })(t0);
}
['wheel','touchstart','keydown','mousedown'].forEach(ev=>window.addEventListener(ev,stopAuto,{passive:true}));
cue.addEventListener('click',()=>{stopAuto();document.querySelector('.open').scrollIntoView({behavior:REDUCE?'auto':'smooth'});});
function startIntro(){
  if(location.hash && location.hash!=='#top') return; // アンカー直リンク時は自動スクロールしない
  window.scrollTo(0,0); render();
  setTimeout(autoScroll,window.GR_LOADER?250:500);
}
// ローディングがあれば「KVが表示できた時点」で開始（全画像の読み込み完了＝loadを待たない）
if(window.GR_LOADER) window.GR_LOADER.then(startIntro); else window.addEventListener('load',startIntro);
render();
preloadMV();

/* ---------- エントリー開始カウントダウン ---------- */
const $=id=>document.getElementById(id);
function updateEntry(){
  const ms=ENTRY_START-new Date();
  if(ms<=0){
    $('cd').style.display='none';
    $('open-ttl').textContent='参加車両エントリー受付中';
    $('openState').textContent='エントリーのご案内は公式LINEでお届けしています｡';
    return false;
  }
  const d=Math.floor(ms/864e5), h=Math.floor(ms%864e5/36e5), m=Math.floor(ms%36e5/6e4), s=Math.floor(ms%6e4/1e3);
  $('cdD').textContent=d;
  $('cdH').textContent=String(h).padStart(2,'0');
  $('cdM').textContent=String(m).padStart(2,'0');
  $('cdS').textContent=String(s).padStart(2,'0');
  return true;
}
if(updateEntry()){ const t=setInterval(()=>{ if(!updateEntry()) clearInterval(t); },1000); }

/* ---------- 数字カウントアップ ---------- */
(function(){
  const els=[...document.querySelectorAll('.stats .n')];
  if(REDUCE || !('IntersectionObserver' in window) || !els.length) return;
  const fmt=n=>n.toLocaleString('ja-JP');
  els.forEach(el=>el.textContent='0');
  const io=new IntersectionObserver(es=>{
    if(!es.some(e=>e.isIntersecting)) return; io.disconnect();
    const t0=performance.now(), dur=1800;
    (function f(now){
      const t=Math.min(1,(now-t0)/dur), k=1-Math.pow(1-t,4);
      els.forEach(el=>el.textContent=fmt(Math.round(+el.dataset.to*k)));
      if(t<1)requestAnimationFrame(f); else document.querySelectorAll('.stat.big .n').forEach(n=>n.classList.add('pop'));
    })(t0);
  },{threshold:.5});
  io.observe(document.querySelector('.stats'));
})();

/* ---------- 去年の雰囲気：白→黒、写真パララックス、2026→2027 ---------- */
const gallery=$('gallery'), galHead=gallery.querySelector('.gal-head');
const scene=$('scene'), sceneStage=$('sceneStage');
const yNum=$('yNum'), dgS=$('dgS'), yrSub=$('yrSub');
const RATIOS=[0.75,1,1.25,1.5];
function seeded(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
let cols=[], colCount=0;
function flyBtn(p, label){
  const [id]=p;
  const b=document.createElement('button'); b.type='button'; b.className='fly';
  b.setAttribute('aria-label',label);
  const im=document.createElement('img'); im.src=thumb(id); im.alt=''; im.loading='lazy'; im.decoding='async';
  b.appendChild(im);
  b.addEventListener('click',()=>openLb(full(id),b));
  return b;
}
function buildCols(n){
  cols.forEach(c=>c.el.remove()); cols=[]; colCount=n;
  const r=seeded(Math.floor(Math.random()*1e9));
  const count=Math.min(PHOTOS.length, n<=3?SCENE_COUNT_SP:SCENE_COUNT_PC);
  const pick=PHOTOS.map((_,i)=>i).sort(()=>r()-.5).slice(0,count);
  for(let c=0;c<n;c++){
    const el=document.createElement('div'); el.className='col';
    cols.push({el,off:r()*.35,d:r()*.08}); sceneStage.appendChild(el);
  }
  pick.forEach((idx,k)=>{
    const b=flyBtn(PHOTOS[idx],`2026年の写真 ${idx+1} を拡大`);
    b.style.aspectRatio=`1 / ${RATIOS[Math.floor(r()*RATIOS.length)]}`;
    cols[k%n].el.appendChild(b);
  });
}
function layoutFly(){
  const W=sceneStage.clientWidth, sp=W<769, n=sp?3:8, g=sp?5:8;
  if(n!==colCount) buildCols(n);
  const cw=(W-g*(n+1))/n;
  cols.forEach((c,i)=>{
    c.el.style.width=cw+'px'; c.el.style.left=(g+i*(cw+g))+'px';
    [...c.el.children].forEach(b=>b.style.marginBottom=g+'px');
    c.h=c.el.offsetHeight;
  });
}
let hit=false, finale=false, finTimer=null;
function playFinale(){
  finale=true; dgS.classList.remove('noanim');
  dgS.style.transform=`translateY(-${11*1.1}em)`;
  finTimer=setTimeout(()=>{yNum.classList.add('done');yNum.setAttribute('aria-label','2027年');yrSub.classList.add('on');},REDUCE?0:1500);
}
function resetFinale(){
  finale=false; clearTimeout(finTimer);
  dgS.classList.add('noanim'); dgS.style.transform='translateY(0)';
  yNum.classList.remove('done'); yNum.setAttribute('aria-label','2026年'); yrSub.classList.remove('on');
}
function renderScene(){
  gallery.classList.toggle('dark', galHead.getBoundingClientRect().top < innerHeight*.6);
  const top=parseFloat(getComputedStyle(sceneStage).top)||0;
  const sTop=scene.getBoundingClientRect().top+window.scrollY-top;
  const end=sTop+scene.offsetHeight-sceneStage.offsetHeight;
  const p=Math.min(1,Math.max(0,(window.scrollY-sTop)/(end-sTop)));
  const reached=window.scrollY>=sTop-2;
  if(reached!==hit){hit=reached;yNum.classList.toggle('hit',hit);}
  const H=sceneStage.clientHeight;
  cols.forEach(c=>{
    const t=Math.min(1,Math.max(0,(p-.03-c.d)/.66));
    const from=H+c.off*H, y=from-(from+c.h+20)*t;
    c.el.style.transform=`translate3d(0,${y.toFixed(1)}px,0)`;
  });
  if(p>=.82&&!finale) playFinale();
  else if(p<.78&&finale) resetFinale();
}
layoutFly(); renderScene(); updateProgress();

/* ---------- 全写真グリッド（もっと見る） ---------- */
(function(){
  const grid=$('arcGrid'), more=$('arcMore');
  const order=PHOTOS.slice();
  let shown=0;
  $('arcCount').textContent=`全${order.length}枚`;
  function add(){
    const end=Math.min(order.length, shown+ARC_STEP);
    const frag=document.createDocumentFragment();
    for(let i=shown;i<end;i++) frag.appendChild(flyBtn(order[i],`2026年の写真 ${i+1}／${order.length} を拡大`));
    grid.appendChild(frag); shown=end;
    if(shown>=order.length) more.parentNode.style.display='none';
    else more.textContent=`もっと見る（残り${order.length-shown}枚）`;
  }
  more.addEventListener('click',add);
  add();
})();

/* ---------- 公式LINE登録者数（data/stats.json。取れないときは下の値） ---------- */
(function(){
  const FALLBACK={line_friends:1241, updated:'2026-11-23'};
  const nums=[...document.querySelectorAll('[data-line-count]')], dates=[...document.querySelectorAll('[data-line-updated]')], mils=[...document.querySelectorAll('[data-line-milestone]')];
  if(!nums.length) return;
  const fmt=n=>Math.round(n).toLocaleString('ja-JP');
  const fmtDate=d=>{ const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(d||''); return m?`${+m[1]}年${+m[2]}月${+m[3]}日`:''; };
  /* 「◯人突破」の切りのいい数：100単位（本人指示 2026-11-16）*/
  const milestone=n=>Math.max(100,Math.floor(n/100)*100);
  function apply(st){
    const to=(st&&isFinite(+st.line_friends)&&+st.line_friends>0)?+st.line_friends:FALLBACK.line_friends;
    const dt=fmtDate(st&&st.updated)||fmtDate(FALLBACK.updated);
    dates.forEach(el=>el.textContent=dt);
    mils.forEach(el=>el.textContent=fmt(milestone(to)));
    nums.forEach(el=>{
      el.textContent=fmt(to);
      if(REDUCE||!('IntersectionObserver' in window)||!el.closest('.line-proof')) return;
      el.textContent='0';
      const io=new IntersectionObserver(es=>{
        if(!es.some(e=>e.isIntersecting)) return; io.disconnect();
        const t0=performance.now(), dur=1600;
        (function f(now){ const t=Math.min(1,(now-t0)/dur); el.textContent=fmt(to*(1-Math.pow(1-t,4))); if(t<1) requestAnimationFrame(f); })(t0);
      },{threshold:.5});
      io.observe(el);
    });
  }
  let ac=null,timer=null;
  try{ ac=('AbortController' in window)?new AbortController():null; if(ac) timer=setTimeout(()=>ac.abort(),3000); }catch(e){}
  fetch('data/stats.json',{cache:'no-store',signal:ac?ac.signal:undefined})
    .then(r=>r.ok?r.json():null).catch(()=>null)
    .then(st=>{ if(timer) clearTimeout(timer); apply(st); });
})();

/* ---------- ミニゲームの累計プレイ数（js/plays.js・表示のみ） ---------- */
(function(){
  const P=window.GRPlays, box=$('lpPlays'), n=$('lpPlaysN');
  if(!P||!box||!n) return;
  P.get().then(v=>{
    if(v==null||v<P.MIN) return;   // 実数が100に届くまでは出さない
    const total=P.OFFSET+v; box.hidden=false;
    if(!('IntersectionObserver' in window)){ P.countTo(n,total,0); return; }
    const io=new IntersectionObserver(es=>{ if(es.some(e=>e.isIntersecting)){ io.disconnect(); P.countTo(n,total,1800); } },{threshold:.4});
    io.observe(box);
  }).catch(()=>{});
})();

/* ---------- ライトボックス（写真が手前に出てきて拡大） ---------- */
const lb=$('lb'), lbFig=$('lbFig'), lbImg=$('lbImg'), lbX=$('lbX');
let srcBtn=null, anim=null;
const rectOf=r=>({left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'});
function finalRect(img){
  const nw=img.naturalWidth||600, nh=img.naturalHeight||400;
  const maxW=Math.min(innerWidth*.92,1400), maxH=innerHeight-150;
  const sc=Math.min(maxW/nw,maxH/nh), w=nw*sc, h=nh*sc;
  return {left:(innerWidth-w)/2,top:Math.max(70,(innerHeight-h)/2+12),width:w,height:h};
}
function openLb(src,btn){
  if(lb.classList.contains('is-open')) return;
  stopAuto();
  srcBtn=btn; const th=btn.querySelector('img'); lbImg.src=th.currentSrc||th.src;
  lbImg.alt='2026年のGR SUMMITの会場写真（拡大）';
  const fullImg=new Image(); fullImg.onload=()=>{ if(srcBtn===btn) lbImg.src=src; }; fullImg.src=src;
  const from=btn.getBoundingClientRect(), to=finalRect(th);
  Object.assign(lbFig.style,rectOf(from));
  lb.classList.add('is-open'); btn.style.opacity='0';
  requestAnimationFrame(()=>lb.classList.add('show'));
  anim=lbFig.animate([rectOf(from),rectOf(to)],{duration:REDUCE?0:560,easing:'cubic-bezier(.2,.9,.25,1)',fill:'forwards'});
  anim.onfinish=()=>{Object.assign(lbFig.style,rectOf(to));anim.cancel();lb.classList.add('settled');lbX.focus({preventScroll:true});};
}
function closeLb(){
  if(!lb.classList.contains('is-open')||!srcBtn) return;
  lb.classList.remove('settled','show');
  const c=lbFig.getBoundingClientRect(), to=srcBtn.getBoundingClientRect();
  anim=lbFig.animate([rectOf(c),rectOf(to)],{duration:REDUCE?0:420,easing:'cubic-bezier(.5,0,.2,1)',fill:'forwards'});
  anim.onfinish=()=>{lb.classList.remove('is-open');anim.cancel();srcBtn.style.opacity='';srcBtn.focus({preventScroll:true});srcBtn=null;};
}
lbX.addEventListener('click',closeLb);
const lockScroll=e=>{if(lb.classList.contains('is-open'))e.preventDefault();};
window.addEventListener('wheel',lockScroll,{passive:false});
window.addEventListener('touchmove',lockScroll,{passive:false});
$('lbBg').addEventListener('click',closeLb);
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeLb();});

/* ---------- スクロールで軽く出てくる（動きを減らす設定では無効） ---------- */
(function(){
  if(REDUCE||!('IntersectionObserver' in window)) return;
  const sel='.sec .h2-en,.sec .h2,.sec .lead-txt,.state-big,.state-lead,.stat,.stats-note,.ol-item,.ol-list,.car-card,.flow-card,.faq details,.c-item,.band-txt,.lp-num,.lp-cta,.game-in>*,.tour-ttl,.en-grid>*';
  const els=[...document.querySelectorAll(sel)].filter(el=>!el.closest('.gal-head'));
  const io=new IntersectionObserver(es=>es.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } }),{rootMargin:'0px 0px -8% 0px',threshold:.08});
  els.forEach((el,i)=>{ const r=el.getBoundingClientRect(); if(r.top<innerHeight&&r.bottom>0) return; el.classList.add('rv'); el.style.transitionDelay=((i%4)*.06)+'s'; io.observe(el); });
})();

/* ---------- 写真帯：ランダムな写真をクロスフェード（画面内にあるときだけ） ---------- */
(function(){
  const INTERVAL=5500;
  document.querySelectorAll('.band[data-pool]').forEach(band=>{
    const holder=band.querySelector('.band-img'); if(!holder) return;
    const pool=shuffle(band.dataset.pool.split(',').map(x=>x.trim()).filter(Boolean)).map(id=>`img/gal/${id}.webp`);
    if(!pool.length) return;
    const layers=[0,1].map(()=>{ const d=document.createElement('div'); d.className='band-ph'; holder.appendChild(d); return d; });
    let idx=0, front=0, timer=null, visible=false, busy=false;
    layers[0].style.backgroundImage=`url("${pool[0]}")`; layers[0].classList.add('on');
    if(REDUCE||pool.length<2) return;
    function next(){
      if(busy) return; busy=true;
      const ni=(idx+1)%pool.length, back=1-front, im=new Image();
      im.decoding='async';
      im.onload=im.onerror=()=>{
        layers[back].style.backgroundImage=`url("${pool[ni]}")`;
        requestAnimationFrame(()=>{ layers[back].classList.add('on'); layers[front].classList.remove('on'); front=back; idx=ni; busy=false; });
      };
      im.src=pool[ni];
    }
    function run(){ if(!timer&&visible) timer=setInterval(next,INTERVAL); }
    function stop(){ if(timer){ clearInterval(timer); timer=null; } }
    if('IntersectionObserver' in window){
      new IntersectionObserver(es=>{ visible=es.some(e=>e.isIntersecting); visible?run():stop(); },{threshold:.05}).observe(band);
    } else { visible=true; run(); }
    document.addEventListener('visibilitychange',()=>{ document.hidden?stop():run(); });
  });
})();
})();
