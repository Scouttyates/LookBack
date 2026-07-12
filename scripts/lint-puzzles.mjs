#!/usr/bin/env node
// Authoring guardrail for puzzles in public/puzzles/.
// Failures exit 1; warnings do not.
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const PUZZLES_DIR = 'public/puzzles';
const REUSE_WINDOW_DAYS = 90;
const BIAS_THRESHOLD = 0.6;
const BIAS_SAMPLE_SIZE = 30;
const MAX_IMAGE_BYTES = 800 * 1024;
const WARN_IMAGE_BYTES = 400 * 1024;

const LICENSE_ALLOWLIST = /^(public domain|pd(-|\s|$)|cc0|cc[- ]by(-sa)?(\s\d\.\d)?)/i;
const LICENSE_REJECT = /\b(nc|nd|non[- ]?commercial|no[- ]?derivatives|fair use)\b/i;

const CANONICAL_ORDER = [
  'faceFromPast', 'battlefield',
  ['whichCameFirst', 'timeline'],
  'whereInHistory', 'guessTheYear', 'atlas', 'throughLine',
];

function norm(s) {
  return (s ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

function daysBetween(aISO, bISO) {
  const a = Date.parse(`${aISO}T00:00:00Z`);
  const b = Date.parse(`${bISO}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

function collectAnswers(puzzle) {
  const words = new Set();
  const add = (w) => { const n = norm(w); if (n) words.add(n); };

  for (const r of puzzle.rounds ?? []) {
    switch (r.type) {
      case 'faceFromPast':
        add(r.options?.[r.correctIndex]);
        break;
      case 'battlefield':
        add(r.options?.[r.correctIndex]);
        break;
      case 'whichCameFirst':
        for (const p of r.pairs ?? []) { add(p.a); add(p.b); }
        break;
      case 'timeline':
        for (const e of r.events ?? []) add(e.label);
        break;
      case 'whereInHistory':
        add(r.eventQuestion?.options?.[r.eventQuestion?.correctIndex]);
        break;
      case 'guessTheYear':
        add(r.prompt?.split(/\s+/).slice(0, 6).join(' '));
        break;
      case 'atlas':
        add(r.answer);
        break;
      case 'throughLine':
        for (const g of r.groups ?? []) {
          add(g.category);
          for (const m of g.members ?? []) add(m);
        }
        break;
    }
  }
  return words;
}

function collectDecoys(puzzle) {
  const words = new Set();
  const add = (w) => { const n = norm(w); if (n) words.add(n); };
  for (const r of puzzle.rounds ?? []) {
    if (r.type === 'faceFromPast' || r.type === 'battlefield' || r.type === 'zoomOut') {
      (r.options ?? []).forEach((o, i) => { if (i !== r.correctIndex) add(o); });
    }
    if (r.type === 'whereInHistory') {
      (r.eventQuestion?.options ?? []).forEach((o, i) => { if (i !== r.eventQuestion.correctIndex) add(o); });
      (r.followUpQuestion?.options ?? []).forEach((o, i) => { if (i !== r.followUpQuestion.correctIndex) add(o); });
    }
  }
  return words;
}

function imageRefs(puzzle) {
  const refs = [];
  for (const r of puzzle.rounds ?? []) {
    if (r.image) refs.push(r.image);
  }
  return refs;
}

const files = readdirSync(PUZZLES_DIR)
  .filter((f) => f.endsWith('.json') && f !== 'index.json')
  .sort(); // ISO-date filenames sort chronologically

const puzzles = files.map((f) => ({
  file: f,
  data: JSON.parse(readFileSync(join(PUZZLES_DIR, f), 'utf8')),
}));
for (const p of puzzles) {
  p.answers = collectAnswers(p.data);
  p.decoys = collectDecoys(p.data);
}

const failures = [];
const warnings = [];

// ---- Rule 1: exactly 7 rounds, canonical order -----------------------------
for (const p of puzzles) {
  const rounds = p.data.rounds ?? [];
  if (rounds.length !== 7) {
    failures.push(`shape: ${p.file} has ${rounds.length} rounds, expected 7`);
    continue;
  }
  rounds.forEach((r, i) => {
    const expected = CANONICAL_ORDER[i];
    const ok = Array.isArray(expected) ? expected.includes(r.type) : r.type === expected;
    if (!ok) {
      failures.push(`order: ${p.file} round ${i + 1} is "${r.type}", expected ${Array.isArray(expected) ? expected.join('|') : expected}`);
    }
  });
}

// ---- Rule 2: structural checks per type ------------------------------------
for (const p of puzzles) {
  for (const r of p.data.rounds ?? []) {
    switch (r.type) {
      case 'faceFromPast':
      case 'battlefield': {
        const opts = r.options ?? [];
        if (opts.length !== 4) failures.push(`structure: ${p.file} ${r.type} needs 4 options, got ${opts.length}`);
        if (r.correctIndex < 0 || r.correctIndex > 3) failures.push(`structure: ${p.file} ${r.type} correctIndex out of range`);
        if (new Set(opts.map(norm)).size !== opts.length) failures.push(`structure: ${p.file} ${r.type} has duplicate options`);
        break;
      }
      case 'atlas': {
        if (typeof r.lat !== 'number' || r.lat < -90 || r.lat > 90) failures.push(`structure: ${p.file} atlas lat must be a number in [-90, 90]`);
        if (typeof r.lng !== 'number' || r.lng < -180 || r.lng > 180) failures.push(`structure: ${p.file} atlas lng must be a number in [-180, 180]`);
        if (!(r.tolKm >= 1)) failures.push(`structure: ${p.file} atlas tolKm must be >= 1`);
        if (!r.answer) failures.push(`structure: ${p.file} atlas missing answer`);
        if (!r.revealFact) failures.push(`structure: ${p.file} atlas missing revealFact`);
        break;
      }
      case 'throughLine': {
        const groups = r.groups ?? [];
        if (groups.length !== 4) failures.push(`structure: ${p.file} throughLine needs 4 groups, got ${groups.length}`);
        const allMembers = [];
        const categories = [];
        for (const g of groups) {
          const members = g.members ?? [];
          if (members.length !== 4) failures.push(`structure: ${p.file} throughLine group "${g.category}" needs 4 members, got ${members.length}`);
          if (!g.category) failures.push(`structure: ${p.file} throughLine group missing category`);
          categories.push(g.category);
          allMembers.push(...members);
        }
        const normMembers = allMembers.map(norm);
        if (new Set(normMembers).size !== normMembers.length) failures.push(`structure: ${p.file} throughLine has duplicate members across groups`);
        const normCategories = categories.map(norm);
        if (new Set(normCategories).size !== normCategories.length) failures.push(`structure: ${p.file} throughLine has duplicate categories`);
        for (const m of normMembers) {
          if (normCategories.includes(m)) failures.push(`structure: ${p.file} throughLine member "${m}" equals a category name`);
        }
        break;
      }
      case 'whichCameFirst': {
        const pairs = r.pairs ?? [];
        if (pairs.length !== 5) failures.push(`structure: ${p.file} whichCameFirst needs 5 pairs, got ${pairs.length}`);
        for (const pair of pairs) {
          const expectedFirst = pair.aYear <= pair.bYear ? 0 : 1;
          if (pair.firstIndex !== expectedFirst) {
            failures.push(`structure: ${p.file} whichCameFirst pair "${pair.a}"/"${pair.b}" firstIndex inconsistent with years`);
          }
        }
        break;
      }
      case 'timeline': {
        const events = r.events ?? [];
        if (events.length !== 4) failures.push(`structure: ${p.file} timeline needs 4 events, got ${events.length}`);
        for (let i = 1; i < events.length; i++) {
          if (events[i].year <= events[i - 1].year) failures.push(`structure: ${p.file} timeline events must be strictly increasing by year`);
        }
        break;
      }
      case 'whereInHistory': {
        for (const q of [r.eventQuestion, r.followUpQuestion]) {
          const opts = q?.options ?? [];
          if (opts.length !== 4) failures.push(`structure: ${p.file} whereInHistory question needs 4 options, got ${opts.length}`);
          if (q && (q.correctIndex < 0 || q.correctIndex > 3)) failures.push(`structure: ${p.file} whereInHistory correctIndex out of range`);
        }
        break;
      }
      case 'guessTheYear': {
        if (!(r.minYear < r.answerYear && r.answerYear < r.maxYear)) {
          failures.push(`structure: ${p.file} guessTheYear requires minYear < answerYear < maxYear`);
        }
        if (!(r.tolerance >= 1)) failures.push(`structure: ${p.file} guessTheYear tolerance must be >= 1`);
        break;
      }
    }
  }
}

// ---- Rule 3: 90-day no-repeat window on correct answers --------------------
for (let i = 0; i < puzzles.length; i++) {
  const current = puzzles[i];
  for (let j = i - 1; j >= 0; j--) {
    const prior = puzzles[j];
    const gap = daysBetween(prior.data.date, current.data.date);
    if (gap > REUSE_WINDOW_DAYS) break;
    if (gap <= 0) continue;
    for (const w of current.answers) {
      if (prior.answers.has(w)) {
        failures.push(`reuse: "${w}" in ${current.file} also appears as an answer in ${prior.file} (${gap} days earlier; window is ${REUSE_WINDOW_DAYS})`);
      }
    }
    for (const w of current.decoys) {
      if (prior.decoys.has(w)) {
        warnings.push(`decoy-reuse: "${w}" in ${current.file} also appears as a decoy in ${prior.file} (${gap} days earlier)`);
      }
    }
  }
}

// ---- Rule 4/5: images exist, size, attribution ------------------------------
for (const p of puzzles) {
  for (const ref of imageRefs(p.data)) {
    const relPath = ref.src.replace(/^\//, '');
    const diskPath = join('public', relPath);
    if (!existsSync(diskPath)) {
      failures.push(`missing-image: ${p.file} references "${ref.src}" which does not exist on disk`);
      continue;
    }
    const size = statSync(diskPath).size;
    if (size > MAX_IMAGE_BYTES) failures.push(`image-size: ${p.file} "${ref.src}" is ${(size / 1024).toFixed(0)} KB, over ${MAX_IMAGE_BYTES / 1024} KB limit`);
    else if (size > WARN_IMAGE_BYTES) warnings.push(`image-size: ${p.file} "${ref.src}" is ${(size / 1024).toFixed(0)} KB, consider shrinking`);

    const attr = ref.attribution;
    if (!attr || !attr.fileTitle || !attr.author || !attr.license || !attr.sourceUrl) {
      failures.push(`attribution: ${p.file} "${ref.src}" missing required attribution fields`);
    } else {
      if (LICENSE_REJECT.test(attr.license) || !LICENSE_ALLOWLIST.test(attr.license)) {
        failures.push(`license: ${p.file} "${ref.src}" license "${attr.license}" not in allowlist`);
      }
    }
  }
}

// ---- Rule 8b / warning 13: alt text leaking the answer ---------------------
for (const p of puzzles) {
  for (const r of p.data.rounds ?? []) {
    if (!r.image) continue;
    const altNorm = norm(r.image.alt);
    let answer = null;
    if (r.type === 'faceFromPast' || r.type === 'battlefield' || r.type === 'zoomOut') answer = r.options?.[r.correctIndex];
    if (r.type === 'whereInHistory') answer = r.eventQuestion?.options?.[r.eventQuestion?.correctIndex];
    if (answer && altNorm.includes(norm(answer))) {
      warnings.push(`alt-leak: ${p.file} ${r.type} alt text may reveal the answer "${answer}"`);
    }
  }
}

// ---- Rule 7: index.json consistency -----------------------------------------
try {
  const index = JSON.parse(readFileSync(join(PUZZLES_DIR, 'index.json'), 'utf8'));
  const diskDates = new Set(files.map((f) => f.replace('.json', '')));
  const indexDates = new Set(index.available ?? []);
  for (const d of diskDates) if (!indexDates.has(d)) failures.push(`index: ${d}.json exists but is missing from index.json available[]`);
  for (const d of indexDates) if (!diskDates.has(d)) failures.push(`index: index.json lists "${d}" but public/puzzles/${d}.json does not exist`);
  if (index.totalDays !== index.available?.length) failures.push(`index: totalDays (${index.totalDays}) !== available.length (${index.available?.length})`);
  const sorted = [...(index.available ?? [])].sort();
  sorted.forEach((d, i) => {
    const expectedNum = i + 1;
    const puzzle = puzzles.find((p) => p.data.date === d);
    if (puzzle && puzzle.data.puzzleNumber !== expectedNum) {
      failures.push(`index: ${puzzle.file} puzzleNumber is ${puzzle.data.puzzleNumber}, expected ${expectedNum} (day offset + 1)`);
    }
  });
} catch (err) {
  failures.push(`index: could not read/parse index.json (${err.message})`);
}

// ---- Rule: chronology-slot alternation drift (warning) ----------------------
// Chronology (whichCameFirst/timeline) is slot 3 (index 2) in CANONICAL_ORDER.
for (let i = 1; i < puzzles.length; i++) {
  const prevType = puzzles[i - 1].data.rounds?.[2]?.type;
  const curType = puzzles[i].data.rounds?.[2]?.type;
  if (prevType && curType && prevType === curType) {
    warnings.push(`alternation: ${puzzles[i].file} chronology slot type "${curType}" repeats the previous day's puzzle`);
  }
}

// ---- Rule: correctIndex bias on recent puzzles (warning) --------------------
const recent = puzzles.slice(-BIAS_SAMPLE_SIZE);
function biasCheck(getIndex, label) {
  const values = [];
  for (const p of recent) {
    for (const r of p.data.rounds ?? []) {
      const idx = getIndex(r);
      if (idx !== null && idx !== undefined) values.push(idx);
    }
  }
  if (values.length === 0) return;
  const counts = values.reduce((m, v) => { m[v] = (m[v] ?? 0) + 1; return m; }, {});
  for (const [v, c] of Object.entries(counts)) {
    if (c / values.length > BIAS_THRESHOLD) {
      warnings.push(`bias: ${label} correctIndex=${v} used in ${c}/${values.length} rounds across the last ${recent.length} puzzles (threshold ${BIAS_THRESHOLD})`);
    }
  }
}
biasCheck((r) => (r.type === 'faceFromPast' ? r.correctIndex : null), 'faceFromPast');
biasCheck((r) => (r.type === 'battlefield' ? r.correctIndex : null), 'battlefield');
biasCheck((r) => (r.type === 'zoomOut' ? r.correctIndex : null), 'zoomOut');

for (const w of warnings) console.warn(`WARN  ${w}`);
for (const f of failures) console.error(`FAIL  ${f}`);

if (failures.length > 0) {
  console.error(`\n${failures.length} failure(s), ${warnings.length} warning(s).`);
  process.exit(1);
}
console.log(`clean (${warnings.length} warning(s)).`);
