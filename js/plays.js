/* GR SUMMIT DASH 累計プレイ数（LPとゲームページで共通） */
(function(){
'use strict';
const PLAY_OFFSET = 36;   // 表示に上乗せする数（変更はここだけ。LP・ゲームの両方に反映）
const API = 'https://abacus.jasoncameron.dev', NS = 'gr-summit-lw', KEY = 'plays';
const TIMEOUT = 10000;      // 10秒で打ち切り（無料サービスが遅いことがあるため。失敗しても画面は壊さない）
const CACHE = 'grPlaysLast'; // 前回取れた実数（この端末だけ）。取れないときの表示に使う
function readCache(){ try{ const v=+localStorage.getItem(CACHE); return (isFinite(v)&&v>0)?v:null; }catch(e){ return null; } }
function writeCache(v){ try{ const c=readCache(); if(c===null||v>c) localStorage.setItem(CACHE,String(v)); }catch(e){} }
const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;

async function call(kind){
  let ac=null, t=null;
  try{
    ac = ('AbortController' in window) ? new AbortController() : null;
    if(ac) t = setTimeout(()=>ac.abort(), TIMEOUT);
    const r = await fetch(`${API}/${kind}/${NS}/${KEY}`, {cache:'no-store', signal: ac ? ac.signal : undefined});
    if(!r.ok) return readCache();
    const j = await r.json();
    const v = (j && typeof j.value === 'number' && isFinite(j.value)) ? j.value : null;
    if(v!==null) writeCache(v);
    return v!==null ? v : readCache();
  }catch(e){ return readCache(); }
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
