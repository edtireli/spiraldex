(() => {
const sample=SAMPLES.find(item=>item.id==='apple');
const prints=[['Common','classic','Classic print','Solid gold border, type color, and a light gloss.'],['Rare','reverse-holo','Reverse holo','The actual upstream reverse-holo treatment, around the illustration.'],['Rare','holo','Holographic','The actual upstream regular-holo scanlines, color bands, and moving glare.'],['Ultra rare','full-art','Full-art holo','The actual upstream gallery-holo treatment across a silver-edged, full-art face.']];
document.getElementById('prints').innerHTML=prints.map(([rarity,finish,title,note])=>`<section class="print-panel">${DexCards.render({...sample,profile:DexProfile(sample.word,sample.reading,'food',rarity,finish)})}<h2>${title}</h2><p>${note}</p></section>`).join('');DexCards.mount(document);
document.querySelectorAll('[data-speak]').forEach(button=>button.onclick=()=>{const voice=speechSynthesis.getVoices().find(v=>v.lang.startsWith('ja'));if(!voice)return;const speech=new SpeechSynthesisUtterance(button.dataset.speak);speech.voice=voice;speechSynthesis.speak(speech);});
})();

document.getElementById("motion-controls").innerHTML=DexMotion.controls();DexMotion.refresh();
