#!/usr/bin/env node
// Generates public/borders/<slug>.svg outline files from world-atlas's
// Natural-Earth-derived 50m TopoJSON (public domain, no attribution required).
//
// Usage: node scripts/generate-borders.mjs
// Add new countries to COUNTRY_SLUGS below, then re-run — it's idempotent and
// only touches the slugs listed here.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { feature } from 'topojson-client';
import { geoMercator, geoPath, geoArea } from 'd3-geo';

const OUT_DIR = 'public/borders';
const VIEWBOX = 300;
const PAD = 10;

// name (as it appears in world-atlas properties.name) -> { slug, keepAll? }
// keepAll: true retains every polygon of a MultiPolygon (archipelagos/exclaves);
// default keeps only the largest-area polygon (drops distortion like Alaska).
const COUNTRY_SLUGS = {
  Italy: { slug: 'italy' },
  Japan: { slug: 'japan', keepAll: true },
  Chile: { slug: 'chile' },
  Egypt: { slug: 'egypt' },
  India: { slug: 'india' },
  Brazil: { slug: 'brazil' },
  Greece: { slug: 'greece', keepAll: true },
  France: { slug: 'france' },
  Turkey: { slug: 'turkey' },
  Canada: { slug: 'canada', keepAll: true },
};

mkdirSync(OUT_DIR, { recursive: true });

const topo = JSON.parse(readFileSync('node_modules/world-atlas/countries-50m.json', 'utf8'));
const collection = feature(topo, topo.objects.countries);

function largestPolygon(geometry) {
  if (geometry.type !== 'MultiPolygon') return geometry;
  let best = null;
  let bestArea = -Infinity;
  for (const coords of geometry.coordinates) {
    const candidate = { type: 'Polygon', coordinates: coords };
    const a = geoArea(candidate);
    if (a > bestArea) { bestArea = a; best = candidate; }
  }
  return best;
}

let written = 0;
const missing = [];

for (const [name, cfg] of Object.entries(COUNTRY_SLUGS)) {
  const found = collection.features.find((f) => f.properties.name === name);
  if (!found) { missing.push(name); continue; }

  const geometry = cfg.keepAll ? found.geometry : largestPolygon(found.geometry);
  const feat = { type: 'Feature', geometry, properties: {} };

  const projection = geoMercator().fitExtent(
    [[PAD, PAD], [VIEWBOX - PAD, VIEWBOX - PAD]],
    feat,
  );
  const path = geoPath(projection);
  const d = path(feat);

  const svg = `<svg viewBox="0 0 ${VIEWBOX} ${VIEWBOX}" xmlns="http://www.w3.org/2000/svg">\n  <path d="${d}" fill="none" stroke="currentColor" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"/>\n</svg>\n`;
  writeFileSync(join(OUT_DIR, `${cfg.slug}.svg`), svg);
  written += 1;
  console.log(`wrote ${cfg.slug}.svg`);
}

if (missing.length) {
  console.error(`Could not find country in world-atlas by name: ${missing.join(', ')}`);
  process.exit(1);
}
console.log(`${written} border SVG(s) written to ${OUT_DIR}/`);
