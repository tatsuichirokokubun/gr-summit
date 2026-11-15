/* GR SUMMIT DASH 累計プレイ数（LPとゲームページで共通） */
(function(){
'use strict';
const PLAY_OFFSET = 2000;   // 表示に上乗せする数（変更はここだけ。LP・ゲームの両方に反映）
const API = 'https://abacus.jasoncameron.dev', NS = 'gr-summit-lw', KEY = 'plays';
const TIMEOUT = 3000;       // 3秒で打ち切り（失敗しても画面は壊さない）
const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;

async function call(kind){
  let ac=null, t=null;
  try{
    ac = ('AbortController' in window) ? new AbortController() : null;
    if(ac) t = setTimeout(()=>ac.abort(), TIMEOUT);
    const r = await fetch(`${API}/${kind}/${NS}/${KEY}`, {cache:'no-store', signal: ac ? ac.signal : undefined});
    if(!r.ok) return null;
    const j = await r.json();
    return (j && typeof j.value === 'number' && isFinite(j.value)) ? j.value : null;
  }catch(e){ return null; }
  finally{ if(t) clearTimeout(t); }
}
const fmt = n => Math.max(0, Math.round(n)).toLocaleString('ja-JP');
// 数字を現在値から目標値までカウントアップ
function countTo(el, to, dur){
  if(!el) return;
  const from = +(el.dataset.v || 0);
  el.dataset.v = to;
  if(REDUCE || from === to){ el.textContent = fmt(to); return; }
  const t0 = performance.now(), d = dur || 1600;
  if(el._raf) cancelAnimationFrame(el._raf);
  (function f(now){
    const t = Math.min(1, (now - t0) / d), k = 1 - Math.pow(1 - t, 4);
    el.textContent = fmt(from + (to - from) * k);
    if(t < 1) el._raf = requestAnimationFrame(f);
  })(t0);
}
window.GRPlays = {
  OFFSET: PLAY_OFFSET,
  get: () => call('get'),
  hit: () => call('hit'),
  countTo
};
})();
