const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const base=process.env.BASE_URL||'http://127.0.0.1:8139';
const demoBase=process.env.DEMO_URL||'http://127.0.0.1:8142';
const fixture={id:'word-test-cup',word:'カップ',reading:'かっぷ',romaji:'kappu',english:'cup',description:'A small container for drinking.',sentence:'これはカップです。',sentence_reading:'これはかっぷです。',translation:'This is a cup.',fact:'カップ is written in katakana.',rarity:'Rare',card_finish:'holo',rarity_reason:'A visibly unusual test object.',card_type:'household',template:'everyday',source:'Model draft',asset:'data:image/png;base64,'+fs.readFileSync(path.join(root,'web/assets/cup.png')).toString('base64')};
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));

async function swipeRight(page){
 await page.locator('main').dispatchEvent('pointerdown',{pointerId:91,isPrimary:true,pointerType:'touch',clientX:70,clientY:400});
 await page.locator('main').dispatchEvent('pointerup',{pointerId:91,isPrimary:true,pointerType:'touch',clientX:270,clientY:405});
}
async function fit(page,name){
 const box=await page.evaluate(()=>{const display=document.querySelector('.display');return {width:innerWidth,screen:document.documentElement.scrollWidth,pageHeight:document.documentElement.scrollHeight,height:innerHeight,pane:display.clientHeight,paneScroll:display.scrollHeight};});
 assert.ok(box.screen<=box.width,`${name}: horizontal overflow ${JSON.stringify(box)}`);
 assert.ok(box.pageHeight<=box.height,`${name}: page scrolls`);
 assert.ok(box.paneScroll<=box.pane+2,`${name}: contents clipped ${JSON.stringify(box)}`);
}
(async()=>{
 fs.mkdirSync(path.join(root,'test-results'),{recursive:true});
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH});
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/01-classic.html');await page.locator('.activate-camera').waitFor();
 assert.equal(await page.locator('nav,.bottomnav,[data-sample]').count(),0);
 assert.equal(await page.locator('main img').count(),0,'Fresh scanner must not display starter objects');
 assert.ok(!/sample|More to discover|Send photo|Mac/i.test(await page.locator('main').innerText()));
 for(const size of [{width:320,height:568},{width:360,height:640},{width:390,height:844},{width:430,height:932}]){await page.setViewportSize(size);await fit(page,'fresh scanner');}
 await page.setViewportSize({width:390,height:844});
 await swipeRight(page);await page.locator('.empty-archive').waitFor();
 await swipeRight(page);await page.locator('.kana-key').first().waitFor();
 for(const script of ['hiragana','katakana']){
  await page.locator(`[data-script="${script}"]`).click();const seen=new Set();
  for(let n=0;n<4;n++){for(const value of await page.locator('.kana-key').evaluateAll(nodes=>nodes.map(n=>n.dataset.kana)))seen.add(value);if(n<3)await page.locator('[data-action="kana-next"]').click();}
  assert.equal(seen.size,46,script+' pagination dropped characters');
 }
 await page.setViewportSize({width:320,height:568});await fit(page,'small kana');
 await page.keyboard.press('ArrowRight');await page.locator('.activate-camera').waitFor();
 let uploads=0,bodies=[],statusPolls=0;
 await page.route('**/api/scan/status?*',route=>{statusPolls++;return route.fulfill({json:{stage:statusPolls===1?'isolating':'decoding'}})});
 await page.route('**/api/scan',async route=>{uploads++;bodies.push(route.request().postDataJSON());await pause(2600);await route.fulfill({json:fixture}).catch(()=>{});});
 await page.locator('#photo-input').setInputFiles(path.join(root,'web/assets/cup.png'));
 await page.locator('.scanning-screen').waitFor();
 assert.ok(!/Mac|upload|model|HTTP/i.test(await page.locator('main').innerText()));
 await page.getByText('Tracing the subject’s contours').waitFor();
 await page.locator('.dex-card').waitFor();
 assert.equal(uploads,1);assert.match(bodies[0].image,/^data:image\/jpeg;base64,/);assert.match(bodies[0].request_id,/^[a-f0-9]{32}$/);
 assert.equal(await page.locator('select,[data-save]').count(),0,'Card should arrive completed without controls');
 assert.equal(await page.locator('.card-stats b').count(),3);assert.equal(await page.locator('.dex-card').getAttribute('data-rarity'),'rare holo','Model-selected rarity must reach the rendered card');
 for(const size of [{width:320,height:568},{width:360,height:640},{width:390,height:844},{width:430,height:932}]){await page.setViewportSize(size);await fit(page,'card');}
 const rating=await page.locator('.card-stats').innerText();
 await page.locator('[data-action="inspect"]').click();await page.getByRole('dialog').waitFor();
 assert.ok((await page.getByRole('dialog').innerText()).includes('カップ is written in katakana.'));
 await page.keyboard.press('Escape');await page.reload();await page.locator('.last-discovery').waitFor();
 await swipeRight(page);assert.equal(await page.locator('.archive-card').count(),1,'Automatic save did not persist');
 await page.locator('[data-open]').click();assert.equal(await page.locator('.card-stats').innerText(),rating);assert.equal(await page.locator('.dex-card').getAttribute('data-rarity'),'rare holo');
 await page.locator('[data-action="scanner"]').first().click();
 await page.locator('#photo-input').setInputFiles(path.join(root,'web/assets/cup.png'));await page.locator('.dex-card').waitFor();
 await swipeRight(page);assert.equal(await page.locator('.archive-card').count(),1,'Rescan created duplicate');
 await page.keyboard.press('ArrowLeft');
 await page.unroute('**/api/scan');await page.route('**/api/scan',route=>route.fulfill({status:422,json:{error:'Several subjects found. Tap the one you want and retry.'}}));
 await page.locator('#photo-input').setInputFiles(path.join(root,'web/assets/cup.png'));await page.locator('.scan-retry').waitFor();
 assert.equal(await page.locator('#subject-frame img').count(),1);await page.locator('#subject-frame').click();assert.equal(await page.locator('.target-marker').count(),1);
 await page.unroute('**/api/scan');await page.route('**/api/scan',async route=>{bodies.push(route.request().postDataJSON());await pause(1600);await route.fulfill({json:fixture}).catch(()=>{});});
 await page.locator('[data-action="rescan"]').click();await page.locator('[data-action="cancel"]').click();await pause(1800);
 assert.equal(await page.locator('.scan-retry').count(),1,'Cancelled response replaced scanner');assert.ok(bodies.at(-1).target,'Selected subject missing in retry');
 await page.locator('[data-action="scanner"]').click();await page.locator('#photo-input').setInputFiles({name:'broken.png',mimeType:'image/png',buffer:Buffer.from('broken')});await page.getByText('This photograph could not be opened.',{exact:false}).waitFor();
 assert.deepEqual(errors,[]);await context.close();

 // Preserve actual v0.1 cards while removing bundled starter examples.
 const migration=await browser.newContext({viewport:{width:390,height:844}});const m=await migration.newPage();
 const legacy={...fixture,profile:{version:1,rarity:'Ultra rare',finish:'foil'}};delete legacy.rarity;delete legacy.card_finish;delete legacy.rarity_reason;
 await m.addInitScript(({real})=>{localStorage.setItem('spiraldex-v1',JSON.stringify([{id:'chair',word:'椅子',source:'Sample entry'},real,{...real,id:'word-other',word:'りんご',reading:'りんご',english:'apple'}]));},{real:legacy});
 await m.goto(base+'/01-classic.html');await m.locator('.last-discovery').waitFor();await swipeRight(m);assert.equal(await m.locator('.archive-card').count(),2);assert.equal(await m.locator('.dex-card[data-rarity="common"]').count(),2,'Legacy random rarity must not survive migration');assert.ok((await m.locator('.archive-card').allInnerTexts()).join(' ').includes('Unassessed'));assert.ok((await m.locator('.archive-card').allInnerTexts()).join(' ').includes('カップ'));
 await m.route('**/api/scan',route=>route.fulfill({json:fixture}));await m.locator('[data-action="scanner"]').click();await m.locator('#photo-input').setInputFiles(path.join(root,'web/assets/cup.png'));await m.locator('.dex-card').waitFor();await m.reload();await m.locator('.last-discovery').waitFor();assert.ok((await m.locator('.last-discovery').innerText()).includes('カップ'),'Rescanning an older entry must update the last discovery');await migration.close();

 // A full device must never report an unsaved discovery as registered.
 const quota=await browser.newContext({viewport:{width:390,height:844}});const q=await quota.newPage();
 await q.addInitScript(()=>{
  Object.defineProperty(window,'indexedDB',{value:{open(){throw Error('Storage unavailable')}}});
  const save=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='spiraldex-demo-v2'&&value!=='[]'&&!window.allowDexSave)throw new DOMException('Full','QuotaExceededError');return save.call(this,key,value);};
 });
 await q.goto(demoBase+'/demo/01-classic.html');await q.locator('.activate-camera').click();await q.locator('.storage-warning').waitFor();
 assert.ok((await q.locator('.device-lcd').innerText()).includes('MEMORY FULL'));assert.equal(await q.locator('.registered').count(),0);
 await q.evaluate(()=>window.allowDexSave=true);await q.locator('.storage-warning').click();await q.locator('.registered').waitFor();
 await q.reload();await q.locator('.last-discovery').waitFor();await quota.close();

 const demo=await browser.newPage({viewport:{width:390,height:844}});const apiCalls=[];demo.on('request',request=>{if(new URL(request.url()).pathname.startsWith('/api/'))apiCalls.push(request.url())});
 await demo.goto(demoBase+'/demo/01-classic.html');await demo.locator('.activate-camera').click();await demo.locator('.dex-card').waitFor();assert.equal(apiCalls.length,0);await demo.close();await browser.close();
 const wk=await webkit.launch({executablePath:process.env.WEBKIT_PATH});const w=await wk.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
 await w.goto(demoBase+'/demo/01-classic.html');await w.locator('.activate-camera').click();await w.locator('.dex-card').waitFor();await fit(w,'WebKit card');await swipeRight(w);await swipeRight(w);await w.locator('.kana-key').first().waitFor();await wk.close();
 console.log('PASS: empty camera-first launch; swipe and D-pad; 46+46 paged kana; automatic scan, real status, card stats and save; rescan dedup; inspection; cancellation and retry targeting; invalid image; v0.1 migration; storage quota recovery; 320–430px fit; demo isolation; WebKit.');
})().catch(error=>{console.error(error);process.exit(1)});
