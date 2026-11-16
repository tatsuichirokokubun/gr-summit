/* GR SUMMIT LP — ローディング（FV前）：ロゴ → 赤ライン → 「富士で再び｡」
   ・KV画像（#posterImg）とWebフォントが用意できたら終了（全画像の読み込み完了は待たない）
   ・最短 MIN ms 見せる／最長 MAX ms で必ず終了
   ・同じタブで2回目以降の表示ではローディングを出さない（KVが出たらすぐ開始）
   ・window.GR_LOADER（Promise）が解決したら main.js がアニメーションを開始 */
(function(){
  'use strict';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hold = /[?&]hold=1/.test(location.search); // 確認用：ローディングを出したまま止める
  var MIN = reduce ? 0 : 1700, MAX = 3000;
  var t0 = performance.now();

  function kvReady(){
    return new Promise(function(res){
      function go(){
        var img = document.getElementById('posterImg');
        if (!img) return res();
        if (img.complete && img.naturalWidth) return (img.decode ? img.decode().catch(function(){}) : Promise.resolve()).then(res);
        img.addEventListener('load', function(){ res(); }, { once: true });
        img.addEventListener('error', function(){ res(); }, { once: true });
      }
      document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', go, { once: true }) : go();
    });
  }
  var cap = new Promise(function(res){ setTimeout(res, MAX); });

  var seen = false;
  try { seen = sessionStorage.getItem('gr_ldr') === '1'; sessionStorage.setItem('gr_ldr', '1'); } catch (e) {}
  if (seen && !hold) { window.GR_LOADER = Promise.race([kvReady(), cap]); return; }

  var el = document.createElement('div');
  el.className = 'ldr ldr-a';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-label', '読み込み中');
  var copy = '富士で再び｡'.split('').map(function(c, i){
    return '<span style="animation-delay:' + (1.15 + i * .07).toFixed(2) + 's">' + c + '</span>';
  }).join('');
  el.innerHTML =
    '<img class="ldr-logo" src="img/logo-w.png" width="320" height="125" alt="">' +
    '<div class="ldr-line"></div>' +
    '<p class="ldr-copy" aria-hidden="true">' + copy + '</p>';
  document.documentElement.classList.add('ldr-on');
  (document.body || document.documentElement).appendChild(el);

  var fonts = (document.fonts && document.fonts.ready) ? document.fonts.ready.catch(function(){}) : Promise.resolve();
  window.GR_LOADER = Promise.race([Promise.all([kvReady(), fonts]), cap]).then(function(){
    var wait = Math.max(0, MIN - (performance.now() - t0));
    return new Promise(function(res){ setTimeout(res, wait); });
  }).then(function(){
    if (hold) return new Promise(function(){});
    return new Promise(function(res){
      setTimeout(function(){
        el.classList.add('out');
        document.documentElement.classList.remove('ldr-on');
        setTimeout(function(){ el.remove(); }, 600);
        res();
      }, 250);
    });
  });
})();
