/* テーマソング「GO TO GR!!」の再生・ダウンロード回数（Abacus。plays.jsと同じ無料カウンター）
   記録：再生ボタン（1ページ表示につき1回）とダウンロードボタン（1ページ表示につき1回）。
   表示：両方の実数の合計が100に届いたら表示する（カウントアニメーションなし。本人指示 2026-11-21）。 */
(function(){
'use strict';
const API='https://abacus.jasoncameron.dev', NS='gr-summit-lw', KEY_DL='song-dl', KEY_PLAY='song-play', TIMEOUT=20000, MIN_SHOW=100;
const $=id=>document.getElementById(id);
const btn=$('songDl'), box=$('songCnt'), n=$('songCntN');
const player=document.querySelector('.song-player');
async function call(kind,key){
  let ac=null,t=null;
  try{
    ac=('AbortController' in window)?new AbortController():null;
    if(ac) t=setTimeout(()=>ac.abort(),TIMEOUT);
    const r=await fetch(`${API}/${kind}/${NS}/${key}`,{cache:'no-store',signal:ac?ac.signal:undefined,keepalive:kind==='hit'});
    if(r.status===404) return 0;
    if(!r.ok) return null;
    const j=await r.json();
    return (j&&typeof j.value==='number'&&isFinite(j.value))?j.value:null;
  }catch(e){ return null; }
  finally{ if(t) clearTimeout(t); }
}
const cur={dl:null,play:null};
function show(){
  if(!box||!n||cur.dl===null||cur.play===null) return;
  const total=cur.dl+cur.play;
  if(total<MIN_SHOW) return;
  n.textContent=total.toLocaleString('ja-JP');
  box.hidden=false;
}
if(box&&n) Promise.all([call('get',KEY_DL),call('get',KEY_PLAY)]).then(([d,p])=>{ cur.dl=d; cur.play=p; show(); });
let sentDl=false, sentPlay=false;
if(btn) btn.addEventListener('click',()=>{ if(sentDl) return; sentDl=true; call('hit',KEY_DL).then(v=>{ if(v!==null&&cur.dl!==null){cur.dl=v; show();} }); });
if(player) player.addEventListener('play',()=>{ if(sentPlay) return; sentPlay=true; call('hit',KEY_PLAY).then(v=>{ if(v!==null&&cur.play!==null){cur.play=v; show();} }); });
})();
