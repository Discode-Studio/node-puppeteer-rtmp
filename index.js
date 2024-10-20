const puppeteer = require('puppeteer');
const { stream } = require('./stream.js');

puppeteer.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--autoplay-policy=no-user-gesture-required"]
}).then(async browser => {
  const page = await browser.newPage();

  await page.goto('http://discode-studio.github.io/shortwave.bot/stream.htm', { waitUntil: 'networkidle2' });

  await stream({
    page: page,
    key: '53qa-y81q-px7q-8g6y-78zb',
    fps: 30,
    prepare: function (browser, page) { },
    render: function (browser, page, frame) { }
  });

  await browser.close();
});
