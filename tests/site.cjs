const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH});
 const page=await browser.newPage();const errors=[],apiCalls=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('request',r=>{if(new URL(r.url()).pathname.startsWith('/api/'))apiCalls.push(r.url())});
 const base=process.env.DEMO_URL||'http://127.0.0.1:8142';
 await page.goto(base);
 for(const width of [320,390,768,1440]){
  await page.setViewportSize({width,height:900});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`Site overflows ${width}`);
 }
 for(const img of await page.locator('img').all()){
  await img.scrollIntoViewIfNeeded();
  await img.evaluate(i=>i.decode());
 }
 await page.locator('summary').first().click();
 await page.locator('[data-concept="03-holo"]').click();
 assert.equal(await page.locator('#demo').getAttribute('src'),'demo/03-holo.html');
 await page.goto(base+'/demo/01-classic.html#kana');
 await page.locator('.kana-key').first().waitFor();
 assert.equal(await page.locator('.kana-key').count(),46);
 await page.locator('nav [data-go="capture"]').click();
 await page.locator('[data-camera]').click();
 await page.getByText('This online demo uses samples.',{exact:false}).waitFor();
 await page.locator('button[data-demo]').click();
 await page.locator('[data-save]').waitFor();
 await page.locator('[data-save]').click();
 await page.getByRole('button',{name:'Saved to collection'}).waitFor();
 await page.locator('#finish').selectOption('foil');
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.waitForFunction(()=>{const card=document.querySelector('.cardface.foil');return card&&getComputedStyle(card).transform==='none'});
 assert.deepEqual(apiCalls,[],'Public demo made an API request');
 assert.deepEqual(errors,[],'Browser errors');
 await browser.close();console.log('PASS: public page responsive, assets load, design switching, kana deep link, sample flow, reduced motion, zero model/API calls.');
})().catch(error=>{console.error(error);process.exit(1)});
