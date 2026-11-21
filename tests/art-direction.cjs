const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch();try{
const p=await browser.newPage();await p.goto((process.env.BASE_URL||'http://127.0.0.1:4340')+'/?lite');
const output=await p.evaluate(async()=>{
 const {studyPhotos,interpret,suggestTitle}=await import('/src/artDirection.ts');
 const c=document.createElement('canvas');c.width=20;c.height=10;
 const ctx=c.getContext('2d');ctx.fillStyle='#804020';ctx.fillRect(0,0,20,10);
 const blob=await new Promise(r=>c.toBlob(r));const [sample]=await studyPhotos([blob]);
 const layouts=[1,2,3].map(n=>interpret('a quiet walk','glow',Array(n).fill(sample),'quiet'));
 return {sample,layouts:layouts.map(x=>x.layout),quiet:layouts[0].seconds,fast:interpret('dance','pulse',[],'driving').seconds,title:suggestTitle('Солнце','glow')};
});
assert.equal(output.sample.color,'#804020');assert.equal(output.sample.ratio,2);
assert.deepEqual(output.layouts,['panorama','pair','sequence']);assert(output.quiet>output.fast);
assert(output.title.split(' ').length>=3);console.log('PASS: photo palette, ratio, count, direction, title and cadence');
}finally{await browser.close()}})().catch(e=>{console.error(e.message);process.exitCode=1});
