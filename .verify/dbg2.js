const puppeteer = require('puppeteer-core');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
(async () => {
  const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
  const p = await b.newPage();
  await p.setViewport({ width: 1500, height: 1000 });
  p.on('console', (m) => console.log('CONSOLE', m.type(), m.text().slice(0, 400)));
  p.on('pageerror', (e) => console.log('PAGEERROR', e.message.slice(0, 600)));
  p.on('request', (r) => { if (r.url().includes('/api/')) console.log('REQ', r.method(), r.url().slice(0, 110)); });
  p.on('response', (r) => { if (r.url().includes('/api/')) console.log('RES', r.status(), r.url().slice(0, 110)); });
  await p.goto('http://localhost:3100/login', { waitUntil: 'networkidle2' });
  await p.setCookie({ name: 'misUser', value: 'admin', url: 'http://localhost:3100' });
  await p.goto('http://localhost:3100/summary', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 6000));
  console.log(JSON.stringify(await p.evaluate(() => ({
    tbody: document.querySelector('table tbody') ? document.querySelector('table tbody').innerText.slice(0, 300) : null,
    monthOpts: [...document.querySelectorAll('select option')].map((o) => o.textContent).slice(0, 12),
    stats: [...document.querySelectorAll('.rounded-xl.border')].slice(0, 4).map((d) => d.innerText.replace(/\n/g, '=')),
  })), null, 2));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
