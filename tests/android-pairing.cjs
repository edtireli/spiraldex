/* Requires a disposable emulator with the debug app open and its WebView forwarded.
 * Uses only an ephemeral TLS certificate, fake token, and local test server.
 * Restores the emulator's original pairing preferences when finished. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const https=require('node:https'),{X509Certificate}=require('node:crypto');
const serial=process.env.ANDROID_SERIAL,adb=process.env.ADB_PATH||'adb';
assert.match(serial||'',/^emulator-\d+$/,'Set ANDROID_SERIAL to a disposable emulator');
const app='app.spiraldex.debug';
const run=(...args)=>execFileSync(adb,['-s',serial,...args],{encoding:'utf8'});
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'spiraldex-pairing-'));
const fakeToken='spiraldex-emulator-test-token';
const prefsPath='shared_prefs/dex.xml';
let originalPrefs=null;
try{originalPrefs=run('shell','run-as',app,'sh','-c',`'test ! -f ${prefsPath} || cat ${prefsPath}'`)||null;}catch{}
let browser,server;
function nodes(){
 run('shell','uiautomator','dump','/sdcard/spiraldex-pairing.xml');
 const xml=run('shell','cat','/sdcard/spiraldex-pairing.xml');
 return [...xml.matchAll(/<node\b[^>]*>/g)].map(([node])=>Object.fromEntries(
  [...node.matchAll(/([\w-]+)="([^"]*)"/g)].map(([,key,value])=>[key,value.replaceAll('&amp;','&').replaceAll('&quot;','"')])));
}
function tap(node){
 assert.ok(node,'Native UI element missing');
 const [x1,y1,x2,y2]=node.bounds.match(/\d+/g).map(Number);
 run('shell','input','tap',String(Math.round((x1+x2)/2)),String(Math.round((y1+y2)/2)));
}
function field(index,value){
 tap(nodes().filter(n=>n.class==='android.widget.EditText')[index]);
 run('shell','input','keycombination','KEYCODE_CTRL_LEFT','KEYCODE_A');
 run('shell','input','text',value);
 run('shell','input','keyevent','KEYCODE_BACK');
}
(async()=>{
 execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-days','1','-subj','/CN=spiraldex-test',
  '-keyout',path.join(temp,'key.pem'),'-out',path.join(temp,'cert.pem')],{stdio:'ignore'});
 const cert=fs.readFileSync(path.join(temp,'cert.pem'));
 const pin=new X509Certificate(cert).fingerprint256.replaceAll(':','').toLowerCase();
 const requests=[];let mode='json';
 server=https.createServer({key:fs.readFileSync(path.join(temp,'key.pem')),cert},(req,res)=>{
  let body='';req.on('data',data=>body+=data);req.on('end',()=>{
   requests.push({path:req.url,method:req.method,auth:req.headers.authorization,body});
   if(mode==='missing'){res.writeHead(404,{'Content-Type':'text/html'});res.end('<h1>Not found</h1>');return;}
   if(mode==='html'){res.writeHead(200,{'Content-Type':'text/html'});res.end('<h1>Different service</h1>');return;}
   if(mode==='redirect'){res.writeHead(302,{Location:'/forbidden-redirect'});res.end();return;}
   res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:true}));
  });
 });
 await new Promise(resolve=>server.listen(0,'0.0.0.0',resolve));
 const localBase=`https://10.0.2.2:${server.address().port}`;
 browser=await chromium.connectOverCDP(process.env.ANDROID_CDP_URL||'http://127.0.0.1:9224');
 const page=browser.contexts()[0].pages()[0];
 assert.ok(page.url().startsWith('https://appassets.androidplatform.net/dex/'));
 await page.evaluate(()=>{window.pairingSaves=0;window.dexPairingChanged=()=>{pairingSaves++};window.pairingReplies={};window.dexNativeResult=(id,status,body)=>{pairingReplies[id]={status,body:JSON.parse(body)}};});
 async function open(){await page.evaluate(()=>DexNative.settings());await page.waitForTimeout(250);assert.equal(nodes().filter(n=>n.class==='android.widget.EditText').length,3);}
 async function save(){const before=await page.evaluate(()=>pairingSaves);tap(nodes().find(n=>n['resource-id']==='android:id/button1'));await page.waitForFunction(n=>pairingSaves>n,before);}
 async function request(id,api,body=''){
  await page.evaluate(({id,api,body})=>DexNative.request(id,api,body),{id,api,body});
  await page.waitForFunction(id=>pairingReplies[id],id,{timeout:15000});
  return page.evaluate(id=>pairingReplies[id],id);
 }
 // The exact requested public URL must save and reappear without any network call.
 await open();field(0,'https://edspiral.duckdns.org:8443/spiraldex/');field(1,fakeToken);field(2,pin);await save();
 assert.equal(nodes().filter(n=>n.class==='android.widget.EditText').length,0,'Save did not dismiss pairing');
 await open();assert.equal(nodes().find(n=>n.class==='android.widget.EditText').text,'https://edspiral.duckdns.org:8443/spiraldex');
 // Only change the address: encrypted token and fingerprint must survive re-saving.
 field(0,localBase+'/spiraldex/');await save();
 const scanId='0123456789abcdef0123456789abcdef';
 for(const [id,api,body] of [['8001','/api/health',''],['8002','/api/scan','{"photo":"test-fixture"}'],['8003',`/api/scan/status?id=${scanId}`,'']]){
  const reply=await request(id,api,body);assert.equal(reply.status,200,JSON.stringify(reply));
  assert.deepEqual(requests.at(-1),{path:'/spiraldex'+api,method:body?'POST':'GET',auth:'Bearer '+fakeToken,body});
 }
 // A gateway response is different from an unreachable Mac, and redirects stay disabled.
 mode='missing';const missing=await request('8004','/api/health');assert.equal(missing.status,404);assert.match(missing.body.error,/route was not found/);
 mode='html';const wrongService=await request('8008','/api/health');assert.equal(wrongService.status,502);assert.match(wrongService.body.error,/did not return SpiralDex data/);
 mode='redirect';const count=requests.length;assert.equal((await request('8005','/api/health')).status,302);assert.equal(requests.length,count+1);
 mode='json';
 // Direct host URLs still work, and the certificate pin is still enforced.
 await open();field(0,localBase+'/');await save();
 assert.equal((await request('8006','/api/health')).status,200);assert.equal(requests.at(-1).path,'/api/health');
 await open();field(2,'0'.repeat(64));await save();
 await open();assert.equal(nodes().filter(n=>n.class==='android.widget.EditText')[2].text,'0'.repeat(64),'Wrong-pin fixture was not saved');tap(nodes().find(n=>n['resource-id']==='android:id/button2'));
 const before=requests.length;
 const mismatch=await request('8007','/api/health');assert.match(mismatch.body.error,/Certificate check failed/);assert.equal(requests.length,before);
 console.log('PASS: native Save/reopen; DuckDNS prefix retained; encrypted credentials reused; prefixed health/scan/status; direct host regression; missing route; redirects blocked; certificate pin enforced.');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{
 if(browser)await browser.close();
 if(server)await new Promise(resolve=>{server.closeAllConnections();server.close(resolve)});
 run('shell','am','force-stop',app);
 if(originalPrefs!==null)execFileSync(adb,['-s',serial,'shell','run-as',app,'sh','-c',`'cat > ${prefsPath}'`],{input:originalPrefs});
 else run('shell','run-as',app,'rm','-f',prefsPath);
 fs.rmSync(temp,{recursive:true,force:true});
});
