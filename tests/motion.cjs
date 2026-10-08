const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const url=(process.env.DEMO_URL||'http://127.0.0.1:8142')+'/demo/card-lab.html';
const identity=[1,0,0,0,1,0,0,0,1];
const ry=degrees=>{const a=degrees*Math.PI/180;return [Math.cos(a),0,Math.sin(a),0,1,0,-Math.sin(a),0,Math.cos(a)];};
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH});
 const page=await browser.newPage({viewport:{width:1440,height:950},reducedMotion:'no-preference'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{DeviceOrientationEvent.requestPermission=undefined;});
 await page.goto(url);
 const sample=async()=>page.locator('.dex-card').first().evaluate(e=>({x:parseFloat(e.style.getPropertyValue('--pointer-x')),y:parseFloat(e.style.getPropertyValue('--pointer-y')),rotation:parseFloat(e.style.getPropertyValue('--rotate-x')),translation:parseFloat(e.style.getPropertyValue('--translate-x'))}));
 const orientation=async(beta,gamma)=>page.evaluate(({beta,gamma})=>window.dispatchEvent(new DeviceOrientationEvent('deviceorientation',{alpha:0,beta,gamma})),{beta,gamma});
 const settle=async()=>page.waitForTimeout(750);
 await orientation(65,0);await orientation(65,18);await settle();
 let pose=await sample();assert.ok(pose.x>88&&pose.rotation< -5&&pose.translation>3,'Phone tilt must rotate, move, and light the card');
 assert.equal(await page.locator('.dex-card').nth(2).getAttribute('data-rarity'),'rare holo','Motion must not alter model rarity');
 // A relative matrix remains continuous while crossing an upright holding angle.
 await page.getByRole('button',{name:'Recenter',exact:true}).click();
 await orientation(85,0);await orientation(95,0);await settle();pose=await sample();
 assert.ok(Math.abs(pose.x-50)<1&&pose.y>70&&pose.y<75,'Upright tilt jumped');
 // Changing screen rotation resets the resting position and remaps axes.
 await page.evaluate(m=>DexMotion.receive(m,90),identity);await page.evaluate(m=>DexMotion.receive(m,90),ry(20));await settle();pose=await sample();
 assert.ok(Math.abs(pose.x-50)<1&&pose.y>90,'Landscape axes were not remapped');
 await page.evaluate(()=>DexMotion.receive([NaN,0,0,0,1,0,0,0,1],90));assert.deepEqual(await sample(),pose,'Invalid sensor data changed the card');
 // Direct touch wins over incoming sensor frames, then motion resumes.
 const card=page.locator('.dex-card').first(),box=await card.boundingBox();
 await card.dispatchEvent('pointerdown',{clientX:box.x+box.width*.1,clientY:box.y+box.height*.2,pointerType:'touch'});
 await page.evaluate(m=>DexMotion.receive(m,90),ry(10));await settle();assert.ok((await sample()).x<20,'Sensor fought the finger');
 await card.dispatchEvent('pointerup',{pointerType:'touch'});await settle();assert.ok(Math.abs((await sample()).x-50)<1,'Sensor did not resume after touch');
 await page.getByRole('button',{name:'Phone tilt: On',exact:true}).click();
 await page.reload();assert.equal(await page.getByRole('button',{name:'Phone tilt: Off',exact:true}).getAttribute('aria-pressed'),'false');
 await orientation(0,0);await orientation(0,20);await settle();assert.ok(Number.isNaN((await sample()).x),'Off preference not respected');
 await page.getByRole('button',{name:'Phone tilt: Off',exact:true}).click();await orientation(0,0);await orientation(0,20);await settle();
 await page.emulateMedia({reducedMotion:'reduce'});await orientation(0,40);await settle();
 assert.ok(Number.isNaN((await sample()).x));assert.ok(await page.getByRole('button',{name:'Phone tilt: Off',exact:true}).isDisabled());
 assert.equal(await card.locator('.card__translater').evaluate(e=>getComputedStyle(e).transform),'none');
 // Permission must be requested from a tap, with denied and retry paths.
 const permission=await browser.newPage({reducedMotion:'no-preference'});
 await permission.addInitScript(()=>{window.requests=0;DeviceOrientationEvent.requestPermission=async()=>{requests++;return requests===1?'denied':'granted';};});
 await permission.goto(url);assert.equal(await permission.evaluate(()=>requests),0);
 await permission.getByRole('button',{name:'Enable phone tilt',exact:true}).click();await permission.getByText('Motion access was declined.',{exact:false}).waitFor();
 await permission.getByRole('button',{name:'Enable phone tilt',exact:true}).click();await permission.getByRole('button',{name:'Phone tilt: On',exact:true}).waitFor();assert.equal(await permission.evaluate(()=>requests),2);
 // The native bridge only subscribes while cards are visible, never in background.
 const native=await browser.newPage({reducedMotion:'no-preference'});
 await native.addInitScript(()=>{window.sensorCalls=[];window.DexNative={motionAvailable:()=>true,motion:on=>sensorCalls.push(on)};});
 await native.goto(url);assert.deepEqual(await native.evaluate(()=>sensorCalls),[true]);
 await native.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
 assert.deepEqual(await native.evaluate(()=>sensorCalls),[true,false]);
 await native.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
 assert.deepEqual(await native.evaluate(()=>sensorCalls),[true,false,true]);
 await native.evaluate(()=>document.getElementById('prints').remove());
 await native.waitForFunction(()=>sensorCalls.at(-1)===false);
 const unsupported=await browser.newPage({reducedMotion:'no-preference'});
 await unsupported.addInitScript(()=>window.DexNative={motionAvailable:()=>false,motion:()=>{throw Error('Unavailable sensor must not start');}});
 await unsupported.goto(url);assert.ok(await unsupported.getByRole('button',{name:'Phone tilt: Off',exact:true}).isDisabled());await unsupported.getByText('Phone tilt is unavailable here.',{exact:false}).waitFor();
 assert.deepEqual(errors,[]);await browser.close();
 console.log('PASS: phone tilt/translation/foil; calibration; upright and landscape axes; touch priority; saved off preference; reduced motion; permission denied/retry; native lifecycle; missing sensor fallback.');
})().catch(e=>{console.error(e);process.exit(1)});
