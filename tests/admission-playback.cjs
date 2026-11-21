const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:false,args:['--autoplay-policy=user-gesture-required']});
 try{
 const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{const Native=window.Audio;window.Audio=class extends Native{constructor(src){super(src);window.testAudio=this}}});
 await page.goto((process.env.BASE_URL||'http://127.0.0.1:4348')+'/#glow');
 await page.getByRole('button',{name:'Continue with Google'}).waitFor();
 assert.equal(await page.locator('canvas').count(),0);
 assert.deepEqual(await page.evaluate(()=>performance.getEntriesByType('resource').map(x=>x.name).filter(n=>/\.glb|MuseumScene-|three-engine-|\/App-[\w-]+\.js/.test(n))),[]);
 await page.getByRole('button',{name:'Sign Up',exact:true}).click();
 await page.getByRole('heading',{name:'Create your museum account'}).waitFor();
 await page.getByRole('button',{name:'Forgot Password?'}).click();
 await page.getByRole('button',{name:'Send recovery email'}).waitFor();
 await page.getByRole('button',{name:'Explore Demo'}).click();
 await page.getByRole('button',{name:'Explore demo memory'}).click();
 const viewer=page.getByRole('dialog',{name:'Living memory'});await viewer.waitFor();
 await page.waitForFunction(()=>window.testAudio&&!window.testAudio.paused&&window.testAudio.currentTime>0);
 await viewer.getByRole('button',{name:'Pause',exact:true}).click();assert(await page.evaluate(()=>window.testAudio.paused));
 await viewer.getByRole('button',{name:'Replay',exact:true}).click();await page.waitForFunction(()=>!window.testAudio.paused);
 await viewer.getByRole('button',{name:/Return to gallery/}).click();assert(await page.evaluate(()=>window.testAudio.paused));
 await page.reload();await page.getByRole('button',{name:'Explore demo memory'}).waitFor();assert.deepEqual(errors,[]);
 console.log('PASS admission, deferred museum, signup/recovery forms, demo, one-click audio, pause/replay/close, demo reload.');
 } finally {await browser.close()}
})().catch(e=>{console.error(e.message);process.exitCode=1});
