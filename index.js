const puppeteer = require('puppeteer');
const { stream } = require('./lib/stream.js');

puppeteer.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox"]
}).then(async browser => {
  const page = await browser.newPage();

  await page.goto('http://discode-studio.github.io/shortwave.bot/stream.htm', { waitUntil: 'networkidle2' });

  await stream({
    page: page,
    key: 'raum-1y41-qr0d-sf1m-5udu',
    fps: 30,
    prepare: function (browser, page) { },
    render: function (browser, page, frame) { }
  });

  await browser.close();
});
