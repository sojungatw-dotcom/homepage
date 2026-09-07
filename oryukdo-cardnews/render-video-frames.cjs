const { chromium } = require('playwright');
const { pathToFileURL } = require('url');
const path = require('path');
const fs = require('fs');

const FPS = 24;
const CARD_SECONDS = 4;
const TRANSITION_SECONDS = 0.35;
const CARD_COUNT = 5;

(async () => {
  const framesDir = process.argv[2];
  if (!framesDir) throw new Error('Usage: node render-video-frames.cjs <frames-directory>');
  fs.mkdirSync(framesDir, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
  const entry = pathToFileURL(path.join(__dirname, 'index.html')).href;
  await page.goto(entry);
  await page.addStyleTag({ content: `
    html, body { width: 1080px !important; height: 1350px !important; overflow: hidden !important; background: #082c45 !important; }
    .page-shell { width: 1080px !important; height: 1350px !important; padding: 0 !important; }
    .viewer-head, .card-nav { display: none !important; }
    .deck { display: block !important; width: 1080px !important; height: 1350px !important; position: relative !important; }
    .card { display: block !important; position: absolute !important; inset: 0 !important; width: 1080px !important; height: 1350px !important; box-shadow: none !important; }
  ` });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map(image => image.decode?.().catch(() => {})));
  });

  const totalFrames = CARD_COUNT * CARD_SECONDS * FPS;
  for (let frame = 0; frame < totalFrames; frame += 1) {
    const time = frame / FPS;
    await page.evaluate(({ time, cardSeconds, transitionSeconds, cardCount }) => {
      const cards = [...document.querySelectorAll('.card')];
      const current = Math.min(Math.floor(time / cardSeconds), cardCount - 1);
      const local = time - current * cardSeconds;
      const transitionStart = cardSeconds - transitionSeconds;
      const progress = current < cardCount - 1 && local >= transitionStart
        ? (local - transitionStart) / transitionSeconds
        : 0;

      cards.forEach((card, index) => {
        card.style.zIndex = index === current + 1 ? '2' : index === current ? '1' : '0';
        card.style.opacity = index === current ? String(1 - progress) : index === current + 1 ? String(progress) : '0';
        card.style.visibility = index === current || index === current + 1 ? 'visible' : 'hidden';
        const cardTime = index === current ? local : index === current + 1 ? Math.max(0, local - transitionStart) : 0;
        card.getAnimations({ subtree: true }).forEach(animation => {
          animation.pause();
          animation.currentTime = Math.max(0, cardTime * 1000);
        });
      });
    }, { time, cardSeconds: CARD_SECONDS, transitionSeconds: TRANSITION_SECONDS, cardCount: CARD_COUNT });

    await page.locator('.deck').screenshot({
      path: path.join(framesDir, `frame-${String(frame).padStart(4, '0')}.jpg`),
      type: 'jpeg',
      quality: 92
    });
    if ((frame + 1) % (FPS * CARD_SECONDS) === 0) {
      console.log(`Rendered ${(frame + 1) / (FPS * CARD_SECONDS)} / ${CARD_COUNT} cards`);
    }
  }

  await browser.close();
  console.log(`Rendered ${totalFrames} frames at ${FPS} fps`);
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
