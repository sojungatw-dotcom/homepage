const { chromium } = require('playwright');
const { pathToFileURL } = require('url');
const path = require('path');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  });
  const page = await browser.newPage({ viewport: { width: 1120, height: 1390 }, deviceScaleFactor: 1 });
  const browserErrors = [];
  page.on('pageerror', error => browserErrors.push(error.message));
  const entry = pathToFileURL(path.join(__dirname, 'index.html')).href;

  for (let card = 1; card <= 5; card += 1) {
    await page.goto(`${entry}?card=${card}&static=1`);
    await page.addStyleTag({ content: `
      html, body { background: transparent !important; }
      .page-shell { padding: 0 !important; }
      .viewer-head, .card-nav { display: none !important; }
      body.single .deck { width: 1080px !important; max-width: none !important; }
      body.single .card.is-selected { width: 1080px !important; height: 1350px !important; }
    ` });
    const overflow = await page.locator('.card.is-selected').evaluate(cardEl => {
      const cardRect = cardEl.getBoundingClientRect();
      return [...cardEl.querySelectorAll('h2, p, strong, .topline, .closing-strip, .sea-labels')]
        .filter(el => {
          const rect = el.getBoundingClientRect();
          return rect.left < cardRect.left - 1 || rect.right > cardRect.right + 1 ||
            rect.top < cardRect.top - 1 || rect.bottom > cardRect.bottom + 1;
        })
        .map(el => el.textContent.trim().slice(0, 40));
    });
    if (overflow.length) throw new Error(`Card ${card} text overflow: ${overflow.join(' | ')}`);
    await page.locator('.card.is-selected').screenshot({
      path: path.join(__dirname, 'exports', `${String(card).padStart(2, '0')}.png`)
    });
  }

  if (browserErrors.length) throw new Error(`Browser errors: ${browserErrors.join(' | ')}`);

  await browser.close();
  console.log('Exported 5 cards to exports/01.png ... exports/05.png');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
