// Chủ: TV1 (TV1-08). Đọc data/cfp/<seriesKey>.txt, gọi Gemini tóm tắt thành { summary, topics[] },
// ghi vào series[key] trong data/catalog.enriched.json.
//
// - Gemini free tier giới hạn số lượt mỗi phút, nên giãn 4,5 giây giữa hai lần gọi.
// - Gặp HTTP 429 (hết quota) thì dừng cả lượt, lần chạy sau làm tiếp phần còn lại.
//
// Chạy thử: npm run enrich -- --limit=10
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { ENRICHED_PATH, readJsonIfExists, writeJsonAtomic } from '../src/catalog.js';
import { cfpFileName } from '../src/cfp-crawler.js';
import { loadConfig } from '../src/config.js';
import { ENRICH_SCHEMA, ENRICH_SYSTEM, ENRICH_VERSION, buildEnrichUser, pickSeriesToEnrich, validateEnrichment } from '../src/enrich.js';
import { generateJson } from '../src/gemini.js';

const CFP_DIR = new URL('../data/cfp/', import.meta.url);
const DELAY_MS = 4500;
const limitArg = process.argv.find((arg) => arg.startsWith('--limit='));
const limit = limitArg ? Number.parseInt(limitArg.split('=')[1], 10) || 100 : 100;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const textPath = (seriesKey) => new URL(cfpFileName(seriesKey), CFP_DIR);

try {
  const { gemini } = loadConfig();
  if (!gemini.apiKey || !gemini.model) throw new Error('Thiếu GEMINI_API_KEY hoặc GEMINI_MODEL.');
  const catalog = await readJsonIfExists(ENRICHED_PATH);
  if (!catalog) throw new Error('Chưa có data/catalog.enriched.json, chạy npm run ingest trước.');

  const targets = pickSeriesToEnrich(catalog, (key) => existsSync(textPath(key)), { limit });
  console.log(`Enrich ${targets.length} chuỗi bằng ${gemini.model} (giới hạn ${limit}).`);

  // Bọc fetch để biết mã HTTP cuối cùng: generateJson chỉ ném lỗi chung, không lộ chi tiết ra ngoài.
  let lastStatus = 0;
  const fetchImpl = async (...args) => {
    const response = await fetch(...args);
    lastStatus = response.status;
    return response;
  };

  let ok = 0;
  let failed = 0;
  for (const [index, target] of targets.entries()) {
    if (index) await sleep(DELAY_MS);
    const text = await readFile(textPath(target.seriesKey), 'utf8');
    const info = { ...catalog.series[target.seriesKey], enrichTriedAt: new Date().toISOString() };
    let result = null;
    try {
      const raw = await generateJson(gemini, {
        system: ENRICH_SYSTEM,
        user: buildEnrichUser({ ...target, text }),
        schema: ENRICH_SCHEMA,
        timeoutMs: 30_000,
        temperature: 0,
        maxOutputTokens: 1024,
      }, { fetchImpl });
      result = validateEnrichment(raw);
      if (!result) info.enrichError = 'kết quả không đạt kiểm tra (thiếu topics hoặc summary)';
    } catch (error) {
      if (lastStatus === 429) {
        console.warn('Gemini báo hết quota (429), dừng lượt này.');
        break;
      }
      info.enrichError = error.message;
    }

    if (result) {
      Object.assign(info, result, { enrichedAt: new Date().toISOString(), enrichModel: gemini.model, enrichVersion: ENRICH_VERSION });
      delete info.enrichError;
      ok += 1;
    } else {
      failed += 1;
    }
    catalog.series[target.seriesKey] = info;
    console.log(`  [${index + 1}/${targets.length}] ${target.acronym}: ${result ? result.topics.slice(0, 4).join(', ') : `bỏ: ${info.enrichError}`}`);
    if ((index + 1) % 10 === 0) await writeJsonAtomic(ENRICHED_PATH, catalog);
  }

  await writeJsonAtomic(ENRICHED_PATH, catalog);
  console.log(`Enrich xong: ${ok} thành công, ${failed} bị bỏ.`);
} catch (error) {
  console.error(`Enrich lỗi: ${error.message}`);
  process.exitCode = 1;
}
