const puppeteer = require('puppeteer');
const { stream } = require('./lib/stream.js');

puppeteer.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox"]
}).then(async browser => {
  const page = await browser.newPage();

  await page.goto('https://codepen.io/hexagoncircle/full/joqYEj', { waitUntil: 'networkidle2' });

  await stream({
    page: page,
    key: 'your_youtube_key',
    fps: 30,
    prepare: function (browser, page) { },
    render: function (browser, page, frame) { }
  });

  await browser.close();
});
