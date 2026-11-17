import { newMeta } from './sim.js';

const KEY = 'bungeoppang-tycoon';

export function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s?.v === 1) return s;
  } catch {}
  return { v: 1, meta: newMeta(Date.now()), run: null };
}

export function save(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} // 사생활 보호 모드 등: 저장 없이 계속 플레이
}
