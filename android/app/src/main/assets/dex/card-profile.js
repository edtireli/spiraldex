/* Keep in sync with host/card_profile.py. Rarity comes from the model, never a hash. */
((global) => {
  const types={household:'Household',nature:'Nature',food:'Food',tool:'Tool',technology:'Technology',wearable:'Wearable'};
  const finishes={'Common':['classic'],'Uncommon':['classic'],'Rare':['holo','reverse-holo'],'Ultra rare':['full-art']};
  function profile(word,reading,cardType='household',rarity=null,finish=null) {
    if(!Object.prototype.hasOwnProperty.call(types,cardType))cardType='household';
    const assessed=Object.prototype.hasOwnProperty.call(finishes,rarity);
    rarity=assessed?rarity:'Unassessed';const allowed=assessed?finishes[rarity]:['classic'];
    finish=allowed.includes(finish)?finish:allowed[0];
    let seed=2166136261;
    for(const char of `${word}|${reading}`)seed=Math.imul(seed^char.codePointAt(0),16777619)>>>0;
    return {version:2,type:cardType,label:types[cardType],rarity,assessed,finish,hp:50+((seed>>>8)%12)*10,
      stats:{power:20+seed%71,guard:20+(seed>>>7)%71,wonder:20+(seed>>>15)%71}};
  }
  global.DexProfile=profile;if(typeof module!=='undefined')module.exports=profile;
})(globalThis);
