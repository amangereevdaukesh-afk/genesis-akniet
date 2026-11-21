const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{const b=await chromium.launch({headless:false});try{
 const p=await b.newPage({viewport:{width:390,height:844},hasTouch:true,reducedMotion:'reduce'});
 await p.goto((process.env.BASE_URL||'http://127.0.0.1:4337')+'/#hall');
 await p.locator('[data-place=hall][data-ready=true]').waitFor();await p.waitForTimeout(400);
 await p.touchscreen.tap(195,435);await p.locator('[data-place=glow]').waitFor();await p.waitForTimeout(600);
 await p.touchscreen.tap(195,440);await p.getByRole('dialog',{name:'Living memory'}).waitFor();
 await p.locator('.memory-image img').evaluate(i=>i.decode());console.log('PASS: touch door and physical framed photograph at 390x844');
}finally{await b.close()}})().catch(e=>{console.error(e.message);process.exitCode=1});
