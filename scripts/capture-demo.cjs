// Capture the actual app UI. No pairing details or private photos enter demo assets.
const {chromium}=require('playwright');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const media=path.join(root,'docs/media');
const base=process.env.DEMO_URL||'http://127.0.0.1:8142';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH});
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,reducedMotion:"reduce"});
 const page=await context.newPage();
 await page.goto(base+'/demo/01-classic.html');
 await page.locator('.discovery img').waitFor();
 await page.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));
 await page.screenshot({path:path.join(media,'discover.png')});
 await page.locator('[data-sample="chair"]').first().click();
 await page.screenshot({path:path.join(media,'card.png')});
 await page.locator('[data-save]').click();
 await page.locator('#finish').selectOption('foil');
 await page.screenshot({path:path.join(media,'foil.png')});
 await page.locator('nav [data-go="home"]').click();
 for(const id of ['apple','cup']){
   await page.locator(`[data-sample="${id}"]`).click();
   await page.locator('[data-save]').click();
   await page.locator('nav [data-go="home"]').click();
 }
 await page.locator('nav [data-go="collection"]').click();
 await page.screenshot({path:path.join(media,'collection.png')});
 await page.locator('nav [data-go="kana"]').click();
 await page.locator('.kana-key').first().waitFor();
 await page.screenshot({path:path.join(media,'kana.png')});
 await context.close();
 const desktop=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1,reducedMotion:"reduce"});
 await desktop.goto(base);
 await desktop.evaluate(()=>Promise.all([...document.images].filter(i=>!i.loading||i.loading!=='lazy').map(i=>i.decode())));
 for(const img of await desktop.locator('img').all()){await img.scrollIntoViewIfNeeded();await img.evaluate(i=>i.decode())}await desktop.locator('#play').scrollIntoViewIfNeeded();await desktop.frameLocator('#demo').locator('.discovery').waitFor();await desktop.evaluate(()=>scrollTo(0,0));
 await desktop.screenshot({path:path.join(media,'site.png'),fullPage:true});
 await desktop.screenshot({path:path.join(media,'social.png'),clip:{x:0,y:90,width:1440,height:756}});
 const mobile=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
 await mobile.goto(base);
 for(const img of await mobile.locator('img').all()){await img.scrollIntoViewIfNeeded();await img.evaluate(i=>i.decode())}await mobile.locator('#play').scrollIntoViewIfNeeded();await mobile.frameLocator('#demo').locator('.discovery').waitFor();await mobile.evaluate(()=>scrollTo(0,0));
 await mobile.screenshot({path:path.join(root,'test-results/site-mobile.png'),fullPage:true});
 await browser.close();
 console.log('Saved fresh app screenshots, site preview, and social image.');
})().catch(error=>{console.error(error);process.exit(1)});
