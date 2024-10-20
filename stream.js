const { spawn } = require('child_process');
const puppeteer = require('puppeteer');

module.exports.stream = async function (options) {
  const browser = options.browser || (await puppeteer.launch());
  const page = options.page || (await browser.newPage());

  await options.prepare(browser, page);

  const ffmpegPath = options.ffmpeg || 'ffmpeg';
  const fps = options.fps || 30;
  const resolution = options.resolution || '1280x720';
  const preset = options.preset || 'medium';
  const rate = options.rate || '2500k';
  const threads = options.threads || '2';
  const outUrl = options.output || 'rtmp://a.rtmp.youtube.com/live2/';

  // Créez un fichier temporaire pour capturer l'audio et la vidéo
  const args = ffmpegArgs({
    fps,
    resolution,
    preset,
    rate,
    threads
  });

  const fullUrl = outUrl + options.key;
  args.push(fullUrl);

  const ffmpeg = spawn(ffmpegPath, args);

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
    const screenshot = await page.screenshot({ type: 'jpeg' });
    await ffmpeg.stdin.write(screenshot);
  }
};

const ffmpegArgs = ({ fps, resolution = '1280x720', preset = 'medium', rate = '2500k', threads = 2 }) => [
  // IN pour la vidéo
  '-f', 'image2pipe',
  '-use_wallclock_as_timestamps', '1',
  '-i', '-',  // Capture d'image à partir du stdin
  // Spécifier la source audio (peut être un flux ou un fichier, selon votre configuration)
  '-f', 'pulse',      // Utiliser PulseAudio comme source d'audio (si sur Linux)
  '-i', 'default',    // Utiliser le périphérique audio par défaut
  // OUT
  '-deinterlace',
  '-s', resolution,
  '-vsync', 'cfr',
  '-r', fps,
  '-g', (fps * 2),
  '-vcodec', 'libx264',
  '-x264opts', 'keyint=' + (fps * 2) + ':no-scenecut',
  '-preset', preset,
  '-b:v', rate,
  '-minrate', rate,
  '-maxrate', rate,
  '-bufsize', rate,
  '-pix_fmt', 'yuv420p',
  '-threads', threads,
  // Mixer vidéo et audio
  '-map', '0:v',        // carte la vidéo de l'entrée 0
  '-map', '1:a',        // carte l'audio de l'entrée 1
  '-acodec', 'aac',     // Codec audio pour la sortie
  '-b:a', '128k',       // Bitrate audio
  '-ar', '44100',       // Fréquence d'échantillonnage
  '-f', 'flv',
];
