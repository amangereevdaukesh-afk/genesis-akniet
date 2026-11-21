const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
// Isolated client contract. Every Supabase request is intercepted before transmission.
(async()=>{
 const browser=await chromium.launch();
 try{
  const p=await browser.newPage();
  const owner='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const files=new Map();let row=null;const downloads=[];let rejectNext=false;
  await p.route('https://*.supabase.co/**',async route=>{
   const req=route.request(),path=new URL(req.url()).pathname;
   const ok=(value,status=200)=>route.fulfill({status,json:value});
   if(path.endsWith('/rest/v1/memories'))return ok(req.headers().accept?.includes('object')?row:(row?[row]:[]));
   if(path.endsWith('/rpc/store_day')){
    if(rejectNext){rejectNext=false;return ok({code:'23505',message:'Fixture rejection'},409)}
    const {day,pictures,music}=req.postDataJSON();
    row={id:day.id,user_id:owner,memory_date:day.date,title:day.title,diary_text:day.diary,slot:day.slot,emotional_room:day.room,visual_settings:day.visual,memory_photos:pictures.map((p,i)=>({storage_path:p.path,display_order:i})),memory_music:{external_url:music.url,storage_path:null}};
    return ok(null);
   }
   if(path.includes('/object/memory-media/')){
    const key=path.split('/object/memory-media/')[1];
    if(req.method()==='POST'){files.set(key,req.postDataBuffer());return ok({Key:key})}
    downloads.push(key);return route.fulfill({contentType:'image/png',body:files.get(key)});
   }
   if(path.endsWith('/object/memory-media')&&req.method()==='DELETE'){for(const key of req.postDataJSON().prefixes)files.delete(key);return ok([])}
   return route.abort();
  });
  await p.goto((process.env.DEV_URL||'http://127.0.0.1:4340')+'/?lite');
  await p.evaluate(async({owner,id})=>{
   const {saveCloud}=await import('/src/cloud.ts');const c=document.createElement('canvas');c.width=600;c.height=300;
   const blob=await new Promise(r=>c.toBlob(r));window.fixture={id,date:'2026-01-01',room:'glow',slot:0,title:'Test',diary:'Test',visual:{seconds:5},photos:[blob,blob,blob],musicUrl:''};
   await saveCloud(window.fixture,owner);
  },{owner,id});
  assert.equal(files.size,4);assert(row.visual_settings.previewPath);
  await p.evaluate(async owner=>{const {readCloud}=await import('/src/cloud.ts');window.collection=await readCloud(owner)},owner);
  assert.equal(downloads.length,0);
  const count=await p.evaluate(async()=>{const {hydrate}=await import('/src/cloud.ts');return (await hydrate(window.collection[0])).photos.length});
  assert.equal(count,3);assert.equal(downloads.length,3);
  rejectNext=true;
  assert(await p.evaluate(async owner=>{const {saveCloud}=await import('/src/cloud.ts');try{await saveCloud(window.fixture,owner,true);return false}catch{return true}},owner));
  assert.equal(files.size,4);
  console.log('PASS intercepted Storage/RPC: cover + originals, metadata-only collection, on-demand originals, failed edit cleanup.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e.message);process.exitCode=1});
