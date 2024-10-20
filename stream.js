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

  const args = ffmpegArgs({ fps, resolution, preset, rate, threads });
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

  ffmpeg.on('error', (err) => {
    console.error('Error starting ffmpeg:', err);
  });

  ffmpeg.on('exit', (code) => {
    console.log(`ffmpeg exited with code ${code}`);
  });

  ffmpeg.stdin.on('error', (err) => {
    console.error('Error on ffmpeg stdin:', err);
  });

  let screenshot = null;

  while (true) {
    await options.render(browser, page);
    screenshot = await page.screenshot({ type: 'jpeg' });

    // Vérifiez si ffmpeg est encore en cours d'exécution
    if (!ffmpeg.killed) {
      try {
        await ffmpeg.stdin.write(screenshot);
      } catch (err) {
        console.error('Error writing to ffmpeg stdin:', err);
        break; // Quittez la boucle si une erreur se produit
      }
    } else {
      console.log('ffmpeg process has exited.');
      break; // Quittez la boucle si ffmpeg est terminé
    }
  }

  // Nettoyage
  ffmpeg.stdin.end(); // Ferme le flux stdin
};

const ffmpegArgs = ({ fps, resolution = '2480x720', preset = 'medium', rate = '2500k', threads = 2 }) => [
  '-f', 'image2pipe',
  '-use_wallclock_as_timestamps', '1',
  '-i', '-',
  '-f', 'lavfi', '-i', '-',
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
  '-f', 'lavfi', '-acodec', 'aac', '-ar', '44100', '-b:a', '128k',
  '-f', 'flv',
];
