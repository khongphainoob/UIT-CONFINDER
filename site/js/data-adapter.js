// TV1: chuẩn hóa nguồn thô tại một nơi, không ép UI phụ thuộc schema CCFDDL.

export function parseTimezoneOffset(tz) {
  if (!tz || typeof tz !== 'string') return null;
  const clean = tz.trim();
  const upper = clean.toUpperCase();

  // AoE = UTC-12 (Anywhere on Earth) khi nguồn chỉ rõ
  if (upper === 'AOE' || upper === 'UTC-12' || upper === 'GMT-12' || upper === 'UTC-12:00' || upper === 'GMT-12:00') {
    return '-12:00';
  }
  if (upper === 'UTC' || upper === 'GMT' || upper === 'UTC+0' || upper === 'UTC-0' || upper === 'Z') {
    return '+00:00';
  }
  if (upper === 'PT' || upper === 'PST') return '-08:00';
  if (upper === 'PDT') return '-07:00';
  if (upper === 'EST') return '-05:00';
  if (upper === 'EDT') return '-04:00';
  if (upper === 'CST') return '-06:00';
  if (upper === 'CDT') return '-05:00';
  if (upper === 'MST') return '-07:00';
  if (upper === 'MDT') return '-06:00';

  // Khớp định dạng: UTC+7, UTC-5, GMT+07:00, +07:00, -12:00, etc.
  const match = clean.match(/^(?:UTC|GMT)?([+-])(\d{1,2})(?::?(\d{2}))?$/i);
  if (match) {
    const sign = match[1];
    const hours = match[2].padStart(2, '0');
    const mins = (match[3] || '00').padStart(2, '0');
    return `${sign}${hours}:${mins}`;
  }
  return null;
}

export function parseDeadlineItem(id, type, dateStr, timezone, options = {}) {
  const rawText = (dateStr || '').trim();
  const checkedAt = options.checkedAt || null;
  const verifiedAt = options.verifiedAt || null;
  const sourceUrl = options.sourceUrl || null;

  // Quy tắc nghiệp vụ TV1:
  // - Verified CHỈ KHI đối chiếu nguồn chính thức có verifiedAt hợp lệ.
  // - Estimated / TBA / Chưa đối chiếu (unverified) phân biệt rõ ràng.
  const resolveQuality = (fallback) => {
    if (options.quality === 'verified' && verifiedAt) {
      return 'verified';
    }
    if (options.quality === 'estimated') {
      return 'estimated';
    }
    if (options.quality === 'tba' || fallback === 'tba') {
      return 'tba';
    }
    return 'unverified';
  };

  if (!rawText || rawText === 'TBD' || rawText === 'TBA') {
    return {
      id,
      type,
      instant: null,
      sourceText: rawText || 'TBA',
      timezone: timezone || null,
      precision: 'unknown',
      quality: 'tba',
      sourceUrl,
      checkedAt,
      verifiedAt,
    };
  }

  // 1. Date-only (YYYY-MM-DD): Giữ nguyên precision, tuyệt đối không tự gán giờ thành timestamp chính xác
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(rawText);
  if (isDateOnly) {
    return {
      id,
      type,
      instant: null,
      sourceText: rawText,
      timezone: timezone || null,
      precision: 'date',
      quality: resolveQuality('unverified'),
      sourceUrl,
      checkedAt,
      verifiedAt,
    };
  }

  // 2. Chuỗi ISO 8601 đã có offset hoặc Z (ví dụ: 2026-11-10T23:59:59-12:00 hoặc 2026-11-10T23:59:59Z)
  const isIsoWithTz = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:[+-]\d{2}:?\d{2}|Z)$/i.test(rawText);
  if (isIsoWithTz) {
    const timestamp = Date.parse(rawText);
    if (!Number.isNaN(timestamp)) {
      return {
        id,
        type,
        instant: rawText,
        sourceText: rawText,
        timezone: timezone || null,
        precision: 'instant',
        quality: resolveQuality('unverified'),
        sourceUrl,
        checkedAt,
        verifiedAt,
      };
    }
  }

  // 3. Chuỗi có ngày và giờ nhưng cần ghép offset múi giờ (YYYY-MM-DD HH:mm:ss hoặc YYYY-MM-DDTHH:mm:ss)
  const isDateTime = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}$/.test(rawText);
  const tzOffset = parseTimezoneOffset(timezone);

  if (isDateTime && tzOffset) {
    const isoWithOffset = `${rawText.replace(' ', 'T')}${tzOffset}`;
    const timestamp = Date.parse(isoWithOffset);
    if (!Number.isNaN(timestamp)) {
      return {
        id,
        type,
        instant: isoWithOffset,
        sourceText: rawText,
        timezone: timezone || null,
        precision: 'instant',
        quality: resolveQuality('unverified'),
        sourceUrl,
        checkedAt,
        verifiedAt,
      };
    }
  }

  return {
    id,
    type,
    instant: null,
    sourceText: rawText,
    timezone: timezone || null,
    precision: 'unknown',
    quality: resolveQuality('unverified'),
    sourceUrl,
    checkedAt,
    verifiedAt,
  };
}

