// TV1-07: tách chữ, tìm link CFP, tôn trọng robots.txt, chọn chuỗi cần crawl. Không gọi mạng thật.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  acronymTokens, cfpFileName, crawlSeries, createPoliteFetcher, extractLinks, findCfpLink, focusCfpText,
  htmlToText, isAllowed, looksLikeCfp, parseRobots, pickSeriesToCrawl,
} from '../src/cfp-crawler.js';

const TOPICS_HTML = `<html><head><title>x</title><style>p{}</style></head><body>
  <script>alert('khong lay')</script>
  <h2>Call for Papers</h2><p>We invite submissions on all aspects of software engineering.</p>
  <h3>Topics of interest include</h3>
  <ul>${['Program repair', 'Software testing', 'Mining software repositories', 'Requirements engineering', 'AI for SE', 'Formal verification']
    .map((topic) => `<li>${topic}</li>`).join('')}</ul>
  <p>${'Submissions must be original &amp; unpublished. '.repeat(10)}</p>
</body></html>`;

describe('htmlToText', () => {
  test('bỏ script/style, giữ xuống dòng giữa các mục, giải mã entity', () => {
    const text = htmlToText(TOPICS_HTML);
    assert.ok(!text.includes('alert'));
    assert.ok(!text.includes('p{}'));
    assert.match(text, /\n- Program repair\n- Software testing/);
    assert.match(text, /original & unpublished/);
    assert.equal(htmlToText('a&#39;b &#x41; &nbsp;c'), "a'b A c");
  });
});

describe('tìm link CFP', () => {
  const home = 'https://conf.org/2027/';
  const html = `
    <a href="/2027/registration">Registration</a>
    <a href="/2027/workshops-cfp">Call for Workshop Papers</a>
    <a href="track/research-track">Research Track</a>
    <a href="/2027/call-for-papers#top">Call for Papers</a>
    <a href="mailto:chair@conf.org">Contact</a>
    <a href="javascript:void(0)">Menu</a>
    <a href="/files/cfp.pdf">CFP (PDF)</a>`;

  test('extractLinks chuyển link tương đối thành tuyệt đối, bỏ mailto/javascript và phần #', () => {
    const links = extractLinks(html, home);
    assert.ok(links.some((link) => link.url === 'https://conf.org/2027/call-for-papers'));
    assert.ok(links.some((link) => link.url === 'https://conf.org/2027/track/research-track'));
    assert.ok(!links.some((link) => link.url.startsWith('mailto') || link.url.startsWith('javascript')));
  });

  test('chọn CFP của track chính, không chọn workshop, PDF hay đăng ký', () => {
    assert.equal(findCfpLink(extractLinks(html, home), home).url, 'https://conf.org/2027/call-for-papers');
  });

  test('không có link đủ rõ thì trả null', () => {
    assert.equal(findCfpLink(extractLinks('<a href="/submission">Submission</a>', home), home), null);
  });
});

describe('cắt đoạn chủ đề', () => {
  test('focusCfpText bắt đầu gần chữ "topics of interest" và không vượt giới hạn', () => {
    const text = `${'Menu Home About\n'.repeat(200)}Topics of interest include\n- program repair`;
    const focused = focusCfpText(text, 500);
    assert.ok(focused.length <= 500);
    assert.match(focused, /Topics of interest include/);
  });

  test('looksLikeCfp loại trang quá ngắn hoặc không có dấu hiệu chủ đề', () => {
    assert.equal(looksLikeCfp('Coming soon'), false);
    assert.equal(looksLikeCfp('Lorem ipsum '.repeat(100)), false);
    assert.equal(looksLikeCfp(focusCfpText(htmlToText(TOPICS_HTML))), true);
  });
});

describe('robots.txt', () => {
  const robots = `
User-agent: Googlebot
Disallow: /

User-agent: *
Disallow: /private/
Disallow: /*.php$
Allow: /private/cfp
`;
  test('dùng nhóm "*", luật dài nhất thắng, hỗ trợ * và $', () => {
    const rules = parseRobots(robots);
    assert.equal(isAllowed('/2027/cfp', rules), true);
    assert.equal(isAllowed('/private/notes', rules), false);
    assert.equal(isAllowed('/private/cfp', rules), true);
    assert.equal(isAllowed('/index.php', rules), false);
    assert.equal(isAllowed('/index.php?x=1', rules), true);
  });

  test('nhóm có tên bot được ưu tiên hơn nhóm "*"', () => {
    const rules = parseRobots('User-agent: *\nAllow: /\n\nUser-agent: UIT-ConFinder-Bot\nDisallow: /');
    assert.equal(isAllowed('/cfp', rules), false);
  });
});

