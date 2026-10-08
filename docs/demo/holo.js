// Original SpiralDex foil interaction, visually inspired by simeydotme/pokemon-cards-css.
// Legacy design study only. Classic Dex uses the actual upstream CSS via card-renderer.js.
(() => {
const reduce=matchMedia('(prefers-reduced-motion: reduce)');
function attach(){document.querySelectorAll('[data-theme=holo] .cardface:not([data-foil]), .cardface.foil:not([data-foil])').forEach(card=>{
card.dataset.foil='true';
const set=(x,y)=>{card.style.setProperty('--px',`${x*100}%`);card.style.setProperty('--py',`${y*100}%`);card.style.setProperty('--tilt-x',`${(y-.5)*-9}deg`);card.style.setProperty('--tilt-y',`${(x-.5)*10}deg`);};
card.addEventListener('pointermove',e=>{if(reduce.matches)return;const r=card.getBoundingClientRect();set((e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height)});
card.addEventListener('pointerleave',()=>set(.5,.5));
const controls=document.createElement('div');controls.className='foil-controls';controls.innerHTML='<label for="foil-angle">Explore the foil <span>↔</span></label><input id="foil-angle" type="range" min="0" max="100" value="50" aria-label="Foil viewing angle">';card.after(controls);
controls.querySelector('input').addEventListener('input',e=>{if(!reduce.matches)set(Number(e.target.value)/100,.4);});
});}
new MutationObserver(attach).observe(document.getElementById('app'),{childList:true,subtree:true});attach();
})();