export function normalizeCatalog(rawResponse) {
  if (!rawResponse) {
    throw new Error('Dữ liệu thô không tồn tại.');
  }

  if (rawResponse.meta && Array.isArray(rawResponse.editions)) {
    const sanitizedEditions = rawResponse.editions.map((edition) => {
      if (!edition || typeof edition !== 'object') return edition;
      const editionVerifiedAt = edition.verifiedAt || null;
      const rounds = Array.isArray(edition.rounds)
        ? edition.rounds.map((round) => {
            if (!round || typeof round !== 'object') return round;
            const deadlines = Array.isArray(round.deadlines)
              ? round.deadlines.map((d) => {
                  if (!d || typeof d !== 'object') return d;
                  const itemVerifiedAt = d.verifiedAt || editionVerifiedAt;
                  let quality = d.quality || 'unverified';
                  // Rule: Verified CHỈ KHI có verifiedAt
                  if (quality === 'verified' && !itemVerifiedAt) {
                    quality = 'unverified';
                  } else if (
                    d.precision === 'unknown' ||
                    (d.sourceText && (d.sourceText.trim() === 'TBA' || d.sourceText.trim() === 'TBD'))
                  ) {
                    quality = 'tba';
                  }
                  return {
                    ...d,
                    quality,
                  };
                })
              : [];
            return {
              ...round,
              deadlines,
            };
          })
        : [];
      return {
        ...edition,
        rounds,
      };
    });

    return {
      meta: {
        ...rawResponse.meta,
      },
      editions: sanitizedEditions,
    };
  }

  if (!Array.isArray(rawResponse)) {
    throw new Error('Cấu trúc dữ liệu CCFDDL không hợp lệ (cần một mảng series).');
  }

  const editions = [];

  for (const series of rawResponse) {
    if (!series || typeof series !== 'object') continue;

    const acronym = (series.title || '').trim();
    const name = (series.description || series.title || '').trim();
    const seriesKey =
      series.conference_key ||
      series.dblp ||
      acronym.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') ||
      'conf';

    const fields = series.sub ? [String(series.sub).toUpperCase()] : [];
    const ranks = {
      ccf: series.rank?.ccf || null,
      core: series.rank?.core || null,
      year: null,
      sourceUrl: null,
    };

    const confs = Array.isArray(series.confs) ? series.confs : [];
    for (const conf of confs) {
      if (!conf || typeof conf !== 'object') continue;

      const year = typeof conf.year === 'number' ? conf.year : parseInt(conf.year, 10) || null;
      const confId = conf.id ? String(conf.id).trim() : `${seriesKey}-${year}`;

      const placeStr = conf.place ? String(conf.place).trim() : null;
      let format = null;
      if (placeStr) {
        const lowerPlace = placeStr.toLowerCase();
        if (lowerPlace.includes('hybrid')) {
          format = 'Hybrid';
        } else if (lowerPlace.includes('online') || lowerPlace.includes('virtual')) {
          format = 'Online';
        } else {
          format = 'Offline';
        }
      }

      const link = conf.link ? String(conf.link).trim() : null;
      const websiteUrl = link && (link.startsWith('http://') || link.startsWith('https://')) ? link : null;

      const rounds = [];
      const timezone = conf.timezone ? String(conf.timezone).trim() : null;
      const timeline = Array.isArray(conf.timeline) ? conf.timeline : [];

      for (let idx = 0; idx < timeline.length; idx += 1) {
        const t = timeline[idx];
        if (!t || typeof t !== 'object') continue;

        const roundId = `r${idx + 1}`;
        const comment = (t.comment || '').trim();
        const label = comment || (timeline.length > 1 ? `Round ${idx + 1}` : 'Chính thức');
        const deadlines = [];

        if (t.abstract_deadline) {
          deadlines.push(parseDeadlineItem(`${roundId}-abstract`, 'abstract', t.abstract_deadline, timezone));
        }

        if (t.deadline) {
          deadlines.push(parseDeadlineItem(`${roundId}-paper`, 'paper', t.deadline, timezone));
        }

        rounds.push({
          id: roundId,
          label,
          deadlines,
        });
      }

      editions.push({
        id: confId,
        seriesKey,
        acronym,
        name,
        year,
        fields,
        ranks,
        place: placeStr,
        format,
        websiteUrl,
        sourceUrl: 'https://ccfddl.com/',
        checkedAt: null,
        verifiedAt: null,
        links: { cfp: null, template: null, authorGuide: null },
        rounds,
      });
    }
  }

  return {
    meta: {
      mode: 'live',
      fetchedAt: new Date().toISOString(),
      checkedAt: null,
      sourceUrl: 'https://ccfddl.com/conference/allconf.json',
    },
    editions,
  };
}