describe('createPoliteFetcher', () => {
  function fakeWeb(pages) {
    const requested = [];
    const fetchImpl = async (url, options) => {
      requested.push({ url, agent: options.headers['user-agent'] });
      const page = pages[url];
      if (!page) return new Response('not found', { status: 404 });
      return new Response(page.body, { status: page.status ?? 200, headers: { 'content-type': page.type ?? 'text/html' } });
    };
    return { fetchImpl, requested };
  }

  test('đọc robots.txt một lần mỗi origin, chặn trang bị cấm, gửi User-Agent của bot', async () => {
    const web = fakeWeb({
      'https://a.org/robots.txt': { body: 'User-agent: *\nDisallow: /secret', type: 'text/plain' },
      'https://a.org/cfp': { body: '<p>cfp</p>' },
    });
    const fetchPage = createPoliteFetcher({ fetchImpl: web.fetchImpl, delayMs: 0 });
    assert.equal((await fetchPage('https://a.org/cfp')).html, '<p>cfp</p>');
    await assert.rejects(fetchPage('https://a.org/secret/x'), /robots/);
    assert.equal(web.requested.filter((r) => r.url.endsWith('robots.txt')).length, 1);
    assert.ok(web.requested.every((r) => r.agent.startsWith('UIT-ConFinder-Bot')));
  });

  test('robots.txt trả 403 thì coi như cấm hết; file không phải HTML thì bỏ', async () => {
    const web = fakeWeb({
      'https://b.org/robots.txt': { body: '', status: 403 },
      'https://c.org/file': { body: '%PDF', type: 'application/pdf' },
    });
    const fetchPage = createPoliteFetcher({ fetchImpl: web.fetchImpl, delayMs: 0 });
    await assert.rejects(fetchPage('https://b.org/cfp'), /robots/);
    await assert.rejects(fetchPage('https://c.org/file'), /không phải HTML/);
    await assert.rejects(fetchPage('ftp://c.org/file'), /http/);
  });

  test('giãn cách giữa hai request đúng delayMs', async () => {
    const waits = [];
    const web = fakeWeb({ 'https://d.org/a': { body: 'a' }, 'https://d.org/b': { body: 'b' } });
    const fetchPage = createPoliteFetcher({ fetchImpl: web.fetchImpl, delayMs: 1000, sleep: async (ms) => { waits.push(ms); } });
    await fetchPage('https://d.org/a');
    await fetchPage('https://d.org/b');
    assert.ok(waits.length >= 2 && waits.every((ms) => ms > 900 && ms <= 1000));
  });
});

describe('crawlSeries', () => {
  test('từ trang chủ theo link CFP, lấy được đoạn chủ đề', async () => {
    const pages = {
      'https://icse.org/2027': `<a href="/2027/call-for-papers">Call for Papers</a>`,
      'https://icse.org/2027/call-for-papers': TOPICS_HTML,
    };
    const fetchPage = async (url) => {
      if (!pages[url]) throw new Error('HTTP 404');
      return { url, html: pages[url] };
    };
    const result = await crawlSeries({ urls: ['https://icse.org/2027'] }, fetchPage);
    assert.equal(result.ok, true);
    assert.equal(result.cfpUrl, 'https://icse.org/2027/call-for-papers');
    assert.match(result.text, /Program repair/);
  });

  test('web năm mới chưa có thì thử web năm trước; hỏng hết thì trả lý do', async () => {
    const fetchPage = async (url) => {
      if (url.endsWith('2026')) return { url, html: TOPICS_HTML };
      throw new Error('HTTP 404');
    };
    const ok = await crawlSeries({ urls: ['https://x.org/2027', 'https://x.org/2026'] }, fetchPage);
    assert.equal(ok.cfpUrl, 'https://x.org/2026');
    const fail = await crawlSeries({ urls: ['https://x.org/2027'] }, async () => { throw new Error('HTTP 500'); });
    assert.deepEqual(fail, { ok: false, error: 'https://x.org/2027: HTTP 500' });
  });
});

