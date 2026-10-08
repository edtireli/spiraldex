const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH});
 const page=await browser.newPage();const errors=[],apiCalls=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(new URL(r.url()).pathname.startsWith('/api/'))apiCalls.push(r.url())});
 const base=process.env.DEMO_URL||'http://127.0.0.1:8142';await page.goto(base);
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`Site overflows ${width}`);}
 for(const img of await page.locator('img').all()){await img.scrollIntoViewIfNeeded();await img.evaluate(i=>i.decode());}
 await page.locator('summary').first().click();await page.locator('[data-concept="03-holo"]').click();assert.equal(await page.locator('#demo').getAttribute('src'),'demo/03-holo.html');
 await page.goto(base+'/demo/01-classic.html#kana');await page.locator('.kana-key').first().waitFor();assert.equal(await page.locator('.kana-key').count(),15);
 await page.locator('[data-turn="1"]').click();await page.locator('.activate-camera').click();await page.locator('.dex-card').waitFor();
 assert.equal(await page.locator('[data-save],#finish').count(),0);await page.getByText('Registered in your Dex').waitFor();
 await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.dex-card').evaluate(e=>getComputedStyle(e).animationName),'none');
 assert.deepEqual(apiCalls,[],'Public demo made an API request');assert.deepEqual(errors,[],'Browser errors');
 await browser.close();console.log('PASS: site 320–1440px, all assets, design switch, kana deep link, auto-unlock, reduced motion, zero model/API calls.');
})().catch(e=>{console.error(e);process.exit(1)});
