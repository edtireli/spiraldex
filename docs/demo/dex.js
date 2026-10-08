(() => {
  'use strict';
  const root = document.getElementById('app');
  const demo = document.body.dataset.demo === 'true';
  const sections = ['scanner', 'collection', 'kana'];
  const sectionNames = ['Scanner', 'Card archive', 'Kana library'];
  const databaseName = demo ? 'spiraldex-demo-v2' : 'spiraldex';
  const fallbackKey = demo ? 'spiraldex-demo-v2' : 'spiraldex-v1';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const paths = {
    camera:'<rect x="3" y="6" width="18" height="14" rx="3"/><path d="m8 6 2-3h4l2 3"/><circle cx="12" cy="13" r="4"/>',
    sound:'<path d="M3 10h4l5-4v12l-5-4H3Z"/><path d="M16 8q6 4 0 8M16 11q2 1 0 2"/>',
    image:'<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1"/><path d="m3 17 5-5 4 4 4-6 5 7"/>',
    arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',
    back:'<path d="M20 12H4m6-6-6 6 6 6"/>',
    close:'<path d="m6 6 12 12M6 18 18 6"/>',
    search:'<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
    card:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 8h8M8 13h8M8 17h5"/>',
    check:'<path d="m5 12 4 4L19 6"/>',
  };
  const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.card}</svg>`;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const asset = record => /^(assets\/[a-z-]+\.(?:png|webp|svg)|data:image\/(?:png|jpeg);base64,[A-Za-z0-9+/=]+)$/.test(record?.asset || '') ? record.asset : '';
  let section = 0, view = 'scanner', cards = [], entry = null, database = null, swipeForward = 0;
  let photo = null, target = null, stream = null, busy = false, scanController = null, pollTimer = null, epoch = 0;
  let stage = 'scanning', error = '', fresh = false, stored = true, storageProblem = false;
  let health = null, checking = false, connectionError = '', collectionPage = 0, kanaPage = 0, script = 'hiragana', kanaData = null, selectedKana = null;
  let toastTimer, audio, demoCounter = 0, reviewIndex = 0, answer = false;
  const pending = new Map(); let requestCounter = 0;

  function normalize(record, index) {
    const cardType = record.card_type || (record.template === 'nature' ? 'nature' : 'household');
    return {...record, card_type:cardType, profile:DexProfile(record.word, record.reading, cardType, record.rarity, record.card_finish),
      number:/^\d+$/.test(record.number || '') ? record.number : String(index + 1).padStart(3,'0')};
  }
  async function initialize() {
    try { cards = JSON.parse(localStorage.getItem(fallbackKey) || '[]'); } catch {}
    if (!Array.isArray(cards)) cards = [];
    try {
      database = await new Promise((resolve,reject) => {
        const request = indexedDB.open(databaseName,1);
        request.onupgradeneeded = () => request.result.createObjectStore('state');
        request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
      });
      const saved = await new Promise((resolve,reject) => {
        const request = database.transaction('state').objectStore('state').get('collection');
        request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
      });
      if (Array.isArray(saved)) cards = saved;
    } catch { database = null; }
    // Retain real discoveries from v0.1; starter illustrations are not discoveries.
    cards = cards.filter(card => card && typeof card.id === 'string' && typeof card.word === 'string' &&
      (demo || card.source !== 'Sample entry')).map(normalize);
    await persist();
    const hash = location.hash.slice(1);
    section = hash === 'kana' ? 2 : hash === 'collection' ? 1 : 0; view = sections[section];
    render(); void loadKana(); void checkConnection();
  }
  async function persist() {
    const snapshot = JSON.parse(JSON.stringify(cards));
    try {
      if (database) await new Promise((resolve,reject) => {
        const tx = database.transaction('state','readwrite'); tx.objectStore('state').put(snapshot,'collection');
        tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
      }); else localStorage.setItem(fallbackKey,JSON.stringify(snapshot));
      storageProblem = false; return true;
    } catch { storageProblem = true; return false; }
  }
  function toast(message) {
    document.querySelector('.toast')?.remove();
    const node = document.createElement('div'); node.className = 'toast'; node.setAttribute('role','status'); node.textContent = message;
    document.body.append(node); clearTimeout(toastTimer); toastTimer = setTimeout(() => node.remove(),5000);
  }
  function stopCamera() { stream?.getTracks().forEach(track => track.stop()); stream = null; }
  function stopAudio() { audio?.pause(); window.speechSynthesis?.cancel(); }
  function navigate(next) {
    if (busy) return;
    stopCamera(); stopAudio(); fresh = false; view = next;
    if (sections.includes(next)) section = sections.indexOf(next);
    if (next === 'scanner') swipeForward = 0;
    render();
  }
  function turn(direction) {
    if (busy || document.querySelector('dialog[open]')) return;
    section = (section + direction + sections.length) % sections.length;
    navigate(sections[section]);
  }
  function swipe(direction) {
    if (busy || document.querySelector('dialog[open]')) return;
    // Either first gesture advances from the left dot. Keep that direction for
    // the next page; reversing the gesture goes back, without wrapping the dots.
    if (section === 0 || !swipeForward) swipeForward = section === 2 ? -direction : direction;
    const next = Math.max(0,Math.min(sections.length-1,section+(direction===swipeForward?1:-1)));
    if (next !== section) navigate(sections[next]);
  }
  function lastCard() { return cards[cards.length-1]; }
  function screenHeader(label, right = '') { return `<div class="screen-label"><span>${label}</span><span>${right}</span></div>`; }
  function scanner() {
    if (busy) return scanView();
    if (photo && error) return `<div class="scan-retry">${screenHeader('SIGNAL INTERRUPTED','↻')}<div class="photo-frame" id="subject-frame"><img src="${photo}" alt="Your photograph. Tap a subject to select it.">${target ? '<span class="target-marker" aria-hidden="true"></span>' : ''}</div><p class="error-message" role="alert">${esc(error)}</p><div class="retry-buttons"><button class="action" data-action="rescan">${icon('search')} Scan again</button><button class="soft-button" data-action="settings">Field link</button></div><button class="text-button" data-action="retake">Choose another subject</button></div>`;
    const last = lastCard();
    return `<div class="scanner-screen">${screenHeader(stream ? 'OPTICAL SENSOR · LIVE' : 'OPTICAL SENSOR · STANDBY', 'SD–01')}
      <div class="viewfinder ${stream ? 'is-live' : ''}">
        ${stream ? '<video autoplay muted playsinline aria-label="Live camera view"></video>' : `<button class="activate-camera" data-action="camera"><span class="sensor-symbol">${icon('camera')}</span><strong>What will you discover?</strong><span>Activate the camera</span></button>`}
        <span class="reticle" aria-hidden="true"></span><span class="coordinate top">FIELD SCANNER</span><span class="coordinate bottom">${stream ? 'CENTER ONE SUBJECT' : 'AWAITING DISCOVERY'}</span>
      </div>
      <div class="shutter-controls"><button class="round-control" data-action="photo" aria-label="Choose a photograph">${icon('image')}</button><button class="shutter" data-action="${stream ? 'shutter' : 'camera'}" aria-label="${stream ? 'Take photograph' : 'Activate camera'}">${icon('camera')}</button><span class="scanner-count"><b>${String(cards.length).padStart(3,'0')}</b>REGISTERED</span></div>
      ${last ? `<button class="last-discovery" data-action="last"><img src="${asset(last)}" alt=""><span><small>LAST DISCOVERY</small><strong lang="ja">${esc(last.word)}</strong><span>${esc(last.reading)} · ${esc(last.english)}</span></span>${icon('arrow')}</button>` : '<p class="first-discovery">Your first entry is waiting to be found.</p>'}
    </div>`;
  }
  const stageText = {
    scanning:['SCANNING…','Reading the field signature'],
    isolating:['SCANNING…','Tracing the subject’s contours'],
    decoding:['CONSULTING THE DEX…','Decoding its name and field notes'],
    ready:['ENTRY ACQUIRED','Preparing your discovery'],
  };
  function scanView() {
    const text = stageText[stage] || stageText.scanning;
    return `<div class="scanning-screen">${screenHeader('DISCOVERY IN PROGRESS','◉')}<div class="scan-orbit"><img src="${photo}" alt="The subject being scanned"><span class="scan-sweep" aria-hidden="true"></span><span class="reticle" aria-hidden="true"></span></div><div class="scan-copy" role="status" aria-live="polite"><span class="pulse-dots" aria-hidden="true">● ● ●</span><h1 id="stage-title">${text[0]}</h1><p id="stage-detail">${text[1]}</p></div><div class="signal-bars" aria-hidden="true">${'<i></i>'.repeat(18)}</div><p class="scan-footnote">Keep your field unit open.</p><button class="text-button" data-action="cancel">Cancel scan</button></div>`;
  }
  function setStage(next) {
    if (!stageText[next] || !busy) return;
    stage = next;
    const title = document.getElementById('stage-title'), detail = document.getElementById('stage-detail');
    if (title) title.textContent = stageText[stage][0]; if (detail) detail.textContent = stageText[stage][1];
    document.querySelector('.scanning-screen')?.setAttribute('data-stage',stage);
  }
  const raritySymbol = p => !p.assessed ? '–' : p.rarity === 'Common' ? '●' : p.rarity === 'Uncommon' ? '◆' : p.rarity === 'Rare' ? '✦' : '✦✦';
  function cardMarkup(record) { return DexCards.render(record); }
  function cardView() {
    if (!entry) return scanner();
    return `<div class="card-screen ${fresh ? 'new-entry' : ''}">${screenHeader(fresh ? '✦ NEW ENTRY UNLOCKED' : 'FIELD ARCHIVE', `NO. ${esc(entry.number)}`)}<div class="card-stage">${cardMarkup(entry)}</div>
      <div class="card-actions"><button class="soft-button" data-action="inspect">${icon('search')} Inspect entry</button><button class="action" data-action="scanner">${icon('camera')} Next discovery</button></div>
      ${!stored ? '<button class="storage-warning" data-action="save">Memory full · entry not stored. Tap to retry.</button>' : `<p class="registered">${icon('check')} Registered in your Dex</p>`}
    </div>`;
  }
  function pager(current, total, previous, next) {
    return `<div class="page-turner"><button data-action="${previous}" aria-label="Previous page" ${current === 0 ? 'disabled' : ''}>${icon('back')}</button><span>${String(current+1).padStart(2,'0')} / ${String(total).padStart(2,'0')}</span><button data-action="${next}" aria-label="Next page" ${current+1 >= total ? 'disabled' : ''}>${icon('arrow')}</button></div>`;
  }
  function collectionView() {
    if (!cards.length) return `<div class="empty-archive">${screenHeader('CARD ARCHIVE','000')}<div class="empty-glyph">${icon('card')}</div><h1>No entries. Yet.</h1><p>Every discovery leaves a story.<br>Find your first one.</p><button class="action" data-action="scanner">Return to scanner ${icon('arrow')}</button></div>`;
    const count = innerHeight < 700 ? 2 : 4, total = Math.ceil(cards.length/count);
    collectionPage = Math.min(collectionPage,total-1);
    const list = [...cards].reverse().slice(collectionPage*count,(collectionPage+1)*count);
    return `<div class="archive-screen">${screenHeader('CARD ARCHIVE', `${String(cards.length).padStart(3,'0')} REGISTERED`)}<div class="archive-grid" data-count="${list.length}">${list.map(record => `<div class="archive-card card-thumb"><div class="thumb-slot"><div class="thumb-print" inert>${cardMarkup(record)}<div class="thumb-caption" aria-hidden="true"><b lang="ja">${esc(record.word)}</b><span>${esc(record.english)}</span></div></div></div><button class="archive-open" data-open="${esc(record.id)}" aria-label="Inspect ${esc(record.word)}, ${esc(record.english)}, ${esc(record.profile.rarity)}"></button></div>`).join('')}</div>${pager(collectionPage,total,'cards-prev','cards-next')}<button class="text-button" data-action="review">Practice your discoveries ↻</button></div>`;
  }
  function kanaView() {
    const list = kanaData?.[script] || [], total = Math.max(1,Math.ceil(list.length/15));
    kanaPage = Math.min(kanaPage,total-1); const visible = list.slice(kanaPage*15,(kanaPage+1)*15);
    const chosen = selectedKana || visible[0];
    return `<div class="kana-screen">${screenHeader('KANA LIBRARY','音')}<div class="script-switch"><button data-script="hiragana" aria-pressed="${script==='hiragana'}">あ Hiragana</button><button data-script="katakana" aria-pressed="${script==='katakana'}">ア Katakana</button></div><div class="kana-preview">${chosen ? `<button class="kana-large" data-speak="${esc(chosen.kana)}" aria-label="Hear ${esc(chosen.kana)}" lang="ja">${esc(chosen.kana)}</button><div><strong>${esc(chosen.romaji)}</strong><p lang="ja">${esc(chosen.example?.w)}</p><small>${esc(chosen.example?.g)}</small></div><button class="round-control" data-speak="${esc(chosen.kana)}" aria-label="Replay sound">${icon('sound')}</button>` : '<p role="status">Opening sound library…</p>'}</div><div class="kana-keys">${visible.map(k => `<button class="kana-key ${chosen?.kana===k.kana?'selected':''}" data-kana="${k.kana}" aria-label="Hear ${esc(k.kana)}, ${esc(k.romaji)}"><strong lang="ja">${k.kana}</strong><small>${esc(k.romaji)}</small></button>`).join('')}</div>${pager(kanaPage,total,'kana-prev','kana-next')}<button class="text-button" data-action="kana-notes">Pronunciation field notes</button></div>`;
  }
  function settingsView() {
    return `<div class="settings-screen">${screenHeader('FIELD UNIT SETTINGS','SD–01')}<h1>Field station link</h1><p>Connect once. Then explore.</p><div class="link-status ${health?.vision_available && health?.segmentation_available ? 'online' : ''}" role="status"><b>${checking ? 'Checking the signal…' : health ? 'Field station linked' : 'No field signal'}</b><p>${checking ? 'Contacting your paired station.' : health ? health.vision_available && health.segmentation_available ? 'The scanner is ready for discoveries.' : 'The station is connected, but its scanner is not ready.' : esc(connectionError || 'Pair this unit with your Mac to identify new discoveries.')}</p></div>${demo ? '<p class="settings-note">This online demonstration uses prepared discoveries. No photos are uploaded and no model is called.</p>' : `<button class="action" data-action="pair">${window.DexNative ? 'Pair with your Mac' : 'Connection instructions'}</button><button class="soft-button" data-action="check" ${checking?'disabled':''}>Test connection</button><details><summary>Connection details</summary><p>Run Start SpiralDex.command on the Mac and keep it awake. Use its HTTPS address, token, and certificate fingerprint. Both devices need to be on the same trusted network.</p><p>Recognition and background removal run on your Mac. New discoveries need this link; your archive and installed Japanese voices work offline.</p></details>`}<button class="text-button" data-action="scanner">Return to scanner</button><button class="text-button" data-action="credits">About &amp; licenses</button>${DexMotion.controls()}</div>`;
  }
  function reviewView() {
    if (!cards.length) return collectionView();
    const record = cards[reviewIndex % cards.length];
    return `<div class="recall-screen">${screenHeader('MEMORY CHECK',`${reviewIndex % cards.length + 1} / ${cards.length}`)}<img src="${asset(record)}" alt="${esc(record.english)}"><div class="recall-answer">${answer ? `<button class="word" data-speak="${esc(record.reading)}" lang="ja">${esc(record.word)} ${icon('sound')}</button><p>${esc(record.reading)} · ${esc(record.romaji)}</p>` : '<h1>What is its name?</h1><p>Try saying it in Japanese.</p>'}</div><button class="action" data-action="${answer?'review-next':'reveal'}">${answer?'Next entry →':'Reveal the word'}</button><button class="text-button" data-action="collection">Return to archive</button></div>`;
  }
  function render() {
    const content = {scanner,card:cardView,collection:collectionView,kana:kanaView,settings:settingsView,review:reviewView}[view] || scanner;
    root.innerHTML = `<div class="field-unit"><header class="device-head"><button class="lens" data-action="settings" aria-label="Field station settings" ${busy?'disabled':''}><span></span></button><div class="indicator-bank" aria-label="${sectionNames[section]}, section ${section+1} of 3">${sections.map((_,i)=>`<i class="indicator ${i===section?'lit':''}" aria-hidden="true"></i>`).join('')}<span class="device-name">SPIRALDEX</span></div><span class="device-model">FIELD UNIT<br>SD–01</span></header><div class="case-seam" aria-hidden="true"></div><main class="display ${view==='card'?'card-display':''}" aria-label="${esc(view==='card'?'Discovery card':sectionNames[section])}">${content()}</main><footer class="device-controls"><button class="hardware-button" data-action="${view==='card'?'hear':'scanner'}" aria-label="${view==='card'?'Hear this entry':'Return to scanner'}">${icon(view==='card'?'sound':'camera')}</button><div class="device-lcd" aria-live="polite"><b>${busy ? 'SCANNING' : view==='card' ? stored ? 'ENTRY REGISTERED' : 'MEMORY FULL' : `${String(section+1).padStart(2,'0')} / ${sectionNames[section].toUpperCase()}`}</b><span>${busy ? 'READING FIELD DATA…' : section===0?'SWIPE EITHER WAY':section===2?'SWIPE BACK':'KEEP SWIPING'}</span></div><div class="dpad"><button class="dpad-left" data-turn="-1" aria-label="Previous section" ${busy?'disabled':''}>‹</button><span></span><button class="dpad-right" data-turn="1" aria-label="Next section" ${busy?'disabled':''}>›</button></div></footer></div><input id="photo-input" type="file" accept="image/*" hidden>`;
    bind();
    if (stream) {
      const video = root.querySelector('video'); if (video) { video.srcObject = stream; void video.play().catch(()=>{}); }
    }
    if (target && root.querySelector('#subject-frame')) requestAnimationFrame(positionTarget);
  }
  function bind() {
    root.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click',() => action(button.dataset.action)));
    root.querySelectorAll('[data-turn]').forEach(button => button.addEventListener('click',() => turn(Number(button.dataset.turn))));
    root.querySelectorAll('[data-speak]').forEach(button => button.addEventListener('click',() => speak(button.dataset.speak)));
    root.querySelectorAll('[data-open]').forEach(button => button.addEventListener('click',() => openCard(cards.find(record => record.id===button.dataset.open))));
    root.querySelectorAll('[data-script]').forEach(button => button.addEventListener('click',() => { script=button.dataset.script; kanaPage=0;selectedKana=null;render(); }));
    root.querySelectorAll('[data-kana]').forEach(button => button.addEventListener('click',() => { selectedKana=kanaData[script].find(k=>k.kana===button.dataset.kana);render();void speak(selectedKana.kana); }));
    document.getElementById('photo-input').onchange = event => upload(event.target.files[0]);
    root.querySelector('#subject-frame')?.addEventListener('click',selectTarget);
    DexCards.mount(root);
  }

  function action(name) {
    switch(name) {
      case 'camera': return camera(); case 'photo': return choosePhoto(); case 'shutter': return shutter();
      case 'cancel': return cancelScan(); case 'rescan': return demo ? demoScan() : runScan();
      case 'retake': photo=null;target=null;error='';navigate('scanner');return camera();
      case 'scanner': return navigate('scanner'); case 'collection': return navigate('collection');
      case 'settings': return navigate('settings'); case 'check': return checkConnection();
      case 'pair': return window.DexNative ? DexNative.settings() : toast('Open Start SpiralDex.command on your Mac. The Android app uses the pairing details shown there.');
      case 'last': return openCard(lastCard()); case 'inspect': return inspect();
      case 'hear': if(entry) return speak(entry.reading);return;
      case 'cards-prev': collectionPage--;return render();case 'cards-next':collectionPage++;return render();
      case 'kana-prev':kanaPage--;selectedKana=null;return render();case 'kana-next':kanaPage++;selectedKana=null;return render();
      case 'credits': {
        const dialog=showDialog('About the field unit','<p>SpiralDex 0.3.1 · © 2026 SpiralDex contributors</p><p>Card effects: <b>pokemon-cards-css</b>, © 2022 Simon Goellner (@simeydotme). Free software under GPL-3.0, without warranty. You may redistribute and modify it under that license. Prior MIT notices are retained.</p><p>Corresponding source: github.com/edtireli/spiraldex/releases/tag/v0.3.1<br>Card effects: github.com/simeydotme/pokemon-cards-css</p><button class="soft-button" data-license>Read the GPL-3.0 license</button>');
        dialog.querySelector('[data-license]').onclick=async()=>{try{const response=await fetch('vendor/pokemon-cards-css/LICENSE');if(!response.ok)throw Error();const text=await response.text();dialog.close();showDialog('GPL-3.0 license',`<pre style="white-space:pre-wrap;font:11px/1.6 monospace">${esc(text)}</pre>`);}catch{toast('The license could not be opened. It is also included with the release source.');}};return;
      }
      case 'kana-notes':return showDialog('Sound field notes','<p>Hiragana and katakana each have 46 basic characters. Tap a sign to hear its sound.</p><p>On their own, は and へ sound “ha” and “he”. As particles they are “wa” and “e”. を is usually “o”. Voiced and combined sounds will join the library in a future update.</p>');
      case 'review':reviewIndex=0;answer=false;return navigate('review');case 'reveal':answer=true;return render();
      case 'review-next':reviewIndex++;answer=false;return render();
      case 'save':return register(entry,false);
    }
  }
  function openCard(record) { if(!record)return;entry=record;stored=cards.some(c=>c.id===record.id);navigate('card'); }
  async function loadKana() {
    try { kanaData=await(await fetch('kana.json')).json();if(view==='kana')render(); }
    catch { toast('The sound library could not open. Reopen your field unit to try again.'); }
  }
  async function speak(text,slow=false) {
    if (!text) return;
    if (window.DexNative) { DexNative.speak(text,slow); return; }
    stopAudio();
    const voice=window.speechSynthesis?.getVoices().find(v=>/^ja(?:-|_)/i.test(v.lang));
    if(voice){const speech=new SpeechSynthesisUtterance(text);speech.lang='ja-JP';speech.voice=voice;speech.rate=slow?.65:.85;speech.onerror=()=>toast('Audio unavailable. Check your Japanese voice settings.');window.speechSynthesis.speak(speech);return;}
    if(demo){toast('Install a Japanese device voice to hear the sound library.');return;}
    try{audio=new Audio(`/api/speech?text=${encodeURIComponent(text)}`);audio.playbackRate=slow?.75:1;await audio.play();}catch{toast('Audio unavailable. Install a Japanese device voice.');}
  }
  async function camera() {
    if(busy)return;
    if(demo)return demoScan();
    if(window.DexNative){DexNative.camera();return;}
    const ticket=++epoch;
    try {
      stopCamera();
      if(!navigator.mediaDevices?.getUserMedia)throw Error();
      const captureStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
      if(ticket!==epoch || view!=='scanner'){captureStream.getTracks().forEach(t=>t.stop());return;}
      stream=captureStream;error='';render();
    } catch {toast('Camera unavailable. Use the photograph button to choose an image.');}
  }
  function choosePhoto() { if(demo)return demoScan();if(window.DexNative)DexNative.photo();else document.getElementById('photo-input').click(); }
  function shutter() {
    const video=root.querySelector('video');if(!video?.videoWidth)return;
    const canvas=document.createElement('canvas'),scale=Math.min(1,1600/Math.max(video.videoWidth,video.videoHeight));
    canvas.width=Math.round(video.videoWidth*scale);canvas.height=Math.round(video.videoHeight*scale);canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);
    acceptPhoto(canvas.toDataURL('image/jpeg',.88));
  }
  async function upload(file) {
    if(!file)return;if(file.size>20*1024*1024){toast('Choose a photograph smaller than 20 MB.');return;}
    try {
      const bitmap=await createImageBitmap(file,{imageOrientation:'from-image'}),scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');
      canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();acceptPhoto(canvas.toDataURL('image/jpeg',.88));
    }catch{toast('This photograph could not be opened. Try a JPEG or PNG.');}
  }
  function acceptPhoto(value) { if(busy)return;photo=value;target=null;error='';section=0;view='scanner';stopCamera();void runScan(); }
  function positionTarget() {
    const frame=root.querySelector('#subject-frame'),img=frame?.querySelector('img'),dot=frame?.querySelector('.target-marker');if(!target||!img?.naturalWidth||!dot)return;
    const b=img.getBoundingClientRect(),f=frame.getBoundingClientRect(),scale=Math.min(b.width/img.naturalWidth,b.height/img.naturalHeight),w=img.naturalWidth*scale,h=img.naturalHeight*scale;
    dot.style.left=`${b.left-f.left+(b.width-w)/2+target.x*w}px`;dot.style.top=`${b.top-f.top+(b.height-h)/2+target.y*h}px`;
  }
  function selectTarget(event) {
    const img=event.currentTarget.querySelector('img'),b=img.getBoundingClientRect(),scale=Math.min(b.width/img.naturalWidth,b.height/img.naturalHeight),w=img.naturalWidth*scale,h=img.naturalHeight*scale;
    const x=(event.clientX-b.left-(b.width-w)/2)/w,y=(event.clientY-b.top-(b.height-h)/2)/h;
    if(x<0||x>1||y<0||y>1)return;target={x,y};render();
  }
  function cancelScan() { ++epoch;scanController?.abort();clearTimeout(pollTimer);busy=false;stage='scanning';error='Scan paused. Your photograph is ready whenever you are.';render(); }
  function readableError(message) {
    if(/could not be reached|Not paired|pairing (?:needed|required)/i.test(message))return 'Field signal lost. Open Field link to pair or reconnect your Mac.';
    if(/could not finish|already processing/i.test(message))return 'The field station is still working or unavailable. Keep it awake, then scan again.';
    return message || 'The entry could not be decoded. Try another angle.';
  }
  async function runScan() {
    if(busy||!photo)return;stopCamera();busy=true;error='';view='scanner';section=0;stage='scanning';render();
    const ticket=++epoch,requestId=crypto.randomUUID().replaceAll('-','');scanController=new AbortController();
    let timedOut=false;const timeout=setTimeout(()=>{timedOut=true;scanController.abort()},240000);
    const poll=async()=>{
      if(ticket!==epoch||!busy)return;
      try{const response=await api(`/api/scan/status?id=${requestId}`,{signal:scanController.signal});if(response.ok){const data=await response.json();if(ticket===epoch)setStage(data.stage);}}catch{}
      if(ticket===epoch&&busy)pollTimer=setTimeout(poll,1200);
    };
    pollTimer=setTimeout(poll,600);
    try {
      const response=await api('/api/scan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image:photo,target,request_id:requestId}),signal:scanController.signal});
      const data=await response.json();if(!response.ok)throw Error(data.error);if(ticket!==epoch)return;
      if(!data.id||!data.word||!data.reading||!asset(data))throw Error('The entry arrived incomplete. Scan again.');
      setStage('ready');await register(data,true,ticket);
    } catch(failure) {
      if(ticket!==epoch)return;busy=false;error=failure.name==='AbortError'?(timedOut?'The field station took too long. Your photograph is kept; scan again.':'Scan paused. Your photograph is kept.'):readableError(failure.message);render();
    } finally {clearTimeout(timeout);clearTimeout(pollTimer);}
  }
  async function register(record,reveal=true,ticket=epoch) {
    const previous=[...cards],index=cards.findIndex(c=>c.id===record.id),isNew=index<0;
    const next=normalize({...record,number:isNew?String(Math.max(0,...cards.map(c=>Number(c.number)||0))+1).padStart(3,'0'):cards[index].number},Math.max(0,index));
    if(index>=0)cards.splice(index,1);
    cards.push(next); // Most recently scanned entry also drives the standby screen.
    const saved=await persist();if(!saved)cards=previous;
    if(ticket!==epoch)return;
    entry=next;stored=saved;busy=false;fresh=reveal&&isNew;view='card';render();
    if(!saved)toast('Dex memory is full. This discovery is visible, but could not be stored.');
  }
  async function demoScan() {
    if(busy)return;const record={...SAMPLES[[1,2,0][demoCounter++%3]]};record.card_type=record.id==='apple'?'food':'household';record.rarity='Common';record.card_finish='classic';record.rarity_reason='An ordinary everyday object, widely encountered.';
    photo=record.asset;target=null;error='';view='scanner';section=0;busy=true;stage='scanning';const ticket=++epoch;render();
    for(const step of ['scanning','isolating','decoding']){if(ticket!==epoch)return;setStage(step);await new Promise(resolve=>setTimeout(resolve,650));}
    if(ticket===epoch)await register(record,true,ticket);
  }
  async function checkConnection() {
    if(demo||checking)return;checking=true;if(view==='settings')render();
    try{const response=await api('/api/health',{signal:AbortSignal.timeout(window.DexNative?20000:5000)});const data=await response.json();if(!response.ok)throw Error(data.error);health=data;connectionError='';}
    catch(failure){health=null;connectionError=readableError(failure.message);}
    checking=false;if(view==='settings')render();
  }
  function showDialog(title,content) {
    const active=document.activeElement;document.querySelector('dialog')?.remove();const dialog=document.createElement('dialog');dialog.className='field-dialog';
    dialog.innerHTML=`<header><h2>${title}</h2><button class="round-control" data-close aria-label="Close inspection">${icon('close')}</button></header><div class="dialog-body">${content}</div>`;
    document.body.append(dialog);dialog.querySelector('[data-close]').onclick=()=>dialog.close();dialog.addEventListener('close',()=>{dialog.remove();if(active?.isConnected)active.focus()});dialog.showModal();return dialog;
  }
  function inspect() {
    if(!entry)return;
    const p=entry.profile;
    const dialog=showDialog(`ENTRY ${esc(entry.number)}`,`<div class="inspection-card" data-no-swipe>${cardMarkup(entry)}</div>${DexMotion.controls()}<div class="inspection-word"><h3 lang="ja">${esc(entry.word)}</h3><p>${esc(entry.reading)} · ${esc(entry.romaji)}</p><b>${esc(entry.english)}</b></div><div class="inspection-tags"><span>${esc(p.label)}</span><span>${esc(p.rarity)} ${raritySymbol(p)}</span><span>HP ${p.hp}</span></div><h4>Rarity assessment</h4><p>${esc(entry.rarity_reason || 'This older entry has no model rarity assessment. Scan it again to have the Dex assess it.')}</p><h4>Field notes</h4><p>${esc(entry.description)}</p><p>${esc(entry.fact)}</p><h4>Voice record</h4><button class="example-audio" data-example lang="ja">${esc(entry.sentence)} ${icon('sound')}</button><p lang="ja">${esc(entry.sentence_reading)}</p><p>${esc(entry.translation)}</p><button class="soft-button" data-slow>Hear the name slowly</button><details><summary>About this entry</summary><p>The model judges object rarity from visible evidence; it can be wrong. Rare entries receive holographic finishes. HP and field ratings are stable game attributes, not real measurements.</p><p>Field notes are generated and may need correction. Check the name and reading when an entry looks unfamiliar.</p><p>${esc(entry.verification==='JMdict reading matched'?'Spelling and reading matched the local dictionary.':'')}</p></details><button class="text-button" data-correct>Correct this entry</button>`);
    DexCards.mount(dialog);
    dialog.querySelectorAll('[data-speak]').forEach(button=>button.onclick=()=>speak(button.dataset.speak));
    dialog.querySelector('[data-example]').onclick=()=>speak(entry.sentence_reading);
    dialog.querySelector('[data-slow]').onclick=()=>speak(entry.reading,true);
    dialog.querySelector('[data-correct]').onclick=()=>{dialog.close();correctEntry();};
  }
  function correctEntry() {
    const dialog=showDialog('Correct field record',`<form><label>Japanese name<input name="word" maxlength="40" required value="${esc(entry.word)}"></label><label>Hiragana reading<input name="reading" maxlength="60" required pattern="[ぁ-ゖー ・]+" value="${esc(entry.reading)}"></label><label>English meaning<input name="english" maxlength="80" required value="${esc(entry.english)}"></label><p class="small-print">Changing the name clears the old example and notes so they cannot describe the wrong object.</p><button class="action">Save correction</button></form>`);
    dialog.querySelector('form').onsubmit=async event=>{event.preventDefault();const data=new FormData(event.target),word=data.get('word').trim(),reading=data.get('reading').trim(),english=data.get('english').trim();if(!word||!reading||!english)return;
      const updated={...entry,word,reading,english,rarity:null,card_finish:'classic',rarity_reason:'Scan this corrected object again for a new rarity assessment.',romaji:'',source:'User corrected',description:english,sentence:word,sentence_reading:reading,translation:english,fact:'This field record was corrected by you.'};
      dialog.close();await register(updated,false);
    };
  }
  window.dexNativeResult=(id,status,body)=>{const request=pending.get(id);if(!request)return;pending.delete(id);request.cleanup();request.resolve({ok:status>=200&&status<300,json:async()=>JSON.parse(body)});};
  function api(path,options={}) {
    if(demo)return Promise.reject(Error('Demonstration mode.'));
    if(!window.DexNative)return fetch(path,options);
    return new Promise((resolve,reject)=>{
      const id=String(++requestCounter),signal=options.signal;
      const abort=()=>{pending.delete(id);signal?.removeEventListener('abort',abort);DexNative.cancel(id);reject(new DOMException('Cancelled','AbortError'));};
      if(signal?.aborted){reject(new DOMException('Cancelled','AbortError'));return;}
      pending.set(id,{resolve,reject,cleanup:()=>signal?.removeEventListener('abort',abort)});signal?.addEventListener('abort',abort,{once:true});DexNative.request(id,path,options.body||'');
    });
  }
  window.dexAcceptPhoto=acceptPhoto;window.dexNativeNotice=toast;window.dexPairingChanged=checkConnection;
  window.dexBack=()=>{const dialog=document.querySelector('dialog[open]');if(dialog){dialog.close();return;}if(busy){cancelScan();return;}if(sections.includes(view)&&section>0){turn(-1);return;}navigate(sections[section]);};
  let gesture=null;
  root.addEventListener('pointerdown',event=>{if(!event.isPrimary||event.target.closest('input,textarea,select,[data-no-swipe]'))return;gesture={x:event.clientX,y:event.clientY,time:Date.now(),id:event.pointerId};});
  root.addEventListener('pointercancel',()=>gesture=null);
  root.addEventListener('pointerup',event=>{if(!gesture||gesture.id!==event.pointerId)return;const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y,elapsed=Date.now()-gesture.time;gesture=null;if(Math.abs(dx)>65&&Math.abs(dx)>Math.abs(dy)*1.6&&elapsed<1000){event.preventDefault();swipe(dx>0?1:-1);}});
  document.addEventListener('keydown',event=>{if(event.target.closest('input,textarea,select,dialog'))return;if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();turn(event.key==='ArrowRight'?1:-1);}});
  window.addEventListener('resize',()=>{if(!document.querySelector('dialog[open]'))render();});
  window.addEventListener('pagehide',()=>{stopCamera();stopAudio();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){stopCamera();stopAudio();}else if(!busy&&view==='scanner')render();});
  void initialize();
})();
