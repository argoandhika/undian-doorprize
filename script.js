// ─── Audio Engine (Web Audio API) ───────────────────────────────────────────
const audioCtx = (() => {
  try {
    return new (window.AudioContext || window.webkitAudioContext)();
  } catch {
    return null;
  }
})();

// Winner sound: file MP3 asli (primary), synth sebagai fallback
const winnerAudio = new Audio("./sounds/winner_sound.mp3");
winnerAudio.volume = 1.0;
let winnerAudioReady = true;
winnerAudio.addEventListener("error", () => { winnerAudioReady = false; }, { once: true });

let shuffleSoundInterval = null;
let shuffleAccentInterval = null;
let shuffleBassPulseInterval = null;

function resumeAudioCtx() {
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
}

// Generic tone helper
function playTone(freq, volume, duration, type = "sine", startDelay = 0) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime + startDelay);
  gain.gain.setValueAtTime(volume, audioCtx.currentTime + startDelay);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + startDelay + duration);
  osc.start(audioCtx.currentTime + startDelay);
  osc.stop(audioCtx.currentTime + startDelay + duration + 0.01);
}

// Kick drum: low sine with pitch drop
function playKick(startDelay = 0) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.type = "sine";
  osc.frequency.setValueAtTime(160, audioCtx.currentTime + startDelay);
  osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + startDelay + 0.15);
  gain.gain.setValueAtTime(0.9, audioCtx.currentTime + startDelay);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + startDelay + 0.22);
  osc.start(audioCtx.currentTime + startDelay);
  osc.stop(audioCtx.currentTime + startDelay + 0.25);
}

// Snare: noise burst through bandpass filter
function playSnare(startDelay = 0, volume = 0.35) {
  if (!audioCtx) return;
  const bufSize = Math.floor(audioCtx.sampleRate * 0.12);
  const buffer = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;
  const filter = audioCtx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 1200;
  filter.Q.value = 0.8;
  const gain = audioCtx.createGain();
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);
  gain.gain.setValueAtTime(volume, audioCtx.currentTime + startDelay);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + startDelay + 0.12);
  noise.start(audioCtx.currentTime + startDelay);
  noise.stop(audioCtx.currentTime + startDelay + 0.15);
}

// Hi-hat: short noise burst
function playHihat(startDelay = 0) {
  if (!audioCtx) return;
  const bufSize = Math.floor(audioCtx.sampleRate * 0.04);
  const buffer = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;
  const filter = audioCtx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 7000;
  const gain = audioCtx.createGain();
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);
  gain.gain.setValueAtTime(0.15, audioCtx.currentTime + startDelay);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + startDelay + 0.04);
  noise.start(audioCtx.currentTime + startDelay);
  noise.stop(audioCtx.currentTime + startDelay + 0.05);
}

// ── Shuffle sounds (layered slot machine effect) ──────────────────────────────
function playTick() {
  if (!audioCtx) return;
  const freq = 350 + Math.random() * 700;
  playTone(freq, 0.12, 0.045, "square");
  playHihat();
}

function playAccent() {
  if (!audioCtx) return;
  playTone(800 + Math.random() * 400, 0.18, 0.07, "sawtooth");
  playSnare(0, 0.12);
}

function playBassPulse() {
  if (!audioCtx) return;
  playTone(80 + Math.random() * 40, 0.2, 0.1, "sine");
}

function startShuffleSound() {
  if (!audioCtx) return;
  resumeAudioCtx();
  stopShuffleSound();
  shuffleSoundInterval = window.setInterval(playTick, 100);
  shuffleAccentInterval = window.setInterval(playAccent, 300);
  shuffleBassPulseInterval = window.setInterval(playBassPulse, 200);
}

function stopShuffleSound() {
  [shuffleSoundInterval, shuffleAccentInterval, shuffleBassPulseInterval].forEach((id) => {
    if (id !== null) clearInterval(id);
  });
  shuffleSoundInterval = null;
  shuffleAccentInterval = null;
  shuffleBassPulseInterval = null;
}

