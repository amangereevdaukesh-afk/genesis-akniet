const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:false});
 try{
  for(const mobile of [false,true]){
   const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:900},isMobile:mobile,hasTouch:mobile,reducedMotion:mobile?'reduce':'no-preference'});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto((process.env.BASE_URL||'http://127.0.0.1:4352')+'/#glow');
   await page.getByRole('button',{name:'Explore Demo',exact:true}).click();
   await page.getByRole('button',{name:'Explore demo memory'}).click();
   const viewer=page.getByRole('dialog',{name:'Living memory'});
   await viewer.getByRole('heading',{name:'Where the lake held light'}).waitFor();
   const img=viewer.locator('.main-print');
   await img.evaluate(i=>i.decode());
   assert(await img.evaluate(i=>i.naturalWidth>800));
   await page.waitForTimeout(1600);
   if(process.env.SHOT_DIR)await page.screenshot({path:path.join(process.env.SHOT_DIR,mobile?'lake-mobile.jpg':'lake-desktop.jpg'),quality:85});
   await viewer.getByRole('button',{name:'Next photograph'}).click();
   await img.evaluate(i=>i.decode());
   await viewer.getByText(/Around the bend/).waitFor();
   await viewer.getByRole('button',{name:'Read diary'}).click();
   await viewer.locator('.reading-room').getByText(/By evening/).waitFor();
   await viewer.getByRole('button',{name:'Back to memory'}).click();
   await viewer.getByRole('button',{name:'Replay'}).click();
   assert.equal(await viewer.locator('[aria-current=step]').getAttribute('aria-label'),'View photograph 1');
   assert(await viewer.evaluate(el=>el.scrollWidth<=innerWidth));
   await viewer.getByRole('button',{name:/Return to gallery/}).click();
   await page.reload();await page.getByRole('button',{name:'Explore demo memory'}).waitFor();
   assert.deepEqual(errors,[]);await page.close();
   console.log('PASS Lake premiere '+(mobile?'mobile reduced motion':'desktop motion'));
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e.message);process.exitCode=1});
