/* Phone orientation → the real pokemon-cards-css lighting/transform properties.
 * Sensor data stays on the device. SPDX-License-Identifier: GPL-3.0-or-later */
(() => {
  'use strict';
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),key='spiraldex-card-motion';
  const native=typeof window.DexNative?.motionAvailable==='function';
  const available=native?DexNative.motionAvailable():isSecureContext&&typeof DeviceOrientationEvent!=='undefined';
  const needsPermission=!native&&typeof window.DeviceOrientationEvent?.requestPermission==='function';
  let enabled=true;try{enabled=localStorage.getItem(key)!=='off';}catch{}
  let permitted=!needsPermission,permissionDenied=false,active=false,group=null,cards=[];
  let baseline=null,lastAngle=null,received=false,frame=0,signalTimer=0,noSignal=false;
  let target={x:.5,y:.5},smooth={...target};
  const clamp=value=>Math.max(0,Math.min(1,value));
  function controls() {
    return '<div class="card-motion-controls"><div><button type="button" class="soft-button" data-motion-toggle>Phone tilt</button><button type="button" class="text-button" data-motion-center>Recenter</button></div><p data-motion-status role="status"></p></div>';
  }
  function updateControls() {
    const usable=available&&!reduced.matches;
    const label=!usable?'Phone tilt: Off':!permitted&&enabled?'Enable phone tilt':`Phone tilt: ${enabled?'On':'Off'}`;
    const message=reduced.matches?'Reduced motion is enabled on this device.':!available?'Phone tilt is unavailable here. You can still drag a card.':!enabled?'Card motion is off.':permissionDenied?'Motion access was declined. You can still drag a card.':!permitted?'Enable motion access to tilt the cards with your phone.':noSignal?'No motion signal. You can still drag a card.':!active?'Ready when a card is open.':!received?'Hold the phone comfortably…':'Tilt to catch the light. Recenter sets your resting position.';
    document.querySelectorAll('[data-motion-toggle]').forEach(button=>{button.disabled=!usable;button.setAttribute('aria-pressed',String(enabled&&permitted&&usable));if(button.textContent!==label)button.textContent=label;});
    document.querySelectorAll('[data-motion-center]').forEach(button=>{button.disabled=!active||!received;});
    document.querySelectorAll('[data-motion-status]').forEach(element=>{if(element.textContent!==message)element.textContent=message;});
  }
  function clearPose() {
    cancelAnimationFrame(frame);frame=0;
    target={x:.5,y:.5};smooth={...target};
    cards.forEach(card=>{if(!card.dataset.pointerActive||reduced.matches)DexCards.reset(card);});
  }
  function recenter() {
    baseline=null;lastAngle=null;received=false;noSignal=false;clearPose();updateControls();
  }
  function paint() {
    if(frame||!active||!received)return;
    frame=requestAnimationFrame(()=>{
      frame=0;if(reduced.matches){refresh();return;}if(!active)return;
      smooth.x+=(target.x-smooth.x)*.16;smooth.y+=(target.y-smooth.y)*.16;
      for(const card of cards){
        if(!card.isConnected||card.dataset.pointerActive)continue;
        const rect=card.getBoundingClientRect();
        if(rect.bottom>0&&rect.top<innerHeight&&rect.right>0&&rect.left<innerWidth)DexCards.pose(card,smooth.x,smooth.y,8);
      }
      if(Math.abs(target.x-smooth.x)+Math.abs(target.y-smooth.y)>.001)paint();
    });
  }
  // Both native Android and the browser provide device-to-world rotation matrices.
  // Project the current screen normal onto the initial screen's axes. This avoids
  // Euler wrap/jumps near an upright phone and never needs a compass heading.
  function receive(matrix,angle=0) {
    if(reduced.matches){refresh();return;}
    if(!active||!Array.isArray(matrix)||matrix.length!==9||!matrix.every(Number.isFinite)||!Number.isFinite(angle))return;
    if(matrix.some(value=>Math.abs(value)>1.001))return;
    const a=angle*Math.PI/180,c=Math.cos(a),s=Math.sin(a),screen=[];
    for(let row=0;row<3;row++){const i=row*3;screen.push(matrix[i]*c+matrix[i+1]*s,-matrix[i]*s+matrix[i+1]*c,matrix[i+2]);}
    if(!baseline||lastAngle!==angle){baseline=screen;lastAngle=angle;smooth={x:.5,y:.5};}
    const x=baseline[0]*screen[2]+baseline[3]*screen[5]+baseline[6]*screen[8];
    const y=baseline[1]*screen[2]+baseline[4]*screen[5]+baseline[7]*screen[8];
    const z=baseline[2]*screen[2]+baseline[5]*screen[5]+baseline[8]*screen[8];
    const extent=22*Math.PI/180;
    target={x:clamp(.5+Math.atan2(x,z)/(2*extent)),y:clamp(.5-Math.atan2(y,Math.hypot(x,z))/(2*extent))};
    const wasReceived=received;received=true;noSignal=false;clearTimeout(signalTimer);
    if(!wasReceived)updateControls();paint();
  }
  function browserOrientation(event) {
    if(!Number.isFinite(event.beta)||!Number.isFinite(event.gamma))return;
    const radians=Math.PI/180,a=(event.alpha??0)*radians,b=event.beta*radians,g=event.gamma*radians;
    const ca=Math.cos(a),sa=Math.sin(a),cb=Math.cos(b),sb=Math.sin(b),cg=Math.cos(g),sg=Math.sin(g);
    // W3C intrinsic Z-X'-Y'' Euler convention.
    receive([ca*cg-sa*sb*sg,-sa*cb,ca*sg+sa*sb*cg,sa*cg+ca*sb*sg,ca*cb,sa*sg-ca*sb*cg,-cb*sg,sb,cb*cg],screen.orientation?.angle??window.orientation??0);
  }
  function refresh() {
    const modal=document.querySelector('dialog[open]');
    const nextCards=[...(modal||document).querySelectorAll('.dex-card.card')];
    const nextGroup=modal||nextCards[0]?.parentElement||null;
    if(group!==nextGroup){clearPose();group=nextGroup;baseline=null;received=false;}
    cards=nextCards;
    const shouldRun=Boolean(enabled&&available&&permitted&&!reduced.matches&&!document.hidden&&cards.length);
    if(shouldRun!==active){
      active=shouldRun;recenter();clearTimeout(signalTimer);
      if(native)DexNative.motion(active);
      else if(active)window.addEventListener('deviceorientation',browserOrientation);
      else window.removeEventListener('deviceorientation',browserOrientation);
      if(active)signalTimer=setTimeout(()=>{if(!received){noSignal=true;updateControls();}},4000);
    }
    updateControls();paint();
  }
  async function toggle() {
    if(!available||reduced.matches)return;
    if(!permitted){
      try{permitted=await DeviceOrientationEvent.requestPermission()==='granted';}catch{permitted=false;}
      permissionDenied=!permitted;if(permitted)enabled=true;
    }else enabled=!enabled;
    try{localStorage.setItem(key,enabled?'on':'off');}catch{}
    refresh();
  }
  document.addEventListener('click',event=>{
    if(event.target.closest('[data-motion-toggle]'))void toggle();
    if(event.target.closest('[data-motion-center]'))recenter();
  });
  reduced.addEventListener('change',refresh);
  document.addEventListener('visibilitychange',refresh);
  window.addEventListener('orientationchange',recenter);
  window.addEventListener('pagehide',()=>{active=false;clearPose();if(native)DexNative.motion(false);});
  window.addEventListener('pageshow',refresh);
  new MutationObserver(refresh).observe(document.body,{childList:true,subtree:true});
  window.DexMotion={controls,refresh,receive,paint,recenter};
})();
