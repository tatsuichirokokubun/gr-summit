/* テーマソング「GO TO GR!!」の再生・ダウンロード回数の記録（Abacus。サイトには表示しない・集計用）
   再生ボタン：1ページ表示につき1回、ダウンロードボタン：1ページ表示につき1回。 */
(function(){
'use strict';
const API='https://abacus.jasoncameron.dev', NS='gr-summit-lw', KEY_DL='song-dl', KEY_PLAY='song-play';
const btn=document.getElementById('songDl');
const player=document.querySelector('.song-player');
function hit(key){
  try{ fetch(`${API}/hit/${NS}/${key}`,{cache:'no-store',keepalive:true}).catch(()=>{}); }catch(e){}
}
let sentDl=false, sentPlay=false;
if(btn) btn.addEventListener('click',()=>{ if(sentDl) return; sentDl=true; hit(KEY_DL); });
if(player) player.addEventListener('play',()=>{ if(sentPlay) return; sentPlay=true; hit(KEY_PLAY); });
})();