describe('pickSeriesToCrawl', () => {
  const NOW = Date.parse('2026-11-28T00:00:00Z');
  const edition = (seriesKey, acronym, year, ccf, websiteUrl = `https://${acronym}.org/${year}`) => ({ seriesKey, acronym, year, ranks: { ccf }, websiteUrl });
  const catalog = {
    editions: [
      edition('C/c', 'CCC', 2027, 'C'), edition('A/a', 'AAA', 2027, 'A'), edition('A/a', 'AAA', 2026, 'A'),
      edition('B/fresh', 'FRESH', 2027, 'B'), edition('B/tried', 'TRIED', 2027, 'B'), edition('B/noweb', 'NOWEB', 2027, 'B', null),
    ],
    series: {
      'B/fresh': { topics: ['x'], enrichedAt: '2026-10-01T00:00:00Z' },
      'B/tried': { cfpCrawledAt: '2026-11-20T00:00:00Z', cfpError: 'HTTP 500' },
    },
  };

  test('ưu tiên CCF A, bỏ chuỗi vừa làm giàu, vừa thử, không có website; thử web 2 năm gần nhất', () => {
    const targets = pickSeriesToCrawl(catalog, { now: NOW });
    assert.deepEqual(targets.map((target) => target.acronym), ['AAA', 'CCC']);
    assert.deepEqual(targets[0].urls, ['https://AAA.org/2027', 'https://AAA.org/2026']);
  });

  test('hết hạn retry thì thử lại; limit giới hạn số chuỗi', () => {
    const later = Date.parse('2027-01-01T00:00:00Z');
    assert.ok(pickSeriesToCrawl(catalog, { now: later }).some((target) => target.acronym === 'TRIED'));
    assert.equal(pickSeriesToCrawl(catalog, { now: NOW, limit: 1 }).length, 1);
  });

  test('cfpFileName không cho thoát khỏi thư mục', () => {
    assert.equal(cfpFileName('AI/aaai'), 'AI__aaai.txt');
    assert.equal(cfpFileName('../../etc/passwd'), '________etc__passwd.txt');
  });
});

describe('chất lượng văn bản CFP', () => {
  test('bỏ menu <nav>/<header>/<footer> khỏi văn bản nhưng vẫn đọc được chữ của link', () => {
    const html = '<header><nav><a href="/venue">Venue</a><a href="/cfp">Call for Papers</a></nav></header><main>Topics of interest</main><footer>Sponsors</footer>';
    assert.equal(htmlToText(html), 'Topics of interest');
    assert.ok(extractLinks(html, 'https://x.org/').some((link) => link.text === 'Call for Papers'));
  });

  test('không chọn CFP của journal track hay findings', () => {
    const html = '<a href="/journal-track-call-for-papers">Journal Track: Call for Papers</a><a href="/main-cfp">Main Track CFP</a>';
    assert.equal(findCfpLink(extractLinks(html, 'https://x.org/'), 'https://x.org/').url, 'https://x.org/main-cfp');
  });

  test('trang chủ chỉ có menu "Calls" thì đi thêm một bước để tìm CFP (kiểu ACL)', async () => {
    const pages = {
      'https://acl.org/': '<nav><a href="/calls/">Calls</a></nav><p>Welcome to ACL</p>',
      'https://acl.org/calls/': '<a href="/calls/main_conference_papers/">Call for Main Conference Papers</a><a href="/calls/workshops/">Call for Workshops</a>',
      'https://acl.org/calls/main_conference_papers/': TOPICS_HTML,
    };
    const result = await crawlSeries({ urls: ['https://acl.org/'] }, async (url) => ({ url, html: pages[url] ?? '' }));
    assert.equal(result.cfpUrl, 'https://acl.org/calls/main_conference_papers/');
  });

  test('trang chủ chỉ có thông tin chung thì không bị coi là CFP', () => {
    const home = `ACL 2027 will take place in Kyoto. ${'News and important dates. '.repeat(40)} Topics`;
    assert.equal(looksLikeCfp(home), false);
  });
});

describe('nhiều hội nghị chung một website (conf.researchr.org)', () => {
  const home = 'https://conf.researchr.org/home/icse-2027';
  const html = `
    <a href="https://conf.researchr.org/track/cain-2027/cain-2027-call-for-papers">Call for Papers</a>
    <a href="https://conf.researchr.org/track/icse-2027/icse-2027-research-track">Research Track</a>`;

  test('ICSE không lấy CFP của CAIN tổ chức cùng chỗ', () => {
    assert.equal(findCfpLink(extractLinks(html, home), home, 'ICSE').url, 'https://conf.researchr.org/track/icse-2027/icse-2027-research-track');
  });

  test('tên ghép vẫn khớp: ICSE-CHASE nhận track chase, IEEE/ACM CGO bỏ track hpca', () => {
    assert.equal(acronymTokens('IEEE/ACM CGO').join(), 'cgo');
    const chase = '<a href="https://conf.researchr.org/track/chase-2027/chase-2027-papers">Call for Papers</a>';
    assert.ok(findCfpLink(extractLinks(chase, home), home, 'ICSE-CHASE'));
    const hpca = '<a href="https://conf.researchr.org/track/hpca-2027/hpca-2027-main-conference">Call for Papers</a>';
    assert.equal(findCfpLink(extractLinks(hpca, home), home, 'IEEE/ACM CGO'), null);
  });
});
