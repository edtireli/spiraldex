const {chromium}=require('playwright');
const path=require('path'),root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH});
 const ctx=await browser.newContext({viewport:{width:390,height:844},recordVideo:{dir:path.join(root,'test-results/video'),size:{width:390,height:844}}});
 const page=await ctx.newPage();await page.goto((process.env.DEMO_URL||'http://127.0.0.1:8142')+'/demo/01-classic.html');
 await page.locator('.activate-camera').waitFor();await page.waitForTimeout(1200);
 await page.locator('.activate-camera').click();await page.locator('.dex-card').waitFor();await page.waitForTimeout(2200);
 await page.locator('[data-action="inspect"]').click();await page.waitForTimeout(1800);await page.keyboard.press('Escape');
 await page.locator('[data-turn="1"]').click();await page.waitForTimeout(1600);
 await page.locator('[data-turn="1"]').click();await page.locator('.kana-key').first().waitFor();await page.waitForTimeout(1700);
 await page.locator('[data-script="katakana"]').click();await page.waitForTimeout(1700);
 await page.locator('[data-turn="1"]').click();await page.waitForTimeout(1200);
 const video=page.video();await ctx.close();await video.saveAs(path.join(root,'test-results/walkthrough.webm'));
 await browser.close();console.log('Recorded the prepared discovery demo; no live recognition represented.');
})().catch(e=>{console.error(e);process.exit(1)});
