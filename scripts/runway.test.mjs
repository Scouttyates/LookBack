import { test } from 'node:test';
import assert from 'node:assert/strict';
import { daysBetween, runwayStatus } from './runway.mjs';

test('daysBetween counts whole days forward', () => {
  assert.equal(daysBetween('2026-07-22', '2026-07-31'), 9);
});

test('daysBetween is negative when the target is in the past', () => {
  assert.equal(daysBetween('2026-07-31', '2026-07-22'), -9);
});

test('daysBetween is zero for the same day', () => {
  assert.equal(daysBetween('2026-07-22', '2026-07-22'), 0);
});

test('healthy runway (>= threshold days ahead) is "ok"', () => {
  const available = [
    '2026-07-22', '2026-07-23', '2026-07-24', '2026-07-25',
    '2026-07-26', '2026-07-27', '2026-07-28', '2026-07-29',
    '2026-07-30', '2026-07-31',
  ];
  const s = runwayStatus(available, '2026-07-22');
  assert.equal(s.level, 'ok');
  assert.equal(s.todayCovered, true);
  assert.equal(s.lastDate, '2026-07-31');
  assert.equal(s.bufferDays, 9);
});

test('exactly at the threshold is still "ok" (boundary is inclusive)', () => {
  // today covered, last date is today + 7 => bufferDays === 7, not < 7
  const available = [
    '2026-07-22', '2026-07-23', '2026-07-24', '2026-07-25',
    '2026-07-26', '2026-07-27', '2026-07-28', '2026-07-29',
  ];
  const s = runwayStatus(available, '2026-07-22', 7);
  assert.equal(s.bufferDays, 7);
  assert.equal(s.level, 'ok');
});

test('fewer than threshold days remaining is "warn"', () => {
  const available = ['2026-07-22', '2026-07-23', '2026-07-24', '2026-07-25'];
  const s = runwayStatus(available, '2026-07-22', 7);
  assert.equal(s.bufferDays, 3);
  assert.equal(s.level, 'warn');
});

test('today not covered is "urgent" even if future dates exist', () => {
  const available = ['2026-07-20', '2026-07-21', '2026-07-24'];
  const s = runwayStatus(available, '2026-07-22');
  assert.equal(s.todayCovered, false);
  assert.equal(s.level, 'urgent');
});

test('fully exhausted content (last date before today) is "urgent"', () => {
  const available = ['2026-07-19', '2026-07-20', '2026-07-21'];
  const s = runwayStatus(available, '2026-07-22');
  assert.equal(s.todayCovered, false);
  assert.equal(s.lastDate, '2026-07-21');
  assert.equal(s.bufferDays, -1);
  assert.equal(s.level, 'urgent');
});

test('unsorted available list is handled (lastDate is the max)', () => {
  const available = ['2026-07-31', '2026-07-22', '2026-07-25'];
  const s = runwayStatus(available, '2026-07-22');
  assert.equal(s.lastDate, '2026-07-31');
  assert.equal(s.todayCovered, true);
});

test('empty available list is "urgent"', () => {
  const s = runwayStatus([], '2026-07-22');
  assert.equal(s.todayCovered, false);
  assert.equal(s.lastDate, null);
  assert.equal(s.level, 'urgent');
});