// ── BIG Winner Fanfare ────────────────────────────────────────────────────────
function playWinnerFanfare() {
  resumeAudioCtx();

  if (winnerAudioReady) {
    // Primary: putar file MP3 winner_sound.mp3
    winnerAudio.currentTime = 0;
    winnerAudio.play().catch(() => {
      winnerAudioReady = false;
      playSynthFanfare(); // fallback ke synth jika gagal
    });
    return;
  }

  playSynthFanfare();
}

function playSynthFanfare() {
  if (!audioCtx) return;
  resumeAudioCtx();

  // 1) Rapid drum roll (8 snares)
  for (let i = 0; i < 8; i++) {
    playSnare(i * 0.055, 0.28 + i * 0.02);
    playHihat(i * 0.055 + 0.027);
  }

  // 2) Kick punches on the beat
  [0.0, 0.45, 0.85].forEach((t) => playKick(t));

  // 3) Ascending fanfare melody (two-octave climb)
  const melody = [
    { freq: 392.00, start: 0.12, dur: 0.13 },  // G4
    { freq: 493.88, start: 0.25, dur: 0.13 },  // B4
    { freq: 587.33, start: 0.38, dur: 0.13 },  // D5
    { freq: 740.00, start: 0.51, dur: 0.13 },  // F#5
    { freq: 880.00, start: 0.64, dur: 0.18 },  // A5
    { freq: 1046.50, start: 0.82, dur: 0.20 }, // C6
    { freq: 1318.51, start: 1.02, dur: 0.25 }, // E6
    { freq: 1567.98, start: 1.27, dur: 0.55 }, // G6 — PEAK
  ];
  melody.forEach(({ freq, start, dur }) => {
    playTone(freq, 0.30, dur, "triangle", start);
    playTone(freq / 2, 0.12, dur + 0.05, "sine", start); // lower octave harmony
  });

  // 4) Big triumphant chord (C major — fortissimo)
  const chordStart = 1.55;
  [523.25, 659.25, 783.99, 1046.50, 1318.51].forEach((freq, i) => {
    playTone(freq, 0.28, 1.4, "triangle", chordStart + i * 0.025);
    playTone(freq * 2, 0.06, 1.0, "sine", chordStart + i * 0.025);
  });

  // 5) Sparkle high-frequency twinkles
  for (let i = 0; i < 14; i++) {
    const freq = 1800 + Math.random() * 2800;
    playTone(freq, 0.06 + Math.random() * 0.06, 0.08 + Math.random() * 0.25, "sine", 0.9 + Math.random() * 1.0);
  }

  // 6) Final kick + snare punches
  [1.50, 1.70, 1.90].forEach((t) => playKick(t));
  [1.60, 1.80].forEach((t) => playSnare(t, 0.5));

  // 7) Celebratory hi-hat roll after chord
  for (let i = 0; i < 8; i++) {
    playHihat(1.55 + i * 0.06);
  }
}
// ─────────────────────────────────────────────────────────────────────────────

const participantsInput = document.getElementById("participants");
const winnerCountInput = document.getElementById("winnerCount");
const drawButton = document.getElementById("drawButton");
const heroDrawButton = document.getElementById("heroDrawButton");
const stopButton = document.getElementById("stopButton");
const heroStopButton = document.getElementById("heroStopButton");
const resetButton = document.getElementById("resetButton");
const messageBox = document.getElementById("message");
const shuffleDisplay = document.getElementById("shuffleDisplay");
const statusBadge = document.getElementById("statusBadge");
const winnersTextarea = document.getElementById("winnersTextarea");
const copyWinnersButton = document.getElementById("copyWinnersButton");
const winnerList = document.getElementById("winnerList");
const historyList = document.getElementById("historyList");
const undoLastRoundButton = document.getElementById("undoLastRoundButton");
const totalParticipants = document.getElementById("totalParticipants");
const totalWinners = document.getElementById("totalWinners");
const remainingParticipants = document.getElementById("remainingParticipants");

