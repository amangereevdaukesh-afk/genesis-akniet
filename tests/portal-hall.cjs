// Monumental portals: hover feedback and click on desktop, swipe + tap on phones, for all
// four galleries, and draw-call/triangle counts per space (via the ?stats renderer hook).
// Usage: BASE_URL=http://127.0.0.1:4173 node tests/portal-hall.cjs
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const base=process.env.BASE_URL||'http://127.0.0.1:4173';
const rooms=['glow','hush','echo','pulse'];
async function admit(page,hash){
 await page.goto('about:blank');await page.goto(base+'/?stats#'+hash);
 const demo=page.getByRole('button',{name:'Explore Demo',exact:true});
 if(await demo.isVisible({timeout:4000}).catch(()=>false))await demo.click();
 await page.locator(`[data-place=${hash}][data-ready=true]`).waitFor({timeout:30000});
 await page.waitForTimeout(600);
}
const stats=page=>page.evaluate(()=>{const gl=window.__museumGl;return gl?{calls:gl.info.render.calls,triangles:gl.info.render.triangles,programs:gl.info.programs?.length,textures:gl.info.memory.textures,geometries:gl.info.memory.geometries}:null});
(async()=>{
 const browser=await chromium.launch({args:['--enable-unsafe-swiftshader']});
 const errors=[];
 try{
  // Desktop: every portal reacts to hover and opens its gallery.
  const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
  page.on('pageerror',e=>errors.push(e.message));
  for(const [id,x] of [['glow',190],['hush',540],['echo',900],['pulse',1260]]){
   await admit(page,'hall');
   if(id==='glow')console.log('hall stats',JSON.stringify(await stats(page)));
   await page.mouse.move(1,1);await page.waitForTimeout(300);
   const sample=()=>page.screenshot({clip:{x:x-18,y:430,width:8,height:8}});
   const before=await sample();await page.mouse.move(x,440);await page.waitForTimeout(450);
   assert.notDeepEqual(await sample(),before,id+' hover changes the portal light');
   await page.mouse.click(x,440);await page.locator(`[data-place=${id}][data-ready=true]`).waitFor();
   await page.waitForTimeout(700);
   console.log(`PASS desktop portal ${id}`,JSON.stringify(await stats(page)));
  }
  await page.close();
  // Phones: swipe along the hall to each portal and tap the arch in the centre of the screen.
  for(const [w,h] of [[360,800],[390,844],[430,932]]){
   const phone=await browser.newPage({viewport:{width:w,height:h},hasTouch:true,isMobile:true,reducedMotion:'reduce'});
   phone.on('pageerror',e=>errors.push(e.message));
   const cdp=await phone.context().newCDPSession(phone);
   for(const [i,id] of rooms.entries()){
    await admit(phone,'hall');
    for(let n=0;n<i;n++){
     const pts=[.75,.65,.5,.35,.22].map(f=>Math.round(w*f));
     for(const [k,x] of pts.entries())await cdp.send('Input.dispatchTouchEvent',{type:k?'touchMove':'touchStart',touchPoints:[{x,y:Math.round(h*.48)}]});
     await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
     await phone.waitForTimeout(450);
     assert.equal(await phone.locator('[data-place=hall]').count(),1,'a swipe must not open a gallery');
    }
    await phone.touchscreen.tap(Math.round(w/2),Math.round(h*.48));
    await phone.locator(`[data-place=${id}]`).waitFor({timeout:15000});
    console.log(`PASS ${w}x${h} swipe+tap ${id}`);
   }
   await phone.close();
  }
  assert.deepEqual(errors,[]);
 }finally{await browser.close()}
})().catch(e=>{console.error(e.message);process.exitCode=1});
