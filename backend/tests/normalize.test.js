// TV1-01: chuẩn hóa địa điểm thành quốc gia và khu vực.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPlaceIndex, normalizePlace, normalizeText, regionMatches } from '../src/normalize.js';
import { getCatalog } from './helpers.js';

const index = createPlaceIndex();

test('normalizeText: bỏ dấu, chữ thường, ký tự lạ thành dấu cách', () => {
  assert.equal(normalizeText('Türkiye'), 'turkiye');
  assert.equal(normalizeText('U.S.A.'), 'u s a');
  assert.equal(normalizeText('Đà Nẵng'), 'da nang');
});

test('các ca khó trong dữ liệu thật', () => {
  const cases = [
    ['Hanoi, Vietnam', 'VN', 'vietnam'],
    ['Ho Chi Minh City', 'VN', 'vietnam'],              // chỉ có tên thành phố, không ghi tên nước
    ['Singapore EXPO', 'SG', 'sea'],
    ['San Francisco, CA', 'US', 'north-america'],             // "CA" không bị hiểu thành Canada
    ['Vancouver BC Canada', 'CA', 'north-america'],
    ['P.R. China', 'CN', 'east-asia'],
    ['Seoul, Republic of Korea', 'KR', 'east-asia'],
    ['Paphos, Cyprus (Hybrid)', 'CY', 'europe'],
    ['Edinburgh, Scotland', 'GB', 'europe'],
    ['Tbilisi, Georgia', 'GE', 'europe'],               // Georgia là nước, không phải bang Mỹ
    ['Cape Town, South Africa', 'ZA', 'africa'],
  ];
  for (const [place, country, region] of cases) {
    assert.deepEqual(normalizePlace(place, index), { country, region }, place);
  }
});

test('không đoán quốc gia; Virtual/Online thành khu vực trực tuyến', () => {
  for (const place of ['Virtual', 'Online', 'Virtual conference']) {
    assert.deepEqual(normalizePlace(place, index), { country: null, region: 'online' }, place);
  }
  for (const place of ['TBD', '', null, "co-located with SIGCOMM'24"]) {
    assert.deepEqual(normalizePlace(place, index), { country: null, region: null }, String(place));
  }
});

test('khu vực cha con: chọn châu Á gồm cả Đông Nam Á và Việt Nam', () => {
  assert.equal(regionMatches('vietnam', 'asia'), true);
  assert.equal(regionMatches('sea', 'asia'), true);
  assert.equal(regionMatches('vietnam', 'sea'), true);
  assert.equal(regionMatches('asia', 'sea'), false);
  assert.equal(regionMatches('europe', 'asia'), false);
  assert.equal(regionMatches(null, 'asia'), false);
  assert.equal(regionMatches(null, null), true);
  assert.equal(regionMatches('east-asia', 'asia'), true);
  assert.equal(regionMatches('north-america', 'america'), true);
  assert.equal(regionMatches('latin-america', 'north-america'), false);
});

test('dữ liệu thật: mọi kỳ có địa điểm thật đều nhận ra quốc gia, Việt Nam có 11 kỳ', async () => {
  const { editions } = await getCatalog();
  const online = /virtual|online|tbd|co-located/i;
  const physical = editions.filter((edition) => edition.place && !online.test(edition.place.replace(/\(.*?\)|and online|& online|& virtual|; virtual/gi, '')));
  const missing = physical.filter((edition) => !edition.country).map((edition) => edition.place);
  assert.deepEqual(missing, []);
  assert.equal(editions.filter((edition) => edition.country === 'VN').length, 11);
});
