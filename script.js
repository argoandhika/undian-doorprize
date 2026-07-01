const participantsInput = document.getElementById("participants");
const winnerCountInput = document.getElementById("winnerCount");
const drawButton = document.getElementById("drawButton");
const heroDrawButton = document.getElementById("heroDrawButton");
const resetButton = document.getElementById("resetButton");
const messageBox = document.getElementById("message");
const shuffleDisplay = document.getElementById("shuffleDisplay");
const statusBadge = document.getElementById("statusBadge");
const winnersTextarea = document.getElementById("winnersTextarea");
const copyWinnersButton = document.getElementById("copyWinnersButton");
const winnerList = document.getElementById("winnerList");
const historyList = document.getElementById("historyList");
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
  shuffleTimerId: null
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
    return;
  }

  historyList.innerHTML = state.rounds
    .map((round, index) => `<li>Ronde ${index + 1}: ${round.join(", ")}</li>`)
    .join("");
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

function syncParticipantsTextarea() {
  const participants = getParticipants();
  const remaining = participants.filter((participant) => !state.winners.includes(participant));
  participantsInput.value = remaining.join("\n");
}

function runShuffleAnimation(pool, previewCount, onComplete) {
  const shuffledPool = shuffle(pool);
  let step = 0;
  const maxSteps = 18;

  clearInterval(state.shuffleTimerId);
  const safePreviewCount = Math.max(1, Math.min(previewCount, pool.length));
  const initialLines = Array.from({ length: safePreviewCount }, (_, index) =>
    index === 0 ? "Mengacak nama..." : "..."
  );
  setStageState(initialLines, "Mengacak", true);

  state.shuffleTimerId = window.setInterval(() => {
    const previewBatch = shuffle(shuffledPool).slice(0, safePreviewCount);
    setStageState(previewBatch, "Mengacak", true);
    step += 1;

    if (step >= maxSteps) {
      clearInterval(state.shuffleTimerId);
      state.shuffleTimerId = null;
      onComplete();
    }
  }, 120);
}

function finalizeDraw(winners) {
  state.winners.push(...winners);
  state.rounds.unshift(winners);

  syncParticipantsTextarea();
  renderWinnerList(winners);
  renderHistory();
  renderWinnersTextarea();
  renderStats();
  setStageState(winners, "Selesai", false);
  showMessage(`${winners.length} pemenang berhasil dipilih.`, "success");
  state.isDrawing = false;
  setDrawButtonsDisabled(false);
  saveAppState();
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

  const winners = shuffle(remaining).slice(0, requestedWinnerCount);
  const previewCount = Math.min(requestedWinnerCount, remaining.length);
  state.isDrawing = true;
  setDrawButtonsDisabled(true);
  showMessage("Sedang mengacak nama peserta...", "success");
  runShuffleAnimation(remaining, previewCount, () => finalizeDraw(winners));
}

function resetResults() {
  const allParticipants = getAllKnownParticipants();
  clearInterval(state.shuffleTimerId);
  state.shuffleTimerId = null;
  state.winners = [];
  state.rounds = [];
  state.isDrawing = false;
  setDrawButtonsDisabled(false);
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
resetButton.addEventListener("click", resetResults);
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
