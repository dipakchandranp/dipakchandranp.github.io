// Shared by the page (guest play) and by the Worker (signed-in play). Pure functions only: no DOM, no storage.
// data = { category: [group], meaning: [group] }; group = { id, type, level 1-3, en, family, words[], hard[] }
export const LIVES = 4, PER_GROUP = 4, GROUPS = 4;
export const MAX_LEVEL = 5;

// What each play level asks for. "maxGroupLevel" limits which groups can appear; "hard" is how many of the
// 4 words per group come from the literary / harder list; "pairs" is how many look-alike group pairs
// (two groups from the same family, e.g. two nature words) are placed in the same puzzle.
export const LEVELS = {
  1: { maxGroupLevel: 1, hard: 0, pairs: 0, meaning: [2, 2] },
  2: { maxGroupLevel: 2, hard: 0, pairs: 0, meaning: [1, 3] },
  3: { maxGroupLevel: 2, hard: 1, pairs: 1, meaning: [1, 3] },
  4: { maxGroupLevel: 3, hard: 2, pairs: 1, meaning: [1, 3] },
  5: { maxGroupLevel: 3, hard: 2, pairs: 2, meaning: [1, 3] },
};
export const levelCfg = l => LEVELS[Math.min(MAX_LEVEL, Math.max(1, l | 0 || 1))];

const pick = (arr, rand) => arr[Math.floor(rand() * arr.length)];
export function shuffle(arr, rand) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

function chooseGroups(pool, cfg, rand, anyFamily) {
  // returns 4 groups or null. Target type mix first, then look-alike pairs, then distinct families.
  const nMeaning = cfg.meaning[0] + Math.floor(rand() * (cfg.meaning[1] - cfg.meaning[0] + 1));
  const want = { meaning: nMeaning, category: GROUPS - nMeaning };
  const chosen = [], fams = new Set();
  const take = g => { chosen.push(g); want[g.type]--; };
  const free = g => !chosen.includes(g);
  // look-alike pairs
  for (let p = 0; p < cfg.pairs; p++) {
    const byFam = {};
    for (const g of pool) if (free(g) && want[g.type] > 0 && !fams.has(g.family)) (byFam[g.family] ||= []).push(g);
    const fl = Object.values(byFam).filter(l => l.length >= 2);
    if (!fl.length) break;
    const l = shuffle(pick(fl, rand), rand);
    // different types in a pair makes the puzzle harder: prefer it when possible
    const a = l[0], b = l.find(x => x !== a && x.type !== a.type && want[x.type] > (x.type === a.type ? 1 : 0)) || l.find(x => x !== a && want[x.type] > (x.type === a.type ? 0 : -1));
    if (!b || (a.type === b.type && want[a.type] < 2)) break;
    fams.add(a.family); take(a); take(b);
  }
  // fill: pass 0 respects the type quota and new families, pass 1 relaxes the quota, pass 2 relaxes families too
  for (let pass = 0; pass < (anyFamily ? 3 : 2) && chosen.length < GROUPS; pass++) {
    let guard = 0;
    while (chosen.length < GROUPS && guard++ < 200) {
      const cand = pool.filter(g => free(g) && (pass > 0 || want[g.type] > 0) && (pass > 1 || !fams.has(g.family)));
      if (!cand.length) break;
      const g = pick(cand, rand); fams.add(g.family); chosen.push(g); want[g.type]--;
    }
  }
  return chosen.length === GROUPS ? chosen : null;
}

function chooseWords(g, nHard, rand) {
  const easy = shuffle(g.words, rand), hard = shuffle(g.hard, rand);
  const h = Math.min(nHard, hard.length, PER_GROUP);
  const out = hard.slice(0, h);
  for (const w of easy) if (out.length < PER_GROUP) out.push(w);
  for (const w of hard.slice(h)) if (out.length < PER_GROUP) out.push(w);
  return out.length === PER_GROUP ? out : null;
}

/**
 * Build one puzzle.
 *  exclude: Set of group ids already played in this session (preferred to avoid; cleared when the pool runs dry)
 *  last:    { sig, ids } of the previous puzzle - never repeated, and its groups are avoided
 * returns { level, groups:[{id,type,en,words:[4]}], cards:[16 words, shuffled], answer:[[idx x4] x4], sig, ids, reset }
 */
export function buildPuzzle(data, level, rand, exclude = new Set(), last = null) {
  const cfg = levelCfg(level), all = [...data.category, ...data.meaning].filter(g => g.level <= cfg.maxGroupLevel && g.words.length + g.hard.length >= PER_GROUP);
  const lastIds = new Set(last?.ids || []);
  let reset = false;
  for (let attempt = 0; attempt < 40; attempt++) {
    const phase = attempt < 20 ? 0 : attempt < 30 ? 1 : 2; // 0: unseen only, 1: only avoid last puzzle, 2: anything
    let pool = all;
    if (phase === 0) pool = all.filter(g => !exclude.has(g.id) && !lastIds.has(g.id));
    else if (phase === 1) { pool = all.filter(g => !lastIds.has(g.id)); reset = true; }
    else reset = true;
    const gs = chooseGroups(pool, cfg, rand, phase === 2);
    if (!gs) continue;
    const picked = gs.map(g => ({ g, words: chooseWords(g, cfg.hard, rand) }));
    if (picked.some(p => !p.words)) continue;
    const ids = picked.map(p => p.g.id).sort(), sig = ids.join('+') + ':' + picked.map(p => p.words.slice().sort().join(',')).sort().join('|');
    if (last && sig === last.sig) continue;
    const flat = picked.flatMap((p, gi) => p.words.map(w => ({ w, gi })));
    const order = shuffle(flat, rand);
    const answer = [[], [], [], []];
    order.forEach((c, i) => answer[c.gi].push(i));
    return {
      level: Math.min(MAX_LEVEL, Math.max(1, level | 0 || 1)),
      groups: picked.map(p => ({ id: p.g.id, type: p.g.type, en: p.g.en, words: p.words })),
      cards: order.map(c => c.w), answer, sig, ids, reset,
    };
  }
  throw new Error('cannot build puzzle');
}

// Which group (index) does this pick belong to? -> { group: gi | -1, best: max overlap with any group }
export function judge(answer, pickIdx) {
  let best = 0, gi = -1;
  answer.forEach((a, i) => { const n = pickIdx.filter(x => a.includes(x)).length; if (n > best) { best = n; gi = i; } });
  return best === PER_GROUP ? { group: gi, best } : { group: -1, best };
}

// Score rule (identical in guest and signed-in play; the Worker is the only one whose score is saved):
//   cap by level: 70 (L1-2), 85 (L3-4), 100 (L5+)
//   minus 8 per mistake, minus 1 per 3 s after the first 30 s (at most 40)
//   a solved round is worth at least 10; a lost round is worth 0
export function scoreRound({ level, mistakes, ms, solved }) {
  if (!solved) return 0;
  const cap = level >= 5 ? 100 : level >= 3 ? 85 : 70;
  const slow = Math.min(40, Math.floor(Math.max(0, ms - 30000) / 3000));
  return Math.max(10, cap - 8 * Math.max(0, mistakes) - slow);
}
export const validPick = (p, solvedCards = []) =>
  Array.isArray(p) && p.length === PER_GROUP && p.every(i => Number.isInteger(i) && i >= 0 && i < GROUPS * PER_GROUP && !solvedCards.includes(i)) && new Set(p).size === PER_GROUP;
