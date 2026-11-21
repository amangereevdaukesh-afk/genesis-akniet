const {chromium,webkit,devices}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const engine=process.env.ENGINE==='webkit'?webkit:chromium;
 const browser=await engine.launch({headless:engine===chromium,args:engine===chromium?['--enable-unsafe-swiftshader']:[]});
 try{
 const page=await browser.newPage({...devices['iPhone 13'],viewport:{width:390,height:844},deviceScaleFactor:1,reducedMotion:'reduce'});
 page.setDefaultTimeout(20000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto((process.env.BASE_URL||'http://127.0.0.1:4368')+'/#hall');
 await page.getByRole('button',{name:'Explore Demo',exact:true}).tap();
 const hall=page.locator('[data-place=hall][data-ready=true]');
 await hall.waitFor();await page.locator('canvas').first().waitFor();
 const cdp=engine===chromium?await page.context().newCDPSession(page):null;
 async function swipe(){
  if(cdp){
   for(const [i,x] of [290,250,200,140,90].entries()){
    await cdp.send('Input.dispatchTouchEvent',{type:i?'touchMove':'touchStart',touchPoints:[{x,y:410}]});
   }
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  }else{
   const canvas=page.locator('canvas').first();const props={pointerId:7,pointerType:'touch',isPrimary:true,button:0,clientY:410};
   await canvas.dispatchEvent('pointerdown',{...props,clientX:290});
   await canvas.dispatchEvent('pointermove',{...props,clientX:90});
   await canvas.dispatchEvent('pointerup',{...props,clientX:90});
  }
 }
 for(const [i,room] of ['glow','hush','echo','pulse'].entries()){
  await hall.waitFor();await page.waitForTimeout(500);
  if(i){await swipe();await hall.waitFor();await page.waitForTimeout(300)}
  await page.touchscreen.tap(195,410);
  await page.locator('[data-place='+room+']').waitFor();
  await page.getByRole('button',{name:'Explore demo memory'}).tap();
  const viewer=page.getByRole('dialog',{name:'Living memory'});await viewer.locator('.main-print').evaluate(i=>i.decode());
  await viewer.getByRole('button',{name:/Return to gallery/}).tap();
  const back=page.getByRole('button',{name:'Back to the gallery',exact:true});if(await back.isVisible())await back.tap();
  await page.getByRole('button',{name:'Main hall',exact:true}).tap();
  console.log('PASS '+engine.name()+' touch door, picture, return: '+room);
 }
 assert.deepEqual(errors,[]);
 }finally{await browser.close()}
})().catch(e=>{console.error(e.message);process.exitCode=1});
