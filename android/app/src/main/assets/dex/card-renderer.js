/* SpiralDex HTML card faces and adapter for simeydotme/pokemon-cards-css.
 * Uses the upstream CSS custom-property contract; see vendor/pokemon-cards-css.
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
(() => {
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeAsset=value=>/^(assets\/[a-z-]+\.(?:png|webp|svg)|data:image\/(?:png|jpeg);base64,[A-Za-z0-9+/=]+)$/.test(value||'')?value:'';
  const types={household:'colorless',nature:'grass',food:'fire',tool:'metal',technology:'lightning',wearable:'psychic'};
  const symbols={household:'✦',nature:'❧',food:'♨',tool:'◆',technology:'ϟ',wearable:'◉'};
  const finishStyles={'classic':'common','reverse-holo':'common reverse holo','holo':'rare holo','full-art':'trainer gallery rare holo'};
  const sound='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10h4l5-4v12l-5-4H3Z M16 8q6 4 0 8"/></svg>';
  function energy(type){return `<span class="energy energy-${type}" aria-hidden="true">${symbols[type]||'✦'}</span>`;}
  function render(record) {
    const p=record.profile||DexProfile(record.word,record.reading,record.card_type,record.rarity,record.card_finish),full=p.finish==='full-art',type=types[p.type]?'type-'+p.type:'type-household';
    const rarity=finishStyles[p.finish]||'common',star=!p.assessed?'–':p.rarity==='Common'?'●':p.rarity==='Uncommon'?'◆':p.rarity==='Rare'?'★':'★★';
    return `<article class="dex-card card interactive ${type} ${types[p.type]||'colorless'} ${full?'full-art':''} ${p.finish!=='classic'?'foil':''}" data-rarity="${rarity}" data-supertype="field entry" data-subtypes="basic" data-card-effects="pokemon-cards-css" aria-label="${esc(record.english)} discovery card, ${esc(p.rarity)}">
      <div class="card__translater"><div class="card__rotator"><div class="card__front">
        <div class="card-face"><div class="card-print"><div class="card-paper">
          <header class="card-heading"><div class="card-name-line"><span class="stage-badge">${full?'FULL ART':'BASIC'}</span><button class="word" data-speak="${esc(record.reading)}" aria-label="Hear ${esc(record.word)}"><span lang="ja">${esc(record.word)}</span>${sound}</button><span class="hp"><small>HP</small><strong>${p.hp}</strong>${energy(p.type)}</span></div><p class="reading"><span lang="ja">${esc(record.reading)}</span>${record.romaji?' · '+esc(record.romaji):''}</p></header>
          <div class="card-art"><div class="art-scene" aria-hidden="true"></div><img src="${safeAsset(record.asset)}" alt="${esc(record.english)} with its background removed"></div>
          <div class="specimen-line">NO. ${esc(record.number)} &nbsp; ${esc(p.label)} discovery &nbsp; · &nbsp; ${esc(record.english)}</div>
          <div class="card-language"><div class="ability-heading"><span>Ability</span><b>Word Recall</b></div><p class="card-definition">${esc(record.description)}</p><div class="card-move"><div class="move-line"><span class="energy-cost">${energy(p.type)}${energy('household')}</span><button data-speak="${esc(record.sentence_reading)}" lang="ja">${esc(record.sentence)} ${sound}</button><b class="move-power" aria-label="Power ${p.stats.power}">${p.stats.power}</b></div><p class="move-reading" lang="ja">${esc(record.sentence_reading)}</p><p class="move-translation">${esc(record.translation)}</p></div></div>
          <div class="card-stats">${Object.entries(p.stats).map(([name,value])=>`<span><small>${name}</small>${energy(name==='power'?p.type:'household')}<b>${value}</b></span>`).join('')}</div>
          <p class="card-flavor">${esc(record.fact||record.description)}</p>
          <footer class="card-footer"><span><b>SDX</b> ${esc(record.number)} &nbsp; FIELD SET</span><span>${esc(p.rarity)} ${star}</span></footer>
        </div></div></div>
        <div class="card__shine" aria-hidden="true"></div><div class="card__glare" aria-hidden="true"></div>
      </div></div></div>
    </article>`;
  }
  const properties=['--rotate-x','--rotate-y','--translate-x','--translate-y','--pointer-x','--pointer-y','--background-x','--background-y','--pointer-from-center','--pointer-from-top','--pointer-from-left','--card-opacity'];
  function reset(card) {
    card.classList.remove('interacting');
    for(const name of properties)card.style.removeProperty(name);
  }
  function pose(card,x,y,travel=0) {
    card.classList.add('interacting');
    const values={'pointer-x':`${x*100}%`,'pointer-y':`${y*100}%`,'background-x':`${37+x*26}%`,'background-y':`${33+y*34}%`,'rotate-x':`${(x-.5)*-15}deg`,'rotate-y':`${(y-.5)*15}deg`,'translate-x':`${(x-.5)*travel}px`,'translate-y':`${(y-.5)*travel}px`,'pointer-from-center':Math.min(1,Math.hypot(x-.5,y-.5)*2),'pointer-from-top':y,'pointer-from-left':x,'card-opacity':1};
    for(const [name,value] of Object.entries(values))card.style.setProperty('--'+name,value);
  }
  // Layout the complete print at 600 px, then shrink it as one piece. WebView's
  // minimum font size must not enlarge individual lines inside small thumbnails.
  const faceWidth=600,observed=new Set();
  const sizeObserver=new ResizeObserver(entries=>{
    for(const {target,contentRect} of entries)target.style.setProperty('--face-scale',contentRect.width/faceWidth);
  });
  function mount(container) {
    for(const card of observed)if(!card.isConnected){sizeObserver.unobserve(card);observed.delete(card);}
    container.querySelectorAll('.dex-card.card').forEach(card=>{
      if(observed.has(card))return;
      card.style.setProperty('--face-scale',card.clientWidth/faceWidth);sizeObserver.observe(card);observed.add(card);
    });
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    container.querySelectorAll('.dex-card.card:not([data-effects-bound])').forEach(card=>{
      card.dataset.effectsBound='true';let frame=0,timer;
      const move=event=>{
        if(reduced.matches)return;
        const rect=card.getBoundingClientRect(),x=Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width)),y=Math.max(0,Math.min(1,(event.clientY-rect.top)/rect.height));
        clearTimeout(timer);cancelAnimationFrame(frame);card.dataset.pointerActive='true';
        frame=requestAnimationFrame(()=>{if(!reduced.matches)pose(card,x,y);});
      };
      const end=()=>{cancelAnimationFrame(frame);clearTimeout(timer);timer=setTimeout(()=>{delete card.dataset.pointerActive;reset(card);window.DexMotion?.paint();},180);};
      card.addEventListener('pointermove',move);card.addEventListener('pointerdown',move);card.addEventListener('pointerleave',end);card.addEventListener('pointerup',end);card.addEventListener('pointercancel',end);
      card.addEventListener('focusin',()=>{if(!reduced.matches)card.style.setProperty('--card-opacity','1');});card.addEventListener('focusout',end);
    });
    window.DexMotion?.refresh();
  }
  window.DexCards={render,mount,pose,reset};
})();
