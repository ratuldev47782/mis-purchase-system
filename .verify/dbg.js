// .verify/dbg.js

const puppeteer = require('puppeteer-core');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
(async () => {
  const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
  const p = await b.newPage();
  await p.setViewport({ width: 1500, height: 1000 });
  p.on('console', (m) => console.log('CONSOLE', m.type(), m.text().slice(0, 300)));
  p.on('pageerror', (e) => console.log('PAGEERROR', e.message.slice(0, 500)));
  p.on('response', (r) => { if (r.status() >= 400) console.log('HTTP', r.status(), r.url().slice(0, 120)); });
  await p.goto('http://localhost:3100/login', { waitUntil: 'networkidle2' });
  await p.setCookie({ name: 'misUser', value: 'admin', url: 'http://localhost:3100' });
  await p.goto('http://localhost:3100/summary', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 8000));
  console.log('URL', p.url());
  console.log('STATE', JSON.stringify(await p.evaluate(() => ({
    tbodyRows: document.querySelectorAll('table tbody tr').length,
    cards: document.querySelectorAll('.card').length,
    body: document.body.innerText.slice(0, 300),
    tableCount: document.querySelectorAll('table').length,
  }))));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });