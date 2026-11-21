const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({headless:false});try{
 const p=await b.newPage({reducedMotion:'reduce',viewport:{width:1440,height:900}});
 const errors=[];p.on('pageerror',e=>errors.push(e.message));
 const base=process.env.BASE_URL||'http://127.0.0.1:4337';
 for(const room of ['glow','hush','echo','pulse']){
  await p.goto(base+'/#'+room);await p.locator('[data-place='+room+'][data-ready=true]').waitFor();
  const model=(room==='glow'?'sunlit':room)+'-rebate.glb';
  await p.waitForFunction(m=>performance.getEntriesByType('resource').some(e=>e.name.endsWith(m)),model);
  await p.getByRole('button',{name:'Explore demo memory'}).click();
  await p.locator('.memory-image img').evaluate(i=>i.decode());await p.getByRole('button',{name:/Return to gallery/}).click();
 }
 assert.deepEqual(errors,[]);console.log('PASS: four profiles load and four framed demo memories open and close');
}finally{await b.close()}})().catch(e=>{console.error(e.message);process.exitCode=1});
