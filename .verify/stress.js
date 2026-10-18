/* Stress the print layout with worst-case values: biggest numbers, longest names. */
const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto('http://localhost:3100/login', { waitUntil: 'networkidle2' });
  await page.setCookie({ name: 'misUser', value: 'admin', url: 'http://localhost:3100' });
  await page.goto('http://localhost:3100/ledger', { waitUntil: 'networkidle0' });
  await page.waitForSelector('.lg-t');
  await page.setViewport({ width: 1077, height: 760 });
  const cdp = await page.target().createCDPSession();
  await cdp.send('Emulation.setEmulatedMedia', { media: 'print' });
  // worst case: 8-digit amounts, long item names, no wrapping available for numbers
  await page.evaluate(() => {
    document.querySelectorAll('.lg-t td.a').forEach((c, i) => { c.textContent = (98765432 - i * 1111).toLocaleString('en-US'); });
    document.querySelectorAll('.lg-t td.q').forEach((c, i) => { c.textContent = String(1200 + i); });
    document.querySelectorAll('.lg-t td.nm').forEach((c) => {
      c.textContent = 'Printer/Printer Servicing Accessories & Gear for the whole office (all branches)';
    });
  });
  const out = await page.evaluate(() => {
    const t = document.querySelector('.lg-t');
    const cellOver = [...t.querySelectorAll('td,th')].filter((c) => c.scrollWidth > c.clientWidth + 1)
      .map((c) => `${c.className}:${c.innerText.slice(0, 14)}(${c.scrollWidth}>${c.clientWidth})`);
    return {
      fontSize: getComputedStyle(t).fontSize,
      tableW: Math.round(t.getBoundingClientRect().width),
      mainMargin: getComputedStyle(document.querySelector('main')).marginLeft,
      viewport: document.documentElement.clientWidth,
      over: cellOver,
      nmWrapped: getComputedStyle(t.querySelector('td.nm')).whiteSpace,
    };
  });
  console.log(JSON.stringify(out, null, 2));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });