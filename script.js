// ─── Doorprize — Hardened Edition v2 ─────────────────────────────────────────
// Security architecture:
//   IIFE         → blocks all global scope access (V-01, V-04)
//   Split storage → participants in localStorage (not sensitive),
//                   winners/rounds in sessionStorage (sensitive, per-tab session)
//   Session HMAC  → signing key is random per browser-session, stored in
//                   sessionStorage — attacker must know secret + algorithm to
//                   forge a valid signature (V-02 hardened)
//   Strict sig    → unsigned data is ALWAYS rejected (no legacy bypass)
//   Pool lock     → winners validated against frozen pool (V-03)
//   Input lock    → form disabled during draw (V-05)
// ─────────────────────────────────────────────────────────────────────────────
;(function () {
  'use strict';

  // ─── Audio Engine ──────────────────────────────────────────────────────────
  const audioCtx = (() => {
    try { return new (window.AudioContext || window.webkitAudioContext)(); }
    catch { return null; }
  })();

  const winnerAudio = new Audio('./sounds/winner_sound.mp3');
  winnerAudio.volume = 1.0;
  let winnerAudioReady = true;
  winnerAudio.addEventListener('error', () => { winnerAudioReady = false; }, { once: true });

  let shuffleSoundInterval = null;
  let shuffleAccentInterval = null;
  let shuffleBassPulseInterval = null;

  function resumeAudioCtx() {
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  }
  function playTone(freq, volume, duration, type = 'sine', startDelay = 0) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime + startDelay);
    gain.gain.setValueAtTime(volume, audioCtx.currentTime + startDelay);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + startDelay + duration);
    osc.start(audioCtx.currentTime + startDelay);
    osc.stop(audioCtx.currentTime + startDelay + duration + 0.01);
  }
  function playKick(d = 0) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination); osc.type = 'sine';
    osc.frequency.setValueAtTime(160, audioCtx.currentTime + d);
    osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + d + 0.15);
    gain.gain.setValueAtTime(0.9, audioCtx.currentTime + d);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + d + 0.22);
    osc.start(audioCtx.currentTime + d); osc.stop(audioCtx.currentTime + d + 0.25);
  }
  function playSnare(d = 0, vol = 0.35) {
    if (!audioCtx) return;
    const sz = Math.floor(audioCtx.sampleRate * 0.12);
    const buf = audioCtx.createBuffer(1, sz, audioCtx.sampleRate);
    const dat = buf.getChannelData(0);
    for (let i = 0; i < sz; i++) dat[i] = Math.random() * 2 - 1;
    const ns = audioCtx.createBufferSource(); ns.buffer = buf;
    const f = audioCtx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1200; f.Q.value = 0.8;
    const g = audioCtx.createGain();
    ns.connect(f); f.connect(g); g.connect(audioCtx.destination);
    g.gain.setValueAtTime(vol, audioCtx.currentTime + d);
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + d + 0.12);
    ns.start(audioCtx.currentTime + d); ns.stop(audioCtx.currentTime + d + 0.15);
  }
  function playHihat(d = 0) {
    if (!audioCtx) return;
    const sz = Math.floor(audioCtx.sampleRate * 0.04);
    const buf = audioCtx.createBuffer(1, sz, audioCtx.sampleRate);
    const dat = buf.getChannelData(0);
    for (let i = 0; i < sz; i++) dat[i] = Math.random() * 2 - 1;
    const ns = audioCtx.createBufferSource(); ns.buffer = buf;
    const f = audioCtx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
    const g = audioCtx.createGain();
    ns.connect(f); f.connect(g); g.connect(audioCtx.destination);
    g.gain.setValueAtTime(0.15, audioCtx.currentTime + d);
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + d + 0.04);
    ns.start(audioCtx.currentTime + d); ns.stop(audioCtx.currentTime + d + 0.05);
  }
  function playTick() { if (!audioCtx) return; playTone(350 + Math.random()*700, 0.12, 0.045, 'square'); playHihat(); }
  function playAccent() { if (!audioCtx) return; playTone(800 + Math.random()*400, 0.18, 0.07, 'sawtooth'); playSnare(0, 0.12); }
  function playBassPulse() { if (!audioCtx) return; playTone(80 + Math.random()*40, 0.2, 0.1, 'sine'); }
  function startShuffleSound() {
    if (!audioCtx) return; resumeAudioCtx(); stopShuffleSound();
    shuffleSoundInterval = window.setInterval(playTick, 100);
    shuffleAccentInterval = window.setInterval(playAccent, 300);
    shuffleBassPulseInterval = window.setInterval(playBassPulse, 200);
  }
  function stopShuffleSound() {
    [shuffleSoundInterval, shuffleAccentInterval, shuffleBassPulseInterval].forEach(id => { if (id !== null) clearInterval(id); });
    shuffleSoundInterval = shuffleAccentInterval = shuffleBassPulseInterval = null;
  }
  function playWinnerFanfare() {
    resumeAudioCtx();
    if (winnerAudioReady) {
      winnerAudio.currentTime = 0;
      winnerAudio.play().catch(() => { winnerAudioReady = false; playSynthFanfare(); }); return;
    }
    playSynthFanfare();
  }
  function playSynthFanfare() {
    if (!audioCtx) return; resumeAudioCtx();
    for (let i = 0; i < 8; i++) { playSnare(i*0.055, 0.28+i*0.02); playHihat(i*0.055+0.027); }
    [0.0, 0.45, 0.85].forEach(t => playKick(t));
    [{freq:392,start:.12,dur:.13},{freq:493.88,start:.25,dur:.13},{freq:587.33,start:.38,dur:.13},
     {freq:740,start:.51,dur:.13},{freq:880,start:.64,dur:.18},{freq:1046.5,start:.82,dur:.20},
     {freq:1318.51,start:1.02,dur:.25},{freq:1567.98,start:1.27,dur:.55}].forEach(({freq,start,dur}) => {
      playTone(freq, .30, dur, 'triangle', start); playTone(freq/2, .12, dur+.05, 'sine', start);
    });
    const cs = 1.55;
    [523.25,659.25,783.99,1046.5,1318.51].forEach((f,i) => {
      playTone(f, .28, 1.4, 'triangle', cs+i*.025); playTone(f*2, .06, 1.0, 'sine', cs+i*.025);
    });
    for (let i=0;i<14;i++) playTone(1800+Math.random()*2800, .06+Math.random()*.06, .08+Math.random()*.25, 'sine', .9+Math.random()*1.0);
    [1.5,1.7,1.9].forEach(t => playKick(t)); [1.6,1.8].forEach(t => playSnare(t,.5));
    for (let i=0;i<8;i++) playHihat(1.55+i*.06);
  }

  // ─── FNV-1a hash ──────────────────────────────────────────────────────────
  function fnv1a(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = (h * 0x01000193) >>> 0; }
    return h.toString(16);
  }

  // ─── Session-bound signing (V-02 hardened) ────────────────────────────────
  // Secret is random per browser session, stored in sessionStorage (not localStorage).
  // Attacker must find the secret AND know the algorithm to forge a valid signature.
  // sessionStorage clears when the tab/browser is closed — results are session-scoped.
  const _SK = '_dp_x7k'; // obscured key name
  let _sessionSecret = sessionStorage.getItem(_SK);
  if (!_sessionSecret) {
    _sessionSecret = Array.from(crypto.getRandomValues(new Uint8Array(24)))
      .map(b => b.toString(16).padStart(2, '0')).join('');
    sessionStorage.setItem(_SK, _sessionSecret);
  }

  function signData(data) {
    // Signature binds data to session secret — not reproducible without the secret
    return fnv1a(JSON.stringify(data) + '\u0000' + _sessionSecret);
  }

  // ─── Storage keys ─────────────────────────────────────────────────────────
  // Participants (not sensitive) → localStorage  — persists across sessions
  // Results (sensitive)          → sessionStorage — cleared when tab closes
  const P_KEY = 'doorprize_p_v1';   // participants + winnerCount
  const R_KEY = 'doorprize_r_v1';   // winners + rounds (signed)

  function saveAppState() {
    // Save participants to localStorage (non-sensitive, convenience)
    const pData = { t: participantsInput.value, c: winnerCountInput.value };
    localStorage.setItem(P_KEY, JSON.stringify(pData));

    // Save results to sessionStorage with session-bound signature
    const rData = { w: state.winners, r: state.rounds };
    const sig   = signData(rData);
    sessionStorage.setItem(R_KEY, JSON.stringify({ d: rData, s: sig }));
  }

  function loadAppState() {
    // Load participants (no signature needed — not sensitive)
    try {
      const pRaw = localStorage.getItem(P_KEY);
      if (pRaw) {
        const p = JSON.parse(pRaw);
        if (typeof p.t === 'string') participantsInput.value = p.t;
        if (typeof p.c === 'string') winnerCountInput.value  = p.c;
      }
    } catch { localStorage.removeItem(P_KEY); }

    // Load results from sessionStorage — STRICT signature required
    try {
      const rRaw = sessionStorage.getItem(R_KEY);
      if (!rRaw) return; // no results yet — clean start

      const outer = JSON.parse(rRaw);

      // Strict: both 'd' and 's' must exist
      if (!outer || typeof outer.s !== 'string' || typeof outer.d !== 'object') {
        sessionStorage.removeItem(R_KEY);
        showMessage('\u26a0\ufe0f Hasil undian tidak valid dan telah dihapus.', 'error');
        return;
      }

      // Verify session-bound signature
      const expectedSig = signData(outer.d);
      if (outer.s !== expectedSig) {
        sessionStorage.removeItem(R_KEY);
        showMessage('\u26a0\ufe0f Data hasil terdeteksi telah dimodifikasi. Sesi direset.', 'error');
        return;
      }

      // Signature OK — load results
      if (Array.isArray(outer.d.w)) state.winners = outer.d.w.filter(n => typeof n === 'string');
      if (Array.isArray(outer.d.r)) {
        state.rounds = outer.d.r
          .filter(r => Array.isArray(r))
          .map(r => r.filter(n => typeof n === 'string'));
      }
    } catch {
      sessionStorage.removeItem(R_KEY);
    }

    // Legacy localStorage cleanup (migrate old format if present)
    const legacyKey = 'doorprize_state_v1';
    if (localStorage.getItem(legacyKey)) localStorage.removeItem(legacyKey);
  }

  // ─── DOM refs ──────────────────────────────────────────────────────────────
  const participantsInput     = document.getElementById('participants');
  const winnerCountInput      = document.getElementById('winnerCount');
  const drawButton            = document.getElementById('drawButton');
  const heroDrawButton        = document.getElementById('heroDrawButton');
  const stopButton            = document.getElementById('stopButton');
  const heroStopButton        = document.getElementById('heroStopButton');
  const resetButton           = document.getElementById('resetButton');
  const messageBox            = document.getElementById('message');
  const shuffleDisplay        = document.getElementById('shuffleDisplay');
  const statusBadge           = document.getElementById('statusBadge');
  const winnersTextarea       = document.getElementById('winnersTextarea');
  const copyWinnersButton     = document.getElementById('copyWinnersButton');
  const winnerList            = document.getElementById('winnerList');
  const historyList           = document.getElementById('historyList');
  const undoLastRoundButton   = document.getElementById('undoLastRoundButton');
  const totalParticipants     = document.getElementById('totalParticipants');
  const totalWinners          = document.getElementById('totalWinners');
  const remainingParticipants = document.getElementById('remainingParticipants');

  const winnerGradients = [
    'linear-gradient(135deg,#8b5cf6,#ec4899)',
    'linear-gradient(135deg,#06b6d4,#3b82f6)',
    'linear-gradient(135deg,#f59e0b,#ef4444)',
    'linear-gradient(135deg,#22c55e,#14b8a6)',
    'linear-gradient(135deg,#6366f1,#a855f7)',
    'linear-gradient(135deg,#f43f5e,#fb7185)',
  ];

  // ─── Private state (inside IIFE — not accessible from console) ────────────
  const state = {
    winners: [], rounds: [], isDrawing: false,
    shuffleTimerId: null, stopTimeoutId: null,
    currentPreview: [], previewCount: 1,
    _authorizedPool: new Set(),
  };

  // ─── Participant helpers ────────────────────────────────────────────────────
  function getParticipants() {
    return [...new Set(participantsInput.value.split('\n').map(n => n.trim()).filter(Boolean))];
  }
  function getRemainingParticipants() {
    return getParticipants().filter(p => !state.winners.includes(p));
  }
  function getAllKnownParticipants() {
    return [...new Set([...getParticipants(), ...state.winners])];
  }

  // ─── UI helpers ────────────────────────────────────────────────────────────
  function showMessage(text, type = '') {
    messageBox.textContent = text;
    messageBox.className   = ('message ' + type).trim();
  }
  function renderWinnerList(winners) {
    if (!winners.length) { winnerList.innerHTML = '<li class="placeholder">Belum ada pemenang.</li>'; return; }
    winnerList.innerHTML = winners.map((w, i) =>
      '<li class="winner-card" style="background:' + winnerGradients[i % winnerGradients.length] + '">' +
      '<span class="winner-name">' + w + '</span>' +
      '<span class="winner-rank">Pemenang ' + (i+1) + '</span></li>'
    ).join('');
  }
  function renderHistory() {
    if (!state.rounds.length) {
      historyList.innerHTML = '<li class="placeholder">Belum ada riwayat undian.</li>';
      undoLastRoundButton.style.display = 'none'; return;
    }
    historyList.innerHTML = [...state.rounds].reverse()
      .map((r, i) => '<li>Ronde ' + (i+1) + ': ' + r.join(', ') + '</li>').join('');
    undoLastRoundButton.style.display = 'inline-flex';
  }
  function undoLastRound() {
    if (state.isDrawing || !state.rounds.length) return;
    const last = state.rounds[0];
    state.rounds.shift();
    state.winners = state.winners.filter(n => !last.includes(n));
    participantsInput.value = [...new Set([...getParticipants(), ...last])].join('\n');
    renderWinnerList(state.rounds[0] ?? []);
    renderHistory(); renderWinnersTextarea(); renderStats();
    showMessage('Ronde ' + (state.rounds.length+1) + ' dibatalkan. Nama dikembalikan ke peserta.', 'success');
    saveAppState();
  }
  function renderWinnersTextarea() { winnersTextarea.value = state.winners.length ? state.winners.join('\n') : ''; }
  function renderStats() {
    const all = getAllKnownParticipants(), rem = getRemainingParticipants();
    totalParticipants.textContent = String(all.length);
    totalWinners.textContent      = String(state.winners.length);
    remainingParticipants.textContent = String(rem.length);
  }
  function setShuffleDisplayLines(lines) {
    shuffleDisplay.replaceChildren();
    lines.forEach(line => { const el = document.createElement('div'); el.className = 'shuffle-line'; el.textContent = line; shuffleDisplay.appendChild(el); });
  }
  function setStageState(content, statusText = 'Menunggu', isShuffling = false) {
    if (Array.isArray(content)) setShuffleDisplayLines(content);
    else shuffleDisplay.textContent = content;
    shuffleDisplay.classList.toggle('is-shuffling', isShuffling);
    shuffleDisplay.classList.toggle('is-multi',   Array.isArray(content) && content.length > 1);
    shuffleDisplay.classList.toggle('is-compact', Array.isArray(content) && content.length >= 8);
    statusBadge.textContent = statusText;
    statusBadge.className   = isShuffling ? 'badge' : 'badge badge-muted';
  }
  function setInputsLocked(locked) {
    participantsInput.disabled = locked; winnerCountInput.disabled = locked;
    const dec = document.getElementById('decrementBtn'), inc = document.getElementById('incrementBtn');
    if (dec) dec.disabled = locked; if (inc) inc.disabled = locked;
  }

  // ─── Fisher-Yates shuffle (private) ───────────────────────────────────────
  function shuffle(items) {
    const c = [...items];
    for (let i = c.length-1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i+1));
      [c[i], c[j]] = [c[j], c[i]];
    }
    return c;
  }

  function setDrawButtonsDisabled(d) { drawButton.disabled = d; heroDrawButton.disabled = d; }
  function setStopButtonsDisabled(d) { stopButton.disabled = d; heroStopButton.disabled = d; }
  function syncParticipantsTextarea() { participantsInput.value = getRemainingParticipants().join('\n'); }

  // ─── Draw logic ─────────────────────────────────────────────────────────────
  function runShuffleAnimation(pool, previewCount) {
    const shuffledPool = shuffle(pool);
    clearInterval(state.shuffleTimerId); clearTimeout(state.stopTimeoutId); state.stopTimeoutId = null;
    const safe = Math.max(1, Math.min(previewCount, pool.length));
    setStageState(Array.from({length: safe}, (_, i) => i===0 ? 'Mengacak nama...' : '...'), 'Mengacak', true);
    state.previewCount = safe; state.currentPreview = [];
    startShuffleSound();
    state.shuffleTimerId = window.setInterval(() => {
      const batch = shuffle(shuffledPool).slice(0, safe);
      state.currentPreview = batch; setStageState(batch, 'Mengacak', true);
    }, 120);
  }

  function finalizeDraw(winners) {
    stopShuffleSound(); clearInterval(state.shuffleTimerId); clearTimeout(state.stopTimeoutId);
    state.shuffleTimerId = state.stopTimeoutId = null;
    state.winners.push(...winners); state.rounds.unshift(winners);
    syncParticipantsTextarea(); renderWinnerList(winners); renderHistory(); renderWinnersTextarea(); renderStats();
    setStageState(winners, 'Selesai', false); playWinnerFanfare();
    showMessage(winners.length + ' pemenang berhasil dipilih.', 'success');
    state.isDrawing = false; state._authorizedPool.clear();
    setDrawButtonsDisabled(false); setStopButtonsDisabled(true); setInputsLocked(false);
    saveAppState();
  }

  function stopAndFinalize() {
    if (!state.isDrawing) return;
    const raw = Array.isArray(state.currentPreview) ? [...state.currentPreview] : [];
    state.currentPreview = []; // clear immediately
    const winners = raw.slice(0, state.previewCount).filter(n => state._authorizedPool.has(n));
    if (!winners.length) { showMessage('Belum ada nama yang diacak.', 'error'); return; }
    finalizeDraw(winners);
  }

  function drawWinners() {
    const participants = getParticipants(), remaining = getRemainingParticipants();
    const cnt = Number.parseInt(winnerCountInput.value, 10);
    if (state.isDrawing) return;
    if (!participants.length) { showMessage('Masukkan minimal satu peserta terlebih dahulu.', 'error'); renderStats(); return; }
    if (!Number.isInteger(cnt) || cnt < 1) { showMessage('Jumlah pemenang harus berupa angka minimal 1.', 'error'); return; }
    if (!remaining.length) { showMessage('Semua peserta sudah pernah menang. Silakan reset hasil dulu.', 'error'); renderWinnerList([]); renderStats(); return; }
    if (cnt > remaining.length) { showMessage('Sisa peserta hanya ' + remaining.length + ' orang.', 'error'); return; }
    state._authorizedPool = new Set(remaining);
    state.isDrawing = true; state.currentPreview = [];
    setDrawButtonsDisabled(true); setStopButtonsDisabled(false); setInputsLocked(true);
    showMessage('Sedang mengacak nama peserta...', 'success');
    runShuffleAnimation(remaining, Math.min(cnt, remaining.length));
  }

  function resetResults() {
    const all = getAllKnownParticipants();
    stopShuffleSound(); clearInterval(state.shuffleTimerId); clearTimeout(state.stopTimeoutId);
    state.shuffleTimerId = state.stopTimeoutId = null; state.currentPreview = [];
    state._authorizedPool = new Set(); state.winners = []; state.rounds = []; state.isDrawing = false;
    setDrawButtonsDisabled(false); setStopButtonsDisabled(true); setInputsLocked(false);
    participantsInput.value = all.join('\n');
    renderWinnerList([]); renderHistory(); renderWinnersTextarea(); renderStats();
    setStageState('Siap untuk mulai undian', 'Menunggu', false);
    showMessage('Hasil undian sudah direset.', 'success'); saveAppState();
  }

  // ─── Event listeners ──────────────────────────────────────────────────────
  drawButton.addEventListener('click',          drawWinners);
  heroDrawButton.addEventListener('click',      drawWinners);
  stopButton.addEventListener('click',          stopAndFinalize);
  heroStopButton.addEventListener('click',      stopAndFinalize);
  resetButton.addEventListener('click',         resetResults);
  undoLastRoundButton.addEventListener('click', undoLastRound);
  participantsInput.addEventListener('input',   () => { renderStats(); saveAppState(); });
  winnerCountInput.addEventListener('input',    saveAppState);

  // Spasi = toggle undian (Mulai jika idle, Stop jika berjalan)
  document.addEventListener('keydown', (e) => {
    if (e.code !== 'Space') return;
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON') return;
    e.preventDefault(); // cegah scroll halaman
    if (state.isDrawing) { stopAndFinalize(); } else { drawWinners(); }
  });

  copyWinnersButton.addEventListener('click', async () => {
    const txt = winnersTextarea.value.trim();
    if (!txt) { showMessage('Belum ada pemenang untuk dicopy.', 'error'); return; }
    try { await navigator.clipboard.writeText(txt); showMessage('Daftar pemenang berhasil dicopy.', 'success'); }
    catch { winnersTextarea.focus(); winnersTextarea.select(); document.execCommand('copy'); showMessage('Daftar pemenang berhasil dicopy.', 'success'); }
  });

  // ─── Init ──────────────────────────────────────────────────────────────────
  loadAppState();
  renderHistory(); renderWinnersTextarea(); renderWinnerList(state.rounds[0] ?? []); renderStats();
  setStageState(
    state.rounds[0]?.length ? state.rounds[0] : 'Siap untuk mulai undian',
    state.rounds[0]?.length ? 'Selesai' : 'Menunggu', false
  );
  setStopButtonsDisabled(true);

})(); // end IIFE
