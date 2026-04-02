const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto('http://localhost:4173/index.html', { waitUntil: 'networkidle' });
  const data = await page.evaluate(() => {
    const ids = ['reader-command-bar','rec_text','reader-surface','reader-overlay-bottom','play_div','teleprompter'];
    const out = {};
    for (const id of ids) {
      const el = document.getElementById(id);
      if (!el) { out[id] = null; continue; }
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      out[id] = {
        x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,top:r.top,
        display:cs.display,position:cs.position,opacity:cs.opacity,visibility:cs.visibility,
        overflowY:cs.overflowY
      };
    }
    out.viewport = { width: window.innerWidth, height: window.innerHeight };
    return out;
  });
  console.log(JSON.stringify(data, null, 2));
  await browser.close();
})();
