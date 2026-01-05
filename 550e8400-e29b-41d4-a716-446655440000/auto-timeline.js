/* auto-timeline.js
   Usage: add elements with ids like "etape-2025-05-10" or "etape-05-10" or set a data-release attribute.
   Examples supported:
     - <div id="etape-2025-05-10">...
     - <div id="etape-05-10">...
     - <div data-release="2025-05-10">...
     - <div data-release="05-10">...

   Behaviour: for each element found, compute the target month/year and build an unlock date set to the 5th
   of that month. If today's date >= that unlock date the element is shown; otherwise an overlay with
   the message "Reviens le 5 du mois" is displayed.
*/
(function(){
  'use strict';

  function parseReleaseDate(el){
    const dr = (el.dataset.release || '').trim();
    const id = el.id || '';
    const now = new Date();

    // helper to build next occurrence if month/day only
    function nextOccurrence(month, day){
      let year = now.getFullYear();
      let d = new Date(year, month-1, day, 0,0,0,0);
      if(d < now) d = new Date(year+1, month-1, day,0,0,0,0);
      return d;
    }

    // dataset release YYYY-MM-DD
    if(/^\d{4}-\d{2}-\d{2}$/.test(dr)){
      const [y,m,day] = dr.split('-').map(Number);
      return new Date(y,m-1,day,0,0,0,0);
    }
    // dataset release MM-DD
    if(/^\d{2}-\d{2}$/.test(dr)){
      const [m,day] = dr.split('-').map(Number);
      return nextOccurrence(m, day);
    }

    // id patterns
    // etape-YYYY-MM-DD
    let match = id.match(/^etape-(\d{4})-(\d{2})-(\d{2})$/);
    if(match){ return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])); }

    // etape-MM-DD -> assume next occurrence of that month/day
    match = id.match(/^etape-(\d{2})-(\d{2})$/);
    if(match){ return nextOccurrence(Number(match[1]), Number(match[2])); }

    // etape-DD (day only) -> assume that day of current month (or next if passed)
    match = id.match(/^etape-(\d{2})$/);
    if(match){
      const day = Number(match[1]);
      let d = new Date(now.getFullYear(), now.getMonth(), day,0,0,0,0);
      if(d < now) d = new Date(now.getFullYear(), now.getMonth()+1, day,0,0,0,0);
      return d;
    }

    return null;
  }

  function addLockOverlay(el, text){
    // avoid duplicating overlay
    if(el._autoTimelineOverlay) return;
    // ensure positioned parent
    const prevPos = window.getComputedStyle(el).position;
    if(prevPos === 'static') el.style.position = 'relative';

    const overlay = document.createElement('div');
    overlay.className = 'auto-timeline-lock';
    overlay.setAttribute('aria-hidden','false');
    Object.assign(overlay.style,{
      position: 'absolute', inset: '0', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(to bottom, rgba(0,0,0,0.4), rgba(0,0,0,0.6))', color: '#d4a017',
      fontSize: '16px', textAlign: 'center', padding: '12px', boxSizing: 'border-box', zIndex: '999'
    });
    // Only show a discreet lock icon on locked items (no text)
    overlay.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%"><div style="font-size:28px;color:#d4a017">🔒</div></div>`;
    el.appendChild(overlay);
    el._autoTimelineOverlay = overlay;
  }

  function removeLockOverlay(el){
    if(el._autoTimelineOverlay){
      el._autoTimelineOverlay.remove();
      delete el._autoTimelineOverlay;
    }
    // if we previously modified position, leave it — don't revert to avoid layout shift issues
  }

  function processElement(el){
    const releaseDate = parseReleaseDate(el);
    if(!releaseDate){
      // nothing to do
      return;
    }

    // The rule: unlock on the 5th of the releaseDate's month/year
    const unlockDate = new Date(releaseDate.getFullYear(), releaseDate.getMonth(), 5, 0,0,0,0);
    const today = new Date();
    // Normalize to midnight for fair compare
    const t = new Date(today.getFullYear(), today.getMonth(), today.getDate(),0,0,0,0);

    if(t >= unlockDate){
      // unlock
      removeLockOverlay(el);
      el.dataset.timelineState = 'unlocked';
      el.style.opacity = '';
    } else {
      // lock
      addLockOverlay(el, 'Reviens le 5 du mois');
      el.dataset.timelineState = 'locked';
      // optionally dim content
      el.style.opacity = '0.85';
    }
  }

  function run(){
    // Select elements: any with id starting with 'etape-' OR with data-release attribute
    const els = Array.from(document.querySelectorAll('[id^="etape-"], [data-release]'));
    els.forEach(processElement);
  }

  // Run on DOMContentLoaded and once per day when page kept open (check every hour)
  document.addEventListener('DOMContentLoaded', run);
  // also run shortly after load in case some elements are added dynamically
  setTimeout(run, 800);
  setInterval(run, 1000 * 60 * 60); // hourly

})();
