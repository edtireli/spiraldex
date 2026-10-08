const {chromium,webkit}=require('playwright'),assert=require('node:assert/strict');
const fixture={word:'やかん',reading:'やかん',romaji:'yakan',english:'kettle',description:'A container for heating water.',sentence:'お茶を飲む前にやかんを沸かします。',sentence_reading:'おちゃをのむまえにやかんをわかします。',translation:'I boil the kettle before drinking tea.',fact:'Traditionally kettles were made from iron and used over charcoal braziers.',asset:'assets/cup.png',card_type:'household',rarity:'Common',card_finish:'classic',rarity_reason:'An everyday household object.'};
const fixtures=Array.from({length:7},(_,i)=>({...fixture,id:'layout-'+i,word:i===6?'持ち運び用の保温できる水筒':fixture.word,reading:i===6?'もちあるきようのほおんできるすいとう':fixture.reading,english:i===6?'Portable insulated water bottle':fixture.english,description:i===6?'A portable container that keeps drinking water warm or cold while you are away from home.':fixture.description,card_finish:['classic','reverse-holo','holo','full-art'][i%4],rarity:['Common','Rare','Rare','Ultra rare'][i%4]}));
function auditCardLayout(){
 const faults=[],near=(a,b)=>Math.abs(a-b)<1.1;
 for(const card of document.querySelectorAll('.dex-card.card')){
  const rect=card.getBoundingClientRect(),print=card.querySelector('.card-print').getBoundingClientRect(),paper=card.querySelector('.card-paper');
  if(Math.abs(rect.width/rect.height-.718)>.005)faults.push('Card aspect distorted');
  if(!near(rect.width,print.width)||!near(rect.height,print.height))faults.push('Print does not scale with card');
  if(paper.scrollWidth>paper.clientWidth+2||paper.scrollHeight>paper.clientHeight+2)faults.push('Paper overflows');
  for(const selector of ['.card-heading','.specimen-line','.card-language','.card-stats','.card-flavor','.card-footer']){
   const row=card.querySelector(selector),r=row.getBoundingClientRect();
   if(r.left<print.left-1||r.right>print.right+1||r.top<print.top-1||r.bottom>print.bottom+1)faults.push(selector+' leaves print');
  }
  const slots=['.card-language','.card-stats','.card-flavor','.card-footer'].map(s=>card.querySelector(s).getBoundingClientRect());
  for(let i=0;i<slots.length-1;i++)if(slots[i].bottom>slots[i+1].top+1)faults.push('Printed rows overlap');
  const move=card.querySelector('.card-move').getBoundingClientRect();
  if(move.bottom>slots[1].top+1)faults.push('Example spills onto stats');
  const heading=card.querySelector('.card-name-line'),hp=card.querySelector('.hp').getBoundingClientRect();
  if(hp.right>heading.getBoundingClientRect().right+1)faults.push('HP leaves heading');
 }
 for(const label of document.querySelectorAll('.thumb-caption b'))if(parseFloat(getComputedStyle(label).fontSize)<12)faults.push('Archive label too small');
 const grid=document.querySelector('.archive-grid');
 if(grid&&grid.scrollHeight>grid.clientHeight+2)faults.push('Archive grid overflows');
 const pane=document.querySelector('.display');
 if(pane&&pane.scrollHeight>pane.clientHeight+2)faults.push('Device display overflows');
 if(document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight)faults.push('Device viewport overflows');
 return faults;
}
async function check(page,name){
 let faults;
 // Viewport changes trigger the screen render and then ResizeObserver sizing.
 for(let attempt=0;attempt<30;attempt++){faults=await page.evaluate(auditCardLayout);if(!faults.length)break;await page.waitForTimeout(100);}
 assert.deepEqual(faults,[],name);
}
async function run(){
 for(const [engine,executablePath] of [[chromium,process.env.CHROMIUM_PATH],[webkit,process.env.WEBKIT_PATH]]){
  const browser=await engine.launch({executablePath});
  for(const count of [1,2,7]){
   const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
   await page.addInitScript(items=>localStorage.setItem('spiraldex-demo-v2',JSON.stringify(items)),fixtures.slice(0,count));
   await page.goto((process.env.DEMO_URL||'http://127.0.0.1:8142')+'/demo/01-classic.html#collection');await page.locator('.archive-card').first().waitFor();
   for(const [width,height] of [[320,568],[360,640],[390,844],[430,932]]){
    await page.setViewportSize({width,height});await check(page,`${engine.name()}: ${count} cards at ${width}x${height}`);
    if(count===1)assert.ok((await page.locator('.dex-card').boundingBox()).width>170,'Single discovery should use the archive space');
   }
   const seen=new Set();
   do{for(const id of await page.locator('[data-open]').evaluateAll(nodes=>nodes.map(n=>n.dataset.open)))seen.add(id);await check(page,'Archive page');if(await page.locator('[data-action="cards-next"]').isDisabled())break;await page.locator('[data-action="cards-next"]').click();}while(true);
   assert.equal(seen.size,count,'Pagination lost entries');
   await page.locator('[data-open]').first().click();await page.locator('.card-screen').waitFor();await check(page,'Opened card');
   await page.locator('[data-action="inspect"]').click();await check(page,'Inspected card');
   assert.ok((await page.locator('.dialog-body').innerText()).includes(fixture.fact),'Complete notes missing in inspection');
   await page.close();
  }
  for(const forward of [-1,1]){
   const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
   await page.goto((process.env.DEMO_URL||'http://127.0.0.1:8142')+'/demo/01-classic.html');await page.locator('.activate-camera').waitFor();
   const dot=()=>page.locator('.indicator-bank').evaluate(e=>[...e.querySelectorAll('.indicator')].findIndex(n=>n.classList.contains('lit')));
   const swipe=async direction=>{const x=direction>0?70:270;await page.locator('main').dispatchEvent('pointerdown',{pointerId:31,pointerType:'touch',isPrimary:true,clientX:x,clientY:300});await page.locator('main').dispatchEvent('pointerup',{pointerId:31,pointerType:'touch',isPrimary:true,clientX:340-x,clientY:300});};
   assert.equal(await dot(),0);await swipe(forward);assert.equal(await dot(),1);await page.locator('.empty-archive').waitFor();
   await swipe(forward);assert.equal(await dot(),2);await page.locator('.kana-key').first().waitFor();
   await swipe(forward);assert.equal(await dot(),2,'Last dot should not wrap');
   await swipe(-forward);assert.equal(await dot(),1);await swipe(-forward);assert.equal(await dot(),0);
   await swipe(-forward);assert.equal(await dot(),1,'First dot must accept either browsing direction again');
   await page.close();
  }
  await browser.close();
 }
 console.log('PASS: proportional printing, long entries, no row/header overflow, 1/2/7-entry archives, pagination/opening/inspection at 320–430 px; either first swipe moves left→middle→last dot and reverse gestures go back, in Chromium/WebKit.');
}
module.exports={fixtures,auditCardLayout};
if(require.main===module)run().catch(e=>{console.error(e);process.exit(1)});
