const { spawn } = require('child_process');
const puppeteer = require('puppeteer');

module.exports.stream = async function (options) {
  const browser = options.browser || (await puppeteer.launch());
  const page = options.page || (await browser.newPage());

  await options.prepare(browser, page);

  const ffmpegPath = options.ffmpeg || 'ffmpeg';
  const fps = options.fps || 30;
  const resolution = options.resolution || '2480x1080';
  const preset = options.preset || 'medium';
  const rate = options.rate || '3700k';
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

  // Boucle de rendu
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
  // Capturer l'audio du navigateur (modifiez selon votre OS)
  '-f', 'lavfi',      // Utiliser PulseAudio pour Linux
  '-i', 'default',    // Périphérique audio par défaut, changez si nécessaire
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
  // Mapper la vidéo et l'audio
  '-map', '0:v',        // Vidéo de l'entrée 0 (images)
  '-map', '1:a',        // Audio de l'entrée 1 (audio du navigateur)
  '-acodec', 'aac',     // Codec audio pour la sortie
  '-b:a', '128k',       // Bitrate audio
  '-ar', '44100',       // Fréquence d'échantillonnage
  '-f', 'flv',
];
