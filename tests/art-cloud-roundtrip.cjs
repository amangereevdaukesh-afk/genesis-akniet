const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
// Run only with a confirmed, dedicated empty test account and normal email sign-in.
(async()=>{
 if(!process.env.QA_EMAIL||!process.env.QA_PASSWORD)throw Error('A confirmed disposable QA account is required.');
 const browser=await chromium.launch({headless:false});
 try{
  const p=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
  const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto((process.env.BASE_URL||'http://127.0.0.1:4337')+'/#hall');
  await p.getByLabel('Email',{exact:true}).fill(process.env.QA_EMAIL);await p.getByLabel('Password',{exact:true}).fill(process.env.QA_PASSWORD);
  await p.getByRole('button',{name:'Continue with Email'}).click();
  await p.getByRole('button',{name:'Enter the museum',exact:true}).click();
  await p.locator('[data-place=hall][data-ready=true]').waitFor();
  await p.mouse.click(190,440);await p.locator('[data-place=glow]').waitFor();await p.waitForTimeout(400);
  await p.mouse.click(340,440);await p.getByLabel('Your diary').fill('A quiet walk beside the river.');
  const title='Atelier QA '+Date.now();await p.locator('[name=title]').fill(title);
  const colors=['#db155a','#058446','#423cdb'];
  const files=await p.evaluate(colors=>colors.map((color,i)=>{const c=document.createElement('canvas');c.width=90+i*20;c.height=80;const ctx=c.getContext('2d');ctx.fillStyle=color;ctx.fillRect(0,0,c.width,c.height);return c.toDataURL().split(',')[1]}),colors);
  await p.getByLabel('Photographs',{exact:true}).setInputFiles(files.map((data,i)=>({name:i+'.png',mimeType:'image/png',buffer:Buffer.from(data,'base64')})));
  await p.getByLabel('Musical energy').selectOption('quiet');
  await p.getByLabel('Song or artist').fill('Clair de lune');await p.getByRole('button',{name:'Search music'}).click();
  await p.getByRole('group',{name:'Find a recording'}).getByRole('button',{name:/ · /}).first().click();
  const committed=p.waitForResponse(r=>r.url().includes('/rpc/store_day')&&r.request().method()==='POST');
  await p.getByRole('button',{name:'Save memory',exact:true}).click();assert((await committed).ok());
  await p.getByRole('heading',{name:title,exact:true}).waitFor();
  async function play(){await p.getByRole('button',{name:'Open living memory'}).click();const viewer=p.getByRole('dialog',{name:'Living memory'});await viewer.waitFor();assert.equal(await viewer.getAttribute('data-layout'),'sequence');await viewer.locator('.main-print').evaluate(i=>i.decode());await viewer.getByRole('button',{name:'Pause',exact:true}).click();await viewer.getByRole('button',{name:'Play',exact:true}).click();await viewer.getByRole('button',{name:'Next photograph'}).click();await viewer.getByRole('button',{name:'Previous photograph'}).click();await viewer.getByRole('button',{name:'Replay'}).click();await viewer.getByRole('button',{name:/Return to gallery/}).click();}
  await play();await p.reload();await p.getByRole('button',{name:'The collection',exact:true}).click();await p.getByRole('button',{name:new RegExp(title)}).click();await play();
  await p.getByRole('button',{name:'The collection',exact:true}).click();
  p.once('dialog',d=>d.accept());await p.locator('.collection-list > div').filter({hasText:title}).getByRole('button',{name:'Delete',exact:true}).click();
  await p.getByText('No memories yet.',{exact:false}).waitFor();await p.getByRole('button',{name:'Return to the main hall'}).click();await p.locator('[data-place=hall]').waitFor();
  assert.deepEqual(errors,[]);console.log('PASS: authenticated art edition round trip');
 }finally{await browser.close()}
})().catch(e=>{console.error(e.message);process.exitCode=1});