const winnerGradients = [
  "linear-gradient(135deg, #8b5cf6, #ec4899)",
  "linear-gradient(135deg, #06b6d4, #3b82f6)",
  "linear-gradient(135deg, #f59e0b, #ef4444)",
  "linear-gradient(135deg, #22c55e, #14b8a6)",
  "linear-gradient(135deg, #6366f1, #a855f7)",
  "linear-gradient(135deg, #f43f5e, #fb7185)"
];

const state = {
  winners: [],
  rounds: [],
  isDrawing: false,
  shuffleTimerId: null,
  stopTimeoutId: null,
  currentPreview: [],
  previewCount: 1
};

const storageKey = "doorprize_state_v1";

function saveAppState() {
  const payload = {
    participantsText: participantsInput.value,
    winnerCount: winnerCountInput.value,
    winners: state.winners,
    rounds: state.rounds
  };

  window.localStorage.setItem(storageKey, JSON.stringify(payload));
}

function loadAppState() {
  const raw = window.localStorage.getItem(storageKey);
  if (!raw) {
    return;
  }

  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed.participantsText === "string") {
      participantsInput.value = parsed.participantsText;
    }
    if (typeof parsed.winnerCount === "string") {
      winnerCountInput.value = parsed.winnerCount;
    }
    if (Array.isArray(parsed.winners)) {
      state.winners = parsed.winners.filter((name) => typeof name === "string");
    }
    if (Array.isArray(parsed.rounds)) {
      state.rounds = parsed.rounds
        .filter((round) => Array.isArray(round))
        .map((round) => round.filter((name) => typeof name === "string"));
    }
  } catch {
    window.localStorage.removeItem(storageKey);
  }
}

function getParticipants() {
  const names = participantsInput.value
    .split("\n")
    .map((name) => name.trim())
    .filter(Boolean);

  return [...new Set(names)];
}

function getRemainingParticipants() {
  const participants = getParticipants();

  return participants.filter((participant) => !state.winners.includes(participant));
}

function getAllKnownParticipants() {
  const currentParticipants = getParticipants();
  return [...new Set([...currentParticipants, ...state.winners])];
}

function showMessage(text, type = "") {
  messageBox.textContent = text;
  messageBox.className = `message ${type}`.trim();
}

function renderWinnerList(winners) {
  if (!winners.length) {
    winnerList.innerHTML = '<li class="placeholder">Belum ada pemenang.</li>';
    return;
  }

  winnerList.innerHTML = winners
    .map((winner, index) => {
      const gradient = winnerGradients[index % winnerGradients.length];

      return `
        <li class="winner-card" style="background:${gradient}">
          <span class="winner-name">${winner}</span>
          <span class="winner-rank">Pemenang ${index + 1}</span>
        </li>
      `;
    })
    .join("");
}

function renderHistory() {
  if (!state.rounds.length) {
    historyList.innerHTML = '<li class="placeholder">Belum ada riwayat undian.</li>';
    undoLastRoundButton.style.display = "none";
    return;
  }

  historyList.innerHTML = [...state.rounds]
    .reverse()
    .map((round, index) => `<li>Ronde ${index + 1}: ${round.join(", ")}</li>`)
    .join("");
  undoLastRoundButton.style.display = "inline-flex";
}

function undoLastRound() {
  if (state.isDrawing || !state.rounds.length) return;

  // state.rounds[0] adalah ronde terakhir (unshift = newest first)
  const lastRound = state.rounds[0];
  state.rounds.shift();
  state.winners = state.winners.filter((name) => !lastRound.includes(name));

  // Kembalikan nama lastRound ke textarea peserta (gabung + deduplikasi)
  const currentParticipants = getParticipants();
  const restored = [...new Set([...currentParticipants, ...lastRound])];
  participantsInput.value = restored.join("\n");

  renderWinnerList(state.rounds[0] ?? []);
  renderHistory();
  renderWinnersTextarea();
  renderStats();

  const roundNum = state.rounds.length + 1;
  showMessage(`Ronde ${roundNum} dibatalkan. Nama dikembalikan ke peserta.`, "success");
  saveAppState();
}

