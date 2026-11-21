/* テーマソング「GO TO GR!!」の再生・ダウンロード回数（Abacus。plays.jsと同じ無料カウンター）
   表示は「再生ボタンが押された回数（1ページ表示につき1回）＋ダウンロードボタンが押された回数」の実数。 */
(function(){
'use strict';
const API='https://abacus.jasoncameron.dev', NS='gr-summit-lw', KEY_DL='song-dl', KEY_PLAY='song-play', TIMEOUT=20000;
const $=id=>document.getElementById(id);
const btn=$('songDl'), box=$('songCnt'), n=$('songCntN');
const player=document.querySelector('.song-player');
if(!btn||!box||!n) return;
async function call(kind,key){
  let ac=null,t=null;
  try{
    ac=('AbortController' in window)?new AbortController():null;
    if(ac) t=setTimeout(()=>ac.abort(),TIMEOUT);
    const r=await fetch(`${API}/${kind}/${NS}/${key}`,{cache:'no-store',signal:ac?ac.signal:undefined,keepalive:kind==='hit'});
    if(r.status===404) return 0;          // まだ1回も数えられていない
    if(!r.ok) return null;
    const j=await r.json();
    return (j&&typeof j.value==='number'&&isFinite(j.value))?j.value:null;
  }catch(e){ return null; }
  finally{ if(t) clearTimeout(t); }
}
const cur={dl:null,play:null};
function show(){
  if(cur.dl===null&&cur.play===null) return;
  const total=(cur.dl||0)+(cur.play||0);
  if(window.GRPlays&&window.GRPlays.countTo){ window.GRPlays.countTo(n,total,1200); }
  else n.textContent=Math.max(0,total).toLocaleString('ja-JP');
  box.hidden=false;
}
Promise.all([call('get',KEY_DL),call('get',KEY_PLAY)]).then(([d,p])=>{ cur.dl=d; cur.play=p; show(); });
let sentDl=false, sentPlay=false;
btn.addEventListener('click',()=>{ if(sentDl) return; sentDl=true; call('hit',KEY_DL).then(v=>{ if(v!==null){cur.dl=v; show();} }); });
if(player) player.addEventListener('play',()=>{ if(sentPlay) return; sentPlay=true; call('hit',KEY_PLAY).then(v=>{ if(v!==null){cur.play=v; show();} }); });
})();
