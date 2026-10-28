// TV1: trang chỉ gọi getCatalog, không tự fetch một endpoint khác.
import { API_ENDPOINT, SNAPSHOT_URL } from './config.js';
import { normalizeCatalog } from './data-adapter.js';

let cachedCatalogPromise = null;

function validateCatalog(catalog) {
  if (!catalog || typeof catalog !== 'object') {
    throw new Error('Catalog phải là một object.');
  }
  if (!catalog.meta || typeof catalog.meta !== 'object') {
    throw new Error('Catalog thiếu trường meta.');
  }
  if (!Array.isArray(catalog.editions)) {
    throw new Error('Catalog thiếu danh sách editions (cần là mảng).');
  }

  for (let i = 0; i < Math.min(catalog.editions.length, 50); i += 1) {
    const item = catalog.editions[i];
    if (!item.id || typeof item.id !== 'string') {
      throw new Error(`Edition thứ ${i} thiếu trường ID hợp lệ.`);
    }
    if (!item.seriesKey || !item.acronym) {
      throw new Error(`Edition ${item.id} thiếu seriesKey hoặc acronym.`);
    }
    if (!Array.isArray(item.rounds)) {
      throw new Error(`Edition ${item.id} thiếu mảng rounds.`);
    }
  }
}

async function loadSnapshot({ signal } = {}) {
  const response = await fetch(SNAPSHOT_URL, { signal });
  if (!response.ok) {
    throw new Error(`Không tải được snapshot dự phòng (HTTP ${response.status}).`);
  }
  const raw = await response.json();
  const catalog = normalizeCatalog(raw);
  validateCatalog(catalog);
  return {
    meta: {
      ...catalog.meta,
      mode: 'snapshot',
      loadedAt: new Date().toISOString(),
    },
    editions: catalog.editions,
  };
}

async function fetchCatalog({ signal } = {}) {
  if (API_ENDPOINT) {
    try {
      let fetchSignal = signal;
      if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
        const timeoutSignal = AbortSignal.timeout(8000);
        if (signal && typeof AbortSignal.any === 'function') {
          fetchSignal = AbortSignal.any([signal, timeoutSignal]);
        } else if (!signal) {
          fetchSignal = timeoutSignal;
        }
      }

      const response = await fetch(API_ENDPOINT, { signal: fetchSignal });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} khi gọi API live.`);
      }

      const rawData = await response.json();
      const catalog = normalizeCatalog(rawData);
      validateCatalog(catalog);

      return {
        meta: {
          ...catalog.meta,
          mode: 'live',
          loadedAt: new Date().toISOString(),
        },
        editions: catalog.editions,
      };
    } catch (liveError) {
      console.warn('Không thể tải từ Live API CCFDDL, chuyển sang fallback snapshot dự phòng:', liveError.message);
    }
  }

  return loadSnapshot({ signal });
}


export async function getCatalog({ signal, forceReload = false } = {}) {
  if (cachedCatalogPromise && !forceReload) {
    return cachedCatalogPromise;
  }

  cachedCatalogPromise = fetchCatalog({ signal }).catch(error => {
    cachedCatalogPromise = null;
    throw error;
  });

  return cachedCatalogPromise;
}
