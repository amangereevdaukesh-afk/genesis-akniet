const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const b=await chromium.launch({args:['--enable-unsafe-swiftshader']});
 try{
 const p=await b.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
 await p.goto((process.env.BASE_URL||'http://127.0.0.1:4318')+'/#glow');
 await p.getByRole('button',{name:'Explore demo memory'}).waitFor();
 await p.evaluate(async()=>{
   const c=document.createElement('canvas');c.width=c.height=64;
   const ctx=c.getContext('2d');ctx.fillStyle='#ff00ff';ctx.fillRect(0,0,64,64);
   const photo=await new Promise(resolve=>c.toBlob(resolve));
   const db=await new Promise(resolve=>{const req=indexedDB.open('museum-of-days',2);req.onsuccess=()=>resolve(req.result)});
   await new Promise((resolve,reject)=>{const tx=db.transaction('memories','readwrite');const store=tx.objectStore('memories'),req=store.getAll();req.onsuccess=()=>{const m=req.result.find(x=>x.room==='glow');m.photos=[photo];store.put(m)};tx.oncomplete=resolve;tx.onerror=reject});db.close();
 });
 await p.reload();
 await p.getByRole('button',{name:'Explore demo memory'}).waitFor();
 await p.locator('canvas').first().waitFor();
 const until=Date.now()+15000;
 let pixels=0;
 while(Date.now()<until&&pixels<300){
 const png=await p.screenshot();
 pixels=await p.evaluate(async data=>{const img=new Image();img.src=data;await img.decode();const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);const a=ctx.getImageData(0,0,c.width,c.height).data;let count=0;for(let i=0;i<a.length;i+=4)if(a[i]>220&&a[i+1]<35&&a[i+2]>220)count++;return count},'data:image/png;base64,'+png.toString('base64'));
 }
 assert(pixels>=300,'Photograph absent from rendered room');console.log('PASS: '+pixels+' diagnostic photograph pixels on gallery wall');
 }finally{await b.close()}
})().catch(e=>{console.error(e.message);process.exitCode=1});
