const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({args:['--enable-unsafe-swiftshader']});try{
const p=await b.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
for(const [id,x] of [['glow',190],['hush',540],['echo',900],['pulse',1260]]){
 await p.goto((process.env.BASE_URL||'http://127.0.0.1:4337')+'/#hall');
 await p.locator('[data-place=hall][data-ready=true]').waitFor();
 await p.mouse.move(1,1);await p.waitForTimeout(240);
 const sample=()=>p.screenshot({clip:{x:x-18,y:430,width:8,height:8}});
 const before=await sample();await p.mouse.move(x,440);await p.waitForTimeout(350);
 assert.notDeepEqual(await sample(),before,id+' hover pixels');
 await p.mouse.click(x,440);await p.locator('[data-place='+id+']').waitFor();console.log(id+' hover and door PASS');
}
}finally{await b.close()}})().catch(e=>{console.error(e.message);process.exitCode=1});
