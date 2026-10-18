// .verify/check.js

/* Verification for the summary / new / ledger changes. */
const puppeteer = require('puppeteer-core');
const fs = require('fs');

const B = 'http://localhost:3100';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const results = [];
const chk = (name, ok, info) => { results.push((ok ? 'PASS  ' : 'FAIL  ') + name + (info ? '  [' + info + ']' : '')); };

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1500, height: 1000 });
  await page.goto(`${B}/login`, { waitUntil: 'networkidle2' });
  await page.setCookie({ name: 'misUser', value: 'admin', url: B });

  /* ---------------- /summary ---------------- */
  await page.goto(`${B}/summary`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('table thead th');
  await page.waitForFunction(() => document.querySelectorAll('table tbody tr').length > 1, { timeout: 30000 });

  const rowsReady = await page.evaluate(() => document.querySelectorAll('table tbody tr').length > 1);
  chk('summary table has data rows', rowsReady, '');
  const heads = await page.$$eval('table thead th', (els) => els.map((e) => e.textContent.trim()));
  chk('summary has a Remark column', heads.includes('Remark'), heads.join('|'));

  const rowInfo = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('table tbody tr')].filter((t) => t.querySelectorAll('td.colSpan,td[colspan]').length === 0 && t.querySelectorAll('td').length > 1);
    return rows.slice(0, 8).map((r) => [...r.querySelectorAll('td')].map((c) => c.innerText.trim()));
  });
  chk('data rows have 12 cells', rowInfo.length > 0 && rowInfo.every((r) => r.length === 12), JSON.stringify(rowInfo[0] || []));
  const remarkIdx = heads.indexOf('Remark');
  const firstRemark = rowInfo[0] && rowInfo[0][remarkIdx];
  chk('Remark cell contains billing remark text', typeof firstRemark === 'string' && firstRemark.length > 3, String(firstRemark));

  const editOpen = await page.evaluate(async () => {
    const rows = [...document.querySelectorAll('table tbody tr')].filter((t) => t.querySelectorAll('td').length > 1);
    if (!rows[0]) { console.log('NO ROWS'); return false; }
    rows[0].querySelector('button[title]').click();
    await new Promise((r) => setTimeout(r, 50));
    return true;
  });
  chk('edit button opens', editOpen === true, '');
  await new Promise((r) => setTimeout(r, 300));
  const editInfo = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('table tbody tr')].filter((t) => t.querySelectorAll('td').length > 1);
    const r = rows[0];
    const cells = [...r.querySelectorAll('td')];
    const heads = [...document.querySelectorAll('table thead th')].map((e) => e.innerText.trim());
    const find = (name) => cells[heads.indexOf(name)];
    const count = r.querySelectorAll('input,select,textarea').length;
    const itemInputs = find('Item Description').querySelectorAll('input,textarea').length;
    const amountInputs = find('Amount').querySelectorAll('input,textarea').length;
    const supplierInputs = find('Supplier Name').querySelectorAll('input,select,textarea').length;
    const dateInputs = find('Purchase Date').querySelectorAll('input,textarea').length;
    const parts = [...r.querySelectorAll('input,select')].map((i) => i.tagName + ':' + (i.value || ''));
    return { count, itemInputs, amountInputs, supplierInputs, dateInputs, parts, item: find('Item Description').innerText, date: find('Purchase Date').innerText };
  });
  chk('edit mode has only SL / Department / Status fields', editInfo.count === 3, JSON.stringify(editInfo));
  chk('Item Description not editable', editInfo.itemInputs === 0, 'inputs=' + editInfo.itemInputs);
  chk('Amount not editable', editInfo.amountInputs === 0, 'inputs=' + editInfo.amountInputs);
  chk('Supplier Name not editable', editInfo.supplierInputs === 0, 'inputs=' + editInfo.supplierInputs);
  chk('Purchase Date not editable (application date)', editInfo.dateInputs === 0, 'inputs=' + editInfo.dateInputs + ' date=' + editInfo.date);
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.innerText.includes('Cancel')); if (b) b.click(); });
  await new Promise((r) => setTimeout(r, 200));
  await page.screenshot({ path: '.verify/summary.png', fullPage: false });

  /* ---------------- /new type=resolution ---------------- */
  await page.goto(`${B}/new?type=resolution`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 500));
  const cards = await page.evaluate(() => {
    const card = document.querySelector('.card');
    if (!card) return { buttons: [], cardText: '' };
    const buttons = [...card.querySelectorAll('button')].map((b) => b.innerText.trim());
    return { buttons, cardText: card.innerText };
  });
  chk('resolution choice has 2 buttons', cards.buttons.length === 2, JSON.stringify(cards.buttons));
  chk('Type B button comes first', (cards.buttons[0] || '').startsWith('Type B'), cards.buttons[0]);
  chk('Type A button present', (cards.buttons[1] || '').startsWith('Type A'), cards.buttons[1]);
  // clicking Type A must show the parent-application select
  const aOrder = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('.card button')];
    const a = btns.find((b) => b.innerText.includes('Type A'));
    a.click();
    return true;
  });
  await new Promise((r) => setTimeout(r, 300));
  const parentSelect = await page.evaluate(() => {
    const card = document.querySelector('.card');
    return card ? !!card.querySelector('select') : false;
  });
  chk('Type A shows the existing-Application picker', parentSelect === true, '');
  await page.screenshot({ path: '.verify/new.png', fullPage: false });

  /* ---------------- /ledger ---------------- */
  await page.goto(`${B}/ledger`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('.lg-t th');
  const thColor = await page.$eval('.lg-t th', (e) => getComputedStyle(e).color);
  chk('ledger header text is black (not white)', thColor !== 'rgb(255, 255, 255)', thColor);
  const h2 = await page.$$eval('.lg-t .h2 th', (els) => els.map((e) => [e.innerText.trim(), getComputedStyle(e).color, getComputedStyle(e).backgroundColor]));
  chk('Qty/Amount header cells readable', h2.every((x) => x[1] !== 'rgb(255, 255, 255)'), JSON.stringify(h2.slice(0, 3)));
  await page.screenshot({ path: '.verify/ledger-screen.png', fullPage: false });

  // ---- print media: must fit the A4 landscape printable width at 100% scale ----
  await page.setViewport({ width: 1077, height: 760 }); // 297x210mm minus 6mm margins, in CSS px
  const cdp = await page.target().createCDPSession();
  await cdp.send('Emulation.setEmulatedMedia', { media: 'print' });
  await new Promise((r) => setTimeout(r, 300));

  const fit = await page.evaluate(() => {
    const doc = document.documentElement;
    const t = document.querySelector('.lg-t');
    const cells = [...t.querySelectorAll('td')];
    const over = cells.filter((c) => c.scrollWidth > c.clientWidth + 1).map((c) => c.className + "'" + c.innerText.trim().slice(0, 12) + "'");
    const thOver = [...t.querySelectorAll('th')].filter((c) => c.scrollWidth > c.clientWidth + 1).map((c) => c.innerText.trim().slice(0, 14));
    const main = document.querySelector('main');
    return {
      tableWidth: Math.round(t.getBoundingClientRect().width),
      mainMargin: getComputedStyle(main).marginLeft,
      appContentW: Math.round(document.querySelector('.app-content').getBoundingClientRect().width),
      gsheetW: Math.round(document.querySelector('.lg-full').getBoundingClientRect().width),
      cssLoaded: [...document.styleSheets].some((s) => (s.href || '').includes('layout.css')),
      viewport: doc.clientWidth,
      scrollW: doc.scrollWidth,
      tableLayout: getComputedStyle(t).tableLayout,
      overflowing: over, headerOverflow: thOver,
      headerColor: getComputedStyle(t.querySelector('th')).color,
      fontSize: getComputedStyle(t).fontSize,
    };
  });
  chk('globals print CSS loaded (sidebar margin removed)', fit.cssLoaded === true && fit.mainMargin === '0px', `css=${fit.cssLoaded} mainMargin=${fit.mainMargin}`);
  chk('table fills the printable width', fit.tableWidth <= fit.viewport + 1 && fit.tableWidth >= fit.viewport * 0.9, `table=${fit.tableWidth} viewport=${fit.viewport} layout=${fit.tableLayout}`);
  chk('no horizontal page scroll in print', fit.scrollW <= fit.viewport + 1, `scrollW=${fit.scrollW}`);
  chk('no cell content overflow/clipping', fit.overflowing.length === 0, JSON.stringify(fit.overflowing));
  chk('no header overflow', fit.headerOverflow.length === 0, JSON.stringify(fit.headerOverflow));
  chk('print header color black', fit.headerColor !== 'rgb(255, 255, 255)', fit.headerColor);
  await page.screenshot({ path: '.verify/ledger-print.png', fullPage: false });

  // actual PDF at print media / landscape
  const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: false });
  fs.writeFileSync('.verify/ledger.pdf', pdf);
  const s = Buffer.from(pdf).toString('latin1');
  const counts = (s.match(/\/Count\s+(\d+)/g) || []).map((x) => Number(x.replace(/\D+/g, '')));
  const pageCount = counts.length ? Math.max(...counts) : 0;
  chk('PDF prints as a single A4 landscape page at 100%', pageCount === 1, `pages=${pageCount} bytes=${pdf.length}`);

  await browser.close();
  console.log(results.join('\n'));
  console.log('\nSUMMARY: ' + results.filter((r) => r.startsWith('PASS')).length + ' passed, ' + results.filter((r) => r.startsWith('FAIL')).length + ' failed');
  process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0);
})().catch((e) => { console.error('ERROR', e); process.exit(2); });