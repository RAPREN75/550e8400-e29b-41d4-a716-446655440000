// auth.js — manage per-page password prompt and date gating
(function(){
  'use strict';
  const HASH_EXPECTED = '561f2d42ea28b8e600dcd1fe3fb9ace2739907331487f00fdba6196806606c42';

  async function sha256Hex(str){
    const enc = new TextEncoder();
    const data = enc.encode(str);
    const hash = await crypto.subtle.digest('SHA-256', data);
    const bytes = new Uint8Array(hash);
    return Array.from(bytes).map(b=>b.toString(16).padStart(2,'0')).join('');
  }

  function isAuthStored(){
    try{
      const s = sessionStorage.getItem('rendezvous-auth');
      const l = localStorage.getItem('rendezvous-auth');
      return s === HASH_EXPECTED || l === HASH_EXPECTED;
    }catch(e){return false}
  }

  function storeAuth(){
    try{ sessionStorage.setItem('rendezvous-auth', HASH_EXPECTED); localStorage.setItem('rendezvous-auth', HASH_EXPECTED); }catch(e){}
  }

  function findEtapeElement(){
    // element with id starting with etape-YYYY or etape-YYYY-MM-DD
    return document.querySelector('[id^="etape-"]');
  }

  function parseEtapeDateFromId(id){
    // expect etape-YYYY-MM-DD
    const m = id.match(/^etape-(\d{4})-(\d{2})-(\d{2})$/);
    if(m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]),0,0,0,0);
    return null;
  }

  function addLockedMessageToPage(msg){
    const body = document.body;
    // remove existing overlay if any
    const existing = document.getElementById('rendezvous-locked-overlay');
    if(existing) return;
    const overlay = document.createElement('div');
    overlay.id = 'rendezvous-locked-overlay';
    overlay.setAttribute('role','alert');
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '2147483647';
    overlay.style.background = 'rgba(2,2,2,0.96)';
    overlay.style.backdropFilter = 'blur(6px)';
    overlay.style.color = '#d4a017';
    overlay.style.fontFamily = 'Inter, Arial, sans-serif';
    overlay.style.textAlign = 'center';
    overlay.style.padding = '20px';
    overlay.style.pointerEvents = 'auto';
    overlay.style.overflow = 'hidden';
    overlay.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;gap:12px;max-width:90%;">
        <div style="font-size:44px;line-height:1">🔒</div>
        <div style="color:#f3d98a;font-size:18px;font-weight:600">Contenu non disponible</div>
      </div>
    `;
    // prevent page interaction/scroll
    document.documentElement.style.overflow = 'hidden';
    document.body.appendChild(overlay);
  }

  async function promptForPasswordAndVerify(){
    const attempt = prompt('Veuillez entrer la clé d\'accès :');
    if(!attempt) { window.location.href = 'index.html'; return false; }
    const h = await sha256Hex(attempt.trim().toLowerCase());
    if(h === HASH_EXPECTED){ storeAuth(); return true; }
    alert('Clé invalide.'); window.location.href = 'index.html'; return false;
  }

  async function runForEtape(){
    const el = findEtapeElement();
    if(!el) return;
    const release = parseEtapeDateFromId(el.id);
    if(!release) return;
    const unlockDate = new Date(release.getFullYear(), release.getMonth(), 5,0,0,0,0);
    const today = new Date();
    const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate(),0,0,0,0);
    if(todayMid < unlockDate){
      // Not yet unlocked — show locked message
      addLockedMessageToPage('🔒 Reviens le 5 du mois');
      return;
    }
    // unlocked by date — require password unless already authenticated
    if(isAuthStored()) return;
    await promptForPasswordAndVerify();
  }

  // Run on DOMContentLoaded
  document.addEventListener('DOMContentLoaded', ()=>{ runForEtape().catch(()=>{}); });

  // Also expose helpers for console/testing
  window.__rendezvousAuth = { isAuthStored, storeAuth, sha256Hex };

})();
