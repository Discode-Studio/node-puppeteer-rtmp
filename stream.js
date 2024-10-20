const { spawn } = require('child_process');
const puppeteer = require('puppeteer');

module.exports.stream = async function (options) {
  const browser = options.browser || (await puppeteer.launch());
  const page = options.page || (await browser.newPage());

  await options.prepare(browser, page);

  var ffmpegPath = options.ffmpeg || 'ffmpeg';
  var fps = options.fps || 30;
  var resolution = options.resolution || '1280x720';
  var preset = options.preset || 'medium';
  var rate = options.rate || '2500k';
  var threads = options.threads || '2';

  var outUrl = options.output || 'rtmp://a.rtmp.youtube.com/live2/';

  // Passer les paramètres correctement à ffmpegArgs
  const args = ffmpegArgs({
    fps: fps,
    resolution: resolution,
    preset: preset,
    rate: rate,
    threads: threads
  });

  var fullUrl = outUrl + options.key;
  args.push(fullUrl);

  const ffmpeg = spawn(ffmpegPath, args);

  let screenshot = null;

  // Afficher les logs pour comprendre les erreurs
  if (options.pipeOutput) {
    ffmpeg.stdout.on('data', (data) => {
      console.log(`stdout: ${data}`);
    });
    ffmpeg.stderr.on('data', (data) => {
      console.error(`stderr: ${data}`);
    });
  }

  while (true) {
    await options.render(browser, page);

    screenshot = await page.screenshot({ type: 'jpeg' });

    await ffmpeg.stdin.write(screenshot);
  }
};

const ffmpegArgs = ({ fps, resolution = '2480x720', preset = 'medium', rate = '2500k', threads = 2 }) => [
  // IN
  '-f', 'image2pipe',
  '-use_wallclock_as_timestamps', '1',
  '-i', '-',
  '-f', 'lavfi', '-i', '-', '-c:a', 'aac',
  // OUT
  '-deinterlace',
  '-s', resolution,  // Utilisation correcte de la résolution
  '-vsync', 'cfr',
  '-r', fps,
  '-g', (fps * 2),
  '-vcodec', 'libx264',
  '-x264opts', 'keyint=' + (fps * 2) + ':no-scenecut',
  '-preset', preset,
  '-b:v', rate,  // Bitrate vidéo correct
  '-minrate', rate,
  '-maxrate', rate,
  '-bufsize', rate,
  '-pix_fmt', 'yuv420p',
  '-threads', threads,
  // Remplacer par AAC pour YouTube
  '-f', 'lavfi', '-acodec', 'aac', '-ar', '44100', '-b:a', '128k',
  '-f', 'flv',
];
