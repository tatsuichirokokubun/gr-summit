/* テーマソング「GO TO GR!!」のダウンロード回数（Abacus。plays.jsと同じ無料カウンター） */
(function(){
'use strict';
const API='https://abacus.jasoncameron.dev', NS='gr-summit-lw', KEY='song-dl', TIMEOUT=10000;
const OFFSET=0; // 表示に上乗せする数（必要ならここだけ変える）
const $=id=>document.getElementById(id);
const btn=$('songDl'), box=$('songCnt'), n=$('songCntN');
if(!btn||!box||!n) return;
async function call(kind){
  let ac=null,t=null;
  try{
    ac=('AbortController' in window)?new AbortController():null;
    if(ac) t=setTimeout(()=>ac.abort(),TIMEOUT);
    const r=await fetch(`${API}/${kind}/${NS}/${KEY}`,{cache:'no-store',signal:ac?ac.signal:undefined,keepalive:kind==='hit'});
    if(r.status===404) return 0;          // まだ1回もダウンロードされていない
    if(!r.ok) return null;
    const j=await r.json();
    return (j&&typeof j.value==='number'&&isFinite(j.value))?j.value:null;
  }catch(e){ return null; }
  finally{ if(t) clearTimeout(t); }
}
function show(v){
  if(v===null) return;
  const total=v+OFFSET;
  if(window.GRPlays&&window.GRPlays.countTo){ window.GRPlays.countTo(n,total,1200); }
  else n.textContent=Math.max(0,total).toLocaleString('ja-JP');
  box.hidden=false;
}
call('get').then(show);
let sent=false;
btn.addEventListener('click',()=>{ if(sent) return; sent=true; call('hit').then(show); });
})();
