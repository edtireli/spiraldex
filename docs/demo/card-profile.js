/* Keep in sync with host/card_profile.py. Collectible ratings, not physical measurements. */
((global) => {
  const types = {household:'Household', nature:'Nature', food:'Food', tool:'Tool', technology:'Technology', wearable:'Wearable'};
  function profile(word, reading, cardType = 'household') {
    if (!Object.prototype.hasOwnProperty.call(types, cardType)) cardType = 'household';
    let seed = 2166136261;
    for (const char of `${word}|${reading}`) seed = Math.imul(seed ^ char.codePointAt(0), 16777619) >>> 0;
    const roll = seed % 1000;
    return {version:1, type:cardType, label:types[cardType],
      rarity:roll < 700 ? 'Common' : roll < 940 ? 'Uncommon' : roll < 995 ? 'Rare' : 'Ultra rare',
      finish:roll >= 940 ? 'foil' : 'classic', hp:50 + ((seed >>> 8) % 12) * 10,
      stats:{power:20 + seed % 71, guard:20 + (seed >>> 7) % 71, wonder:20 + (seed >>> 15) % 71}};
  }
  global.DexProfile = profile;
  if (typeof module !== 'undefined') module.exports = profile;
})(globalThis);
