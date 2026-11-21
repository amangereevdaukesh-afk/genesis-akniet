const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch();
 const base=process.env.BASE_URL||'http://127.0.0.1:4318';
 const title='QA '+Date.now();
 async function visitor(){
   const ctx=await browser.newContext({reducedMotion:'reduce'});
   const p=await ctx.newPage();p.setDefaultTimeout(12000);
   await p.goto(base+'/?lite#glow');
   return p;
 }
 async function login(p){
   await p.getByLabel('Email',{exact:true}).fill(process.env.QA_EMAIL);
   await p.getByLabel('Password',{exact:true}).fill(process.env.QA_PASSWORD);
   await p.getByRole('button',{name:'Sign in with email'}).click();
 }
 try{
 const first=await visitor();
 await first.getByRole('button',{name:'Create a memory',exact:true}).first().click();
 await login(first);
 await first.locator('[name=title]').fill(title);
 await first.locator('[name=diary]').fill('Museum cloud verification');
 await first.locator('[name=music]').fill('https://example.com/music');
 await first.getByLabel('Photographs',{exact:true}).setInputFiles({name:'test.png',mimeType:'image/png',buffer:Buffer.from(await first.evaluate(()=>{const c=document.createElement('canvas');c.width=c.height=1;return c.toDataURL().split(',')[1]}),'base64')});
 await first.getByRole('button',{name:'Save memory',exact:true}).click();
 await first.getByRole('heading',{name:title,exact:true}).waitFor().catch(async e=>{console.error(await first.locator('body').innerText());throw e});
 const other=await visitor();
 await other.getByRole('button',{name:'The collection',exact:true}).click();
 await login(other);await other.getByText('Private cloud collection',{exact:true}).waitFor();
 await other.reload();
 await other.getByRole('button',{name:'The collection',exact:true}).click();
 await other.getByRole('button',{name:new RegExp(title)}).click();
 await other.getByRole('button',{name:'Open living memory'}).click();
 const img=other.getByRole('dialog').locator('img').first();
 await img.waitFor();assert(await img.evaluate(async el=>{await el.decode();return el.naturalWidth===1}));
 await other.getByRole('button',{name:/Return to gallery/}).click();
 await other.getByRole('button',{name:'The collection',exact:true}).click();
 other.once('dialog',d=>d.accept());
 await other.getByRole('button',{name:'Delete',exact:true}).click();
 await other.getByText(/No memories yet/).waitFor();
 console.log('PASS: browser sign-in, resume editor, cloud save, independent browser sign-in, reload, photo playback and delete');
 }finally{await browser.close()}
})().catch(e=>{console.error(e.message);process.exitCode=1});
