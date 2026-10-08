// Public assets always use a fresh demo context, never paired settings or user photos.
const {chromium}=require('playwright');
const path=require('path');
const root=path.resolve(__dirname,'..'),media=path.join(root,'docs/media');
const base=process.env.DEMO_URL||'http://127.0.0.1:8142';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH});
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,reducedMotion:'reduce'});
 const page=await context.newPage();
 await page.goto(base+'/demo/01-classic.html');await page.locator('.activate-camera').waitFor();
 await page.screenshot({path:path.join(media,'discover.png')});
 await page.locator('.activate-camera').click();await page.locator('.dex-card').waitFor();
 await page.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));
 await page.screenshot({path:path.join(media,'card.png')});
 await page.locator('[data-action="inspect"]').click();
 await page.screenshot({path:path.join(media,'inspection.png')});await page.keyboard.press('Escape');
 for(let i=0;i<2;i++){
  await page.locator('[data-action="scanner"]').first().click();await page.locator('.activate-camera').click();await page.locator('.dex-card').waitFor();
 }
 await page.locator('[data-turn="1"]').click();await page.screenshot({path:path.join(media,'collection.png')});
 await page.locator('[data-turn="1"]').click();await page.locator('.kana-key').first().waitFor();
 await page.screenshot({path:path.join(media,'kana.png')});await context.close();
 for(const width of [1440,390]){
  const site=await browser.newPage({viewport:{width,height:1000},deviceScaleFactor:1,reducedMotion:'reduce'});
  await site.goto(base);
  for(const img of await site.locator('img').all()){await img.scrollIntoViewIfNeeded();await img.evaluate(i=>i.decode());}
  await site.locator('#play').scrollIntoViewIfNeeded();await site.frameLocator('#demo').locator('.activate-camera').waitFor();await site.evaluate(()=>scrollTo(0,0));
  await site.screenshot({path:width===1440?path.join(media,'site.png'):path.join(root,'test-results/site-mobile.png'),fullPage:true});
  if(width===1440)await site.screenshot({path:path.join(media,'social.png'),clip:{x:0,y:90,width:1440,height:756}});
  await site.close();
 }
 await browser.close();console.log('Saved camera-first app, card, inspection, archive, kana, site, and social images.');
})().catch(e=>{console.error(e);process.exit(1)});
