const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),vendor=path.join(root,'web/vendor/pokemon-cards-css');
const manifest=JSON.parse(fs.readFileSync(path.join(vendor,'UPSTREAM.json')));
for(const [name,hash] of Object.entries(manifest.files))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(vendor,name))).digest('hex'),hash,`Modified upstream file: ${name}`);
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH});
 const page=await browser.newPage({viewport:{width:1440,height:950},reducedMotion:'no-preference'}),errors=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
 await page.goto((process.env.DEMO_URL||'http://127.0.0.1:8142')+'/demo/card-lab.html');
 const cards=page.locator('.dex-card');assert.equal(await cards.count(),4);
 for(let i=0;i<4;i++){
  const card=cards.nth(i),box=await card.boundingBox();assert.ok(Math.abs(box.width/box.height-.718)<.002,'Card proportions distorted');
  const initial=await card.locator('.card__glare').evaluate(e=>getComputedStyle(e).backgroundImage);
  await card.dispatchEvent('pointermove',{clientX:box.x+box.width*.8,clientY:box.y+box.height*.75,pointerType:'touch',isPrimary:true,pointerId:5});
  await page.waitForFunction(i=>document.querySelectorAll('.dex-card')[i].style.getPropertyValue('--pointer-x')!=='',i);
  const value=await card.evaluate(e=>({x:e.style.getPropertyValue('--pointer-x'),rotate:getComputedStyle(e.querySelector('.card__rotator')).transform,glare:getComputedStyle(e.querySelector('.card__glare')).backgroundImage,shine:getComputedStyle(e.querySelector('.card__shine')).backgroundImage}));
  assert.ok(parseFloat(value.x)>60,'Touch did not drive upstream pointer variables');assert.notEqual(value.glare,initial,'Upstream glare did not respond');
  if(i>0)assert.notEqual(value.shine,'none','Upstream holo effect missing');
 }
 const loaded=await page.evaluate(()=>[...document.styleSheets].map(s=>s.href).filter(Boolean));
 for(const name of Object.keys(manifest.files))assert.ok(loaded.some(url=>url.endsWith('/vendor/pokemon-cards-css/'+name)),`Upstream CSS not loaded: ${name}`);
 assert.ok(requests.every(url=>new URL(url).hostname==='127.0.0.1'),'Cards fetched remote art or texture');
 await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await cards.first().locator('.card__rotator').evaluate(e=>getComputedStyle(e).transform),'none');
 await page.setViewportSize({width:320,height:700});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Print studio overflows phone');
 assert.deepEqual(errors,[]);await browser.close();console.log('PASS: six verbatim upstream CSS files loaded; correct proportions; all finishes; touch-driven upstream glare; reduced motion; no remote assets; mobile studio.');
})().catch(e=>{console.error(e);process.exit(1)});
