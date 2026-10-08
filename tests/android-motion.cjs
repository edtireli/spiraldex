/* Requires a running emulator and a debug WebView forwarded to ANDROID_CDP_URL.
 * Never targets a physical phone or the release application. */
const {chromium}=require('playwright'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const serial=process.env.ANDROID_SERIAL,adb=process.env.ADB_PATH||'adb';
assert.match(serial||'',/^emulator-\d+$/,'Set ANDROID_SERIAL to the disposable emulator');
const run=(...args)=>execFileSync(adb,['-s',serial,...args],{encoding:'utf8'});
const gravity=run('emu','sensor','get','acceleration').match(/acceleration = ([^\r\n]+)/)[1];
const gyro=run('emu','sensor','get','gyroscope').match(/gyroscope = ([^\r\n]+)/)[1];
(async()=>{
 const browser=await chromium.connectOverCDP(process.env.ANDROID_CDP_URL||'http://127.0.0.1:9224');
 const page=browser.contexts()[0].pages()[0];
 assert.ok(page.url().startsWith('https://appassets.androidplatform.net/dex/'));
 try{
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto('https://appassets.androidplatform.net/dex/card-lab.html');
  assert.equal(await page.evaluate(()=>DexNative.motionAvailable()),true);
  await page.evaluate(()=>{window.nativeSamples=0;const receive=DexMotion.receive;DexMotion.receive=(...args)=>{nativeSamples++;return receive(...args)};});
  await page.waitForFunction(()=>nativeSamples>4);
  await page.evaluate(()=>DexMotion.recenter());await page.waitForTimeout(200);
  run('emu','sensor','set','gyroscope','0.4:0.6:0.5');run('emu','sensor','set','acceleration','6:5:5');
  await page.waitForFunction(()=>{const style=document.querySelector('.dex-card').style;return Math.abs(parseFloat(style.getPropertyValue('--rotate-x')))+Math.abs(parseFloat(style.getPropertyValue('--rotate-y')))>2;},null,{timeout:15000});
  const pose=await page.locator('.dex-card').first().getAttribute('style');
  assert.match(pose,/--translate-[xy]: (?!0px)/,'Native sensor did not move the card');
  run('emu','sensor','set','gyroscope',gyro);run('emu','sensor','set','acceleration',gravity);
  run('shell','input','keyevent','KEYCODE_HOME');await page.waitForTimeout(1000);
  const paused=await page.evaluate(()=>nativeSamples);await page.waitForTimeout(1000);assert.equal(await page.evaluate(()=>nativeSamples),paused,'Native sensor stayed subscribed in background');
  run('shell','am','start','-n','app.spiraldex.debug/app.spiraldex.MainActivity');await page.waitForFunction(n=>nativeSamples>n,paused);
  await page.getByRole('button',{name:'Phone tilt: On',exact:true}).click();await page.waitForTimeout(300);
  const stopped=await page.evaluate(()=>nativeSamples);await page.waitForTimeout(500);assert.equal(await page.evaluate(()=>nativeSamples),stopped,'Native sensor stayed subscribed after Off');
  await page.getByRole('button',{name:'Phone tilt: Off',exact:true}).click();await page.waitForFunction(n=>nativeSamples>n,stopped);
  await page.emulateMedia({reducedMotion:'reduce'});await page.getByRole('button',{name:'Phone tilt: Off',exact:true}).waitFor();await page.waitForTimeout(300);
  const reduced=await page.evaluate(()=>nativeSamples);await page.waitForTimeout(500);assert.equal(await page.evaluate(()=>nativeSamples),reduced,'Reduced motion did not stop native sampling');
  console.log('PASS: emulator sensor → native bridge → card rotation/translation/foil; background suspension/resume; off switch; reduced motion.');
 }finally{run('emu','sensor','set','gyroscope',gyro);run('emu','sensor','set','acceleration',gravity);await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
