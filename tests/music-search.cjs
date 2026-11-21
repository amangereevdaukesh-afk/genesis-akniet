const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

// Component integration against the live catalogue. BASE_URL must be a Vite dev server.
(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto((process.env.BASE_URL || 'http://127.0.0.1:4324') + '/?lite');
    await page.evaluate(async () => {
      const {createElement} = (await import('/node_modules/.vite/deps/react.js')).default;
      const {createRoot} = (await import('/node_modules/.vite/deps/react-dom_client.js')).default;
      const {MemoryEditor} = await import('/src/MemoryUI.tsx');
      const host = document.createElement('div');
      document.body.append(host);
      createRoot(host).render(createElement(MemoryEditor, {
        owner:'component-test', room:'glow', slot:0, memories:[], onClose(){}, onSaved(){}
      }));
    });
    await page.getByLabel('Song or artist').fill('Clair de lune');
    const response = page.waitForResponse(r => r.url().startsWith('https://itunes.apple.com/search?'));
    await page.getByRole('button',{name:'Search music'}).click();
    const catalogue = await response;
    assert.equal(catalogue.status(),200);
    const result = (await catalogue.json()).results.find(t => String(t.trackViewUrl).startsWith('https://music.apple.com/'));
    assert.ok(result,'Expected a selectable Apple Music recording');
    const label = result.trackName+' · '+result.artistName;
    await page.getByRole('button',{name:label,exact:true}).first().click();
    assert.equal(await page.getByLabel('Music link').inputValue(),result.trackViewUrl);
    await page.getByLabel('Music link').fill('https://example.com/another-recording');
    assert.equal(await page.getByLabel('Music link').inputValue(),'https://example.com/another-recording');
    assert.equal(await page.getByRole('group',{name:'Find a recording'}).getByRole('status').textContent(),'');
    console.log('PASS: live catalogue search, recording selection and manual URL override');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e.message);process.exitCode=1});