function renderWinnersTextarea() {
  winnersTextarea.value = state.winners.length ? state.winners.join("\n") : "";
}

function renderStats() {
  const participants = getAllKnownParticipants();
  const remaining = getRemainingParticipants();

  totalParticipants.textContent = String(participants.length);
  totalWinners.textContent = String(state.winners.length);
  remainingParticipants.textContent = String(remaining.length);
}

function setShuffleDisplayLines(lines) {
  shuffleDisplay.replaceChildren();
  lines.forEach((line) => {
    const lineElement = document.createElement("div");
    lineElement.className = "shuffle-line";
    lineElement.textContent = line;
    shuffleDisplay.appendChild(lineElement);
  });
}

function setStageState(content, statusText = "Menunggu", isShuffling = false) {
  if (Array.isArray(content)) {
    setShuffleDisplayLines(content);
  } else {
    shuffleDisplay.textContent = content;
  }
  shuffleDisplay.classList.toggle("is-shuffling", isShuffling);
  shuffleDisplay.classList.toggle("is-multi", Array.isArray(content) && content.length > 1);
  shuffleDisplay.classList.toggle("is-compact", Array.isArray(content) && content.length >= 8);
  statusBadge.textContent = statusText;
  statusBadge.className = isShuffling ? "badge" : "badge badge-muted";
}

function shuffle(items) {
  const cloned = [...items];

  for (let index = cloned.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [cloned[index], cloned[randomIndex]] = [cloned[randomIndex], cloned[index]];
  }

  return cloned;
}

function setDrawButtonsDisabled(disabled) {
  drawButton.disabled = disabled;
  heroDrawButton.disabled = disabled;
}

function setStopButtonsDisabled(disabled) {
  stopButton.disabled = disabled;
  heroStopButton.disabled = disabled;
}

function syncParticipantsTextarea() {
  const participants = getParticipants();
  const remaining = participants.filter((participant) => !state.winners.includes(participant));
  participantsInput.value = remaining.join("\n");
}

function runShuffleAnimation(pool, previewCount, onComplete) {
  const shuffledPool = shuffle(pool);
  clearInterval(state.shuffleTimerId);
  clearTimeout(state.stopTimeoutId);
  state.stopTimeoutId = null;
  const safePreviewCount = Math.max(1, Math.min(previewCount, pool.length));
  const initialLines = Array.from({ length: safePreviewCount }, (_, index) =>
    index === 0 ? "Mengacak nama..." : "..."
  );
  setStageState(initialLines, "Mengacak", true);
  state.previewCount = safePreviewCount;
  state.currentPreview = [];

  startShuffleSound();
  state.shuffleTimerId = window.setInterval(() => {
    const previewBatch = shuffle(shuffledPool).slice(0, safePreviewCount);
    state.currentPreview = previewBatch;
    setStageState(previewBatch, "Mengacak", true);
  }, 120);
}

function finalizeDraw(winners) {
  stopShuffleSound();
  clearInterval(state.shuffleTimerId);
  clearTimeout(state.stopTimeoutId);
  state.shuffleTimerId = null;
  state.stopTimeoutId = null;

  state.winners.push(...winners);
  state.rounds.unshift(winners);

  syncParticipantsTextarea();
  renderWinnerList(winners);
  renderHistory();
  renderWinnersTextarea();
  renderStats();
  setStageState(winners, "Selesai", false);
  playWinnerFanfare();
  showMessage(`${winners.length} pemenang berhasil dipilih.`, "success");
  state.isDrawing = false;
  setDrawButtonsDisabled(false);
  setStopButtonsDisabled(true);
  saveAppState();
}

