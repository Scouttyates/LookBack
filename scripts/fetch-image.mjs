#!/usr/bin/env node
// Fetches images from Wikimedia Commons with license verification, for
// LookBack puzzle authoring. Zero dependencies — uses Node's native fetch.
//
// Search:  node scripts/fetch-image.mjs --search "battle of hastings tapestry"
// Fetch:   node scripts/fetch-image.mjs --title "File:X.jpg" --out public/images/2026-07-13/battle.jpg --width 1200
//
// On fetch, prints a ready-to-paste `attribution` JSON block to stdout and
// fails hard (exit 1) if the license isn't in the allowlist.
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const UA = 'LookBack-daily-game/1.0 (scout@founderinstitute.com)';
const API = 'https://commons.wikimedia.org/w/api.php';

const LICENSE_ALLOWLIST = /^(public domain|pd(-|\s|$)|cc0|cc[- ]by(-sa)?(\s\d\.\d)?)/i;
const LICENSE_REJECT = /\b(nc|nd|non[- ]?commercial|no[- ]?derivatives|fair use)\b/i;

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
      out[key] = val;
    }
  }
  return out;
}

function stripHtml(s) {
  return (s ?? '').replace(/<[^>]*>/g, '').trim();
}

async function apiGet(params) {
  const url = new URL(API);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`Commons API ${res.status}: ${url}`);
  return res.json();
}

async function search(term) {
  const data = await apiGet({
    action: 'query',
    list: 'search',
    srsearch: term,
    srnamespace: '6',
    srlimit: '10',
    format: 'json',
  });
  const results = data.query?.search ?? [];
  if (!results.length) {
    console.log('No results.');
    return;
  }
  for (const r of results) {
    console.log(`${r.title}  (${Math.round((r.size ?? 0) / 1024)} KB)`);
  }
}

async function fetchImage({ title, out, width }) {
  const w = width ? String(width) : '1200';
  const data = await apiGet({
    action: 'query',
    titles: title,
    prop: 'imageinfo',
    iiprop: 'url|extmetadata|size|mime',
    iiurlwidth: w,
    format: 'json',
  });
  const pages = data.query?.pages ?? {};
  const page = Object.values(pages)[0];
  const info = page?.imageinfo?.[0];
  if (!info) throw new Error(`No imageinfo for "${title}" — check the exact File: title with --search`);

  const meta = info.extmetadata ?? {};
  const license = meta.LicenseShortName?.value ?? '';
  const licenseUrl = meta.LicenseUrl?.value ?? '';
  const author = stripHtml(meta.Artist?.value) || 'Unknown';
  const sourceUrl = info.descriptionurl;

  if (LICENSE_REJECT.test(license) || !LICENSE_ALLOWLIST.test(license)) {
    console.error(`FAIL  license "${license}" for "${title}" is not in the allowlist (PD/CC0/CC BY/CC BY-SA only). Refusing to download.`);
    process.exit(1);
  }

  const downloadUrl = info.thumburl ?? info.url;
  const imgRes = await fetch(downloadUrl, { headers: { 'User-Agent': UA } });
  if (!imgRes.ok) throw new Error(`Download failed ${imgRes.status}: ${downloadUrl}`);
  const buf = Buffer.from(await imgRes.arrayBuffer());

  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, buf);

  console.log(`Wrote ${out} (${(buf.length / 1024).toFixed(0)} KB)`);
  console.log('\nattribution block:');
  console.log(JSON.stringify({
    fileTitle: title,
    author,
    license,
    licenseUrl,
    sourceUrl,
  }, null, 2));
}

const args = parseArgs(process.argv.slice(2));

if (args.search) {
  await search(args.search);
} else if (args.title && args.out) {
  await fetchImage({ title: args.title, out: args.out, width: args.width });
} else {
  console.log('Usage:');
  console.log('  node scripts/fetch-image.mjs --search "<terms>"');
  console.log('  node scripts/fetch-image.mjs --title "File:X.jpg" --out public/images/<date>/<slot>.jpg [--width 1200]');
  process.exit(1);
}
