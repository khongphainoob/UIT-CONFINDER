// TV1: chuẩn hóa nguồn thô tại một nơi, không ép UI phụ thuộc schema CCFDDL.

export function parseTimezoneOffset(tz) {
  if (!tz || typeof tz !== 'string') return null;
  const clean = tz.trim();
  if (clean === 'AoE' || clean === 'UTC-12') return '-12:00';
  if (clean === 'UTC' || clean === 'UTC+0' || clean === 'UTC-0') return '+00:00';
  if (clean === 'PT') return '-08:00'; 

  const match = clean.match(/^UTC([+-])(\d{1,2})(?::?(\d{2}))?$/i);
  if (match) {
    const sign = match[1];
    const hours = match[2].padStart(2, '0');
    const mins = (match[3] || '00').padStart(2, '0');
    return `${sign}${hours}:${mins}`;
  }
  return null;
}

export function parseDeadlineItem(id, type, dateStr, timezone) {
  const rawText = (dateStr || '').trim();

  if (!rawText || rawText === 'TBD' || rawText === 'TBA') {
    return {
      id,
      type,
      instant: null,
      sourceText: rawText || 'TBA',
      timezone: timezone || null,
      precision: 'unknown',
      quality: 'tba',
      sourceUrl: null,
      checkedAt: null,
      verifiedAt: null,
    };
  }

  const tzOffset = parseTimezoneOffset(timezone);

  const isDateTime = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(rawText);
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
        quality: 'unverified',
        sourceUrl: null,
        checkedAt: null,
        verifiedAt: null,
      };
    }
  }

  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(rawText);
  if (isDateOnly) {
    return {
      id,
      type,
      instant: null,
      sourceText: rawText,
      timezone: timezone || null,
      precision: 'date',
      quality: 'unverified',
      sourceUrl: null,
      checkedAt: null,
      verifiedAt: null,
    };
  }

  return {
    id,
    type,
    instant: null,
    sourceText: rawText,
    timezone: timezone || null,
    precision: 'unknown',
    quality: 'unverified',
    sourceUrl: null,
    checkedAt: null,
    verifiedAt: null,
  };
}

export function normalizeCatalog(rawResponse) {
  if (!rawResponse) {
    throw new Error('Dữ liệu thô không tồn tại.');
  }

  if (rawResponse.meta && Array.isArray(rawResponse.editions)) {
    return {
      meta: {
        ...rawResponse.meta,
      },
      editions: rawResponse.editions,
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