function stopAndFinalize() {
  if (!state.isDrawing) {
    return;
  }

  const winners = Array.isArray(state.currentPreview) && state.currentPreview.length
    ? state.currentPreview.slice(0, state.previewCount)
    : [];

  if (!winners.length) {
    showMessage("Belum ada nama yang diacak.", "error");
    return;
  }

  finalizeDraw(winners);
}

function drawWinners() {
  const participants = getParticipants();
  const remaining = getRemainingParticipants();
  const requestedWinnerCount = Number.parseInt(winnerCountInput.value, 10);

  if (state.isDrawing) {
    return;
  }

  if (!participants.length) {
    showMessage("Masukkan minimal satu peserta terlebih dahulu.", "error");
    renderStats();
    return;
  }

  if (!Number.isInteger(requestedWinnerCount) || requestedWinnerCount < 1) {
    showMessage("Jumlah pemenang harus berupa angka minimal 1.", "error");
    return;
  }

  if (!remaining.length) {
    showMessage("Semua peserta sudah pernah menang. Silakan reset hasil dulu.", "error");
    renderWinnerList([]);
    renderStats();
    return;
  }

  if (requestedWinnerCount > remaining.length) {
    showMessage(`Sisa peserta hanya ${remaining.length} orang.`, "error");
    return;
  }

  const previewCount = Math.min(requestedWinnerCount, remaining.length);
  state.isDrawing = true;
  state.currentPreview = [];
  setDrawButtonsDisabled(true);
  setStopButtonsDisabled(false);
  showMessage("Sedang mengacak nama peserta...", "success");
  runShuffleAnimation(remaining, previewCount, stopAndFinalize);
}

function resetResults() {
  const allParticipants = getAllKnownParticipants();
  stopShuffleSound();
  clearInterval(state.shuffleTimerId);
  clearTimeout(state.stopTimeoutId);
  state.shuffleTimerId = null;
  state.stopTimeoutId = null;
  state.currentPreview = [];
  state.winners = [];
  state.rounds = [];
  state.isDrawing = false;
  setDrawButtonsDisabled(false);
  setStopButtonsDisabled(true);
  participantsInput.value = allParticipants.join("\n");
  renderWinnerList([]);
  renderHistory();
  renderWinnersTextarea();
  renderStats();
  setStageState("Siap untuk mulai undian", "Menunggu", false);
  showMessage("Hasil undian sudah direset.", "success");
  saveAppState();
}

drawButton.addEventListener("click", drawWinners);
heroDrawButton.addEventListener("click", drawWinners);
stopButton.addEventListener("click", stopAndFinalize);
heroStopButton.addEventListener("click", stopAndFinalize);
resetButton.addEventListener("click", resetResults);
undoLastRoundButton.addEventListener("click", undoLastRound);
participantsInput.addEventListener("input", () => {
  renderStats();
  saveAppState();
});
winnerCountInput.addEventListener("input", saveAppState);

copyWinnersButton.addEventListener("click", async () => {
  const textToCopy = winnersTextarea.value.trim();
  if (!textToCopy) {
    showMessage("Belum ada pemenang untuk dicopy.", "error");
    return;
  }

  try {
    await navigator.clipboard.writeText(textToCopy);
    showMessage("Daftar pemenang berhasil dicopy.", "success");
  } catch {
    winnersTextarea.focus();
    winnersTextarea.select();
    document.execCommand("copy");
    showMessage("Daftar pemenang berhasil dicopy.", "success");
  }
});

loadAppState();
renderHistory();
renderWinnersTextarea();
renderWinnerList(state.rounds[0] ?? []);
renderStats();
setStageState(state.rounds[0]?.length ? state.rounds[0] : "Siap untuk mulai undian", state.rounds[0]?.length ? "Selesai" : "Menunggu", false);
setStopButtonsDisabled(true);
