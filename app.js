import {
  SAVE_KEY,
  UPGRADE_CONFIG,
  applyOfflineProgress,
  buyUpgrade,
  createDefaultState,
  formatDuration,
  getAutoRate,
  getManualRate,
  getUpgradeCost,
  getUpgradeLevel,
  normalizeState,
} from "./game.js?v=firefox-20260915";

const STREAM_TEMPLATES = Object.freeze([
  "ssh ghost@10.13.37.4 -p 443",
  "const phantom = await bypassFirewall();",
  "chmod +x /tmp/phantomagic",
  "node -e \"routePackets().then(ghost)\"",
  "decrypt --layer=07 --seed=0x7F3A",
  "nmap -sS --min-rate 9000 172.16.0.0/16",
  "for (;;) { listen(); learn(); }",
  "const route = packets.filter(Boolean).at(-1);",
  "export PATH=/tmp/phantom:$PATH",
  "while read packet; do echo \"$packet\"; done",
  "async function ghostRoute() { return await hop(); }",
  "npm run deploy -- --stealth",
]);

const HEX = "0123456789ABCDEF";
const MAX_TERMINAL_LINES = 64;
const MAX_EVENTS = 8;
const MAX_NOTE_BUFFER = 96;
const ACTIVE_INPUT_WINDOW = 650;
const MANUAL_DECAY_DELAY = 1100;
const MANUAL_DECAY_RATE = 0.12;

const elements = {
  appShell: document.querySelector("#appShell"),
  hacksCount: document.querySelector("#hacksCount"),
  totalHacksCount: document.querySelector("#totalHacksCount"),
  hacksPerSecond: document.querySelector("#hacksPerSecond"),
  sessionTimer: document.querySelector("#sessionTimer"),
  inputState: document.querySelector("#inputState"),
  clockReadout: document.querySelector("#clockReadout"),
  manualCore: document.querySelector("#manualCore"),
  manualFill: document.querySelector("#manualFill"),
  manualPercent: document.querySelector("#manualPercent"),
  manualNodeState: document.querySelector("#manualNodeState"),
  manualCycleText: document.querySelector("#manualCycleText"),
  autoNode: document.querySelector("#autoNode"),
  autoFill: document.querySelector("#autoFill"),
  autoPercent: document.querySelector("#autoPercent"),
  autoNodeState: document.querySelector("#autoNodeState"),
  autoNodeDetail: document.querySelector("#autoNodeDetail"),
  autoCycleText: document.querySelector("#autoCycleText"),
  terminalScreen: document.querySelector("#terminalScreen"),
  noteBuffer: document.querySelector("#noteBuffer"),
  noteBufferCount: document.querySelector("#noteBufferCount"),
  eventLog: document.querySelector("#eventLog"),
  upgradeCount: document.querySelector("#upgradeCount"),
  saveStatus: document.querySelector("#saveStatus"),
  toast: document.querySelector("#toast"),
  resetButton: document.querySelector("#resetButton"),
};

const upgradeElements = {
  amplifier: {
    button: document.querySelector('[data-upgrade="amplifier"]'),
    level: document.querySelector("#amplifierLevel"),
    effect: document.querySelector("#amplifierEffect"),
    cost: document.querySelector("#amplifierCost"),
  },
  autohacker: {
    button: document.querySelector('[data-upgrade="autohacker"]'),
    level: document.querySelector("#autohackerLevel"),
    effect: document.querySelector("#autohackerEffect"),
    cost: document.querySelector("#autohackerCost"),
  },
};

let state = loadState();
let lastFrame = performance.now();
let lastInputAt = 0;
let noteBuffer = "";
let noteBufferLine = "";
let lastTemplateIndex = -1;
let toastTimeout;

function loadState() {
  const now = Date.now();
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return createDefaultState(now);
    const restored = normalizeState(JSON.parse(raw), now);
    const elapsedSeconds = Math.max(0, (now - restored.lastSavedAt) / 1000);
    const withOfflineProgress = applyOfflineProgress(restored, elapsedSeconds);

    if (withOfflineProgress.offlineGain > 0) {
      window.setTimeout(() => {
        addEvent(`offline link recovered :: +${withOfflineProgress.offlineGain} hacks`);
        showToast(`OFFLINE BUFFER FLUSHED // +${withOfflineProgress.offlineGain} HACKS`);
      }, 120);
    }

    return withOfflineProgress;
  } catch {
    return createDefaultState(now);
  }
}

function saveState() {
  state.lastSavedAt = Date.now();
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    elements.saveStatus.textContent = `STATE SYNCED ${new Date(state.lastSavedAt).toLocaleTimeString([], { hour12: false })}`;
  } catch {
    elements.saveStatus.textContent = "LOCAL SAVE UNAVAILABLE";
  }
}

function resetState() {
  state = createDefaultState(Date.now());
  lastInputAt = 0;
  noteBuffer = "";
  noteBufferLine = "";
  lastTemplateIndex = -1;
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // Local storage can be blocked in private browsing; the session still resets.
  }
  clearTerminal();
  updateNoteBuffer();
  appendTerminal("output", "session reset :: global keyboard feed standing by");
  addEvent("local session reset");
  showToast("SESSION RESET // SIGNAL CLEAN");
  updateView(performance.now());
  saveState();
}

function formatHacks(value) {
  return String(Math.max(0, Math.floor(value))).padStart(6, "0");
}

function formatSystemClock(date = new Date()) {
  return date.toLocaleTimeString([], { hour12: false });
}

function randomHex(length = 4) {
  return Array.from({ length }, () => HEX[Math.floor(Math.random() * HEX.length)]).join("");
}

function fakeLineFromInput() {
  let templateIndex = Math.floor(Math.random() * STREAM_TEMPLATES.length);
  if (templateIndex === lastTemplateIndex) templateIndex = (templateIndex + 1) % STREAM_TEMPLATES.length;
  lastTemplateIndex = templateIndex;
  const template = STREAM_TEMPLATES[templateIndex];
  return template.replace(/0x7F3A|0x[0-9A-F]+/i, `0x${randomHex(4)}`);
}

function updateNoteBuffer(line = null) {
  if (line !== null) noteBufferLine = line;
  elements.noteBuffer.textContent = noteBufferLine || "awaiting global input...";
  elements.noteBufferCount.textContent = `${String(noteBuffer.length).padStart(2, "0")}/${MAX_NOTE_BUFFER}`;
}

function updateNoteBufferWithKey(key) {
  if (key === "Backspace" || key === "Delete") {
    noteBuffer = noteBuffer.slice(0, -1);
  } else if (key.length === 1) {
    noteBuffer += key;
  }

  if (noteBuffer.length > MAX_NOTE_BUFFER) {
    noteBuffer = noteBuffer.slice(-MAX_NOTE_BUFFER);
  }
  updateNoteBuffer();
}

function appendTerminal(kind, text) {
  const line = document.createElement("div");
  line.className = `terminal-line ${kind}`;

  const timestamp = document.createElement("span");
  timestamp.className = "terminal-time";
  timestamp.textContent = formatSystemClock();

  const message = document.createElement("span");
  message.textContent = text;

  line.append(timestamp, message);
  elements.terminalScreen.append(line);

  while (elements.terminalScreen.children.length > MAX_TERMINAL_LINES) {
    elements.terminalScreen.firstElementChild?.remove();
  }
  elements.terminalScreen.scrollTop = elements.terminalScreen.scrollHeight;
}

function clearTerminal() {
  elements.terminalScreen.replaceChildren();
}

function addEvent(text) {
  const line = document.createElement("div");
  line.className = "event-line";
  line.innerHTML = '<span class="event-bullet">+</span>';
  const message = document.createElement("span");
  message.textContent = text;
  line.append(message);
  elements.eventLog.prepend(line);

  while (elements.eventLog.children.length > MAX_EVENTS) {
    elements.eventLog.lastElementChild?.remove();
  }
}

function showToast(message) {
  window.clearTimeout(toastTimeout);
  elements.toast.textContent = message;
  elements.toast.classList.add("visible");
  toastTimeout = window.setTimeout(() => elements.toast.classList.remove("visible"), 2300);
}

function recordKey(key) {
  lastInputAt = performance.now();
  state.totalTyped += 1;
  updateNoteBufferWithKey(key);

  const fakeCommand = fakeLineFromInput();
  updateNoteBuffer(fakeCommand);
  appendTerminal("output", `${fakeCommand}  :: packet ${randomHex(4)}`);
}

function handleGlobalKey(event) {
  if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
  const targetElement = event.target && typeof event.target.closest === "function" ? event.target : null;
  if (targetElement?.closest("button") && (event.key === " " || event.key === "Enter")) return;

  const isTypingKey = event.key.length === 1 || event.key === "Backspace" || event.key === "Delete";
  if (!isTypingKey) return;

  event.preventDefault();
  recordKey(event.key);
}

function handlePaste(event) {
  const pastedText = event.clipboardData && typeof event.clipboardData.getData === "function"
    ? event.clipboardData.getData("text/plain")
    : "";
  if (event.defaultPrevented || !pastedText) return;
  event.preventDefault();
  const clippedText = pastedText.slice(-MAX_NOTE_BUFFER);
  for (const character of clippedText) {
    if (character.length === 1) recordKey(character);
  }
}

function earnHacks(amount, reason = "manual node") {
  if (!amount) return;
  state.hacks += amount;
  state.totalHacks += amount;
  state.totalManualMints += reason === "manual node" ? amount : 0;
  appendTerminal("output", `${reason} :: +${amount} hack${amount === 1 ? "" : "s"} minted`);
  addEvent(`${reason} minted +${amount} hack${amount === 1 ? "" : "s"}`);
  showToast(`HACK MINTED // +${amount}`);
}

function updateUpgradeView() {
  const amplifierLevel = getUpgradeLevel(state, "amplifier");
  const autohackerLevel = getUpgradeLevel(state, "autohacker");
  const amplifierCost = getUpgradeCost("amplifier", amplifierLevel);
  const autohackerCost = getUpgradeCost("autohacker", autohackerLevel);
  const autoRate = getAutoRate(state);
  const activeCount = Number(amplifierLevel > 0) + Number(autohackerLevel > 0);

  elements.upgradeCount.textContent = `${String(activeCount).padStart(2, "0")}/04`;

  upgradeElements.amplifier.level.textContent = amplifierLevel >= UPGRADE_CONFIG.amplifier.maxLevel ? "MAX" : `LV ${amplifierLevel}`;
  upgradeElements.amplifier.effect.textContent = `+${amplifierLevel * 15}% manual speed`;
  upgradeElements.amplifier.cost.textContent = Number.isFinite(amplifierCost) ? amplifierCost : "MAX";

  upgradeElements.autohacker.level.textContent = autohackerLevel ? `LV ${autohackerLevel}` : "OFFLINE";
  upgradeElements.autohacker.effect.textContent = `+${autoRate.toFixed(2)} HPS`;
  upgradeElements.autohacker.cost.textContent = Number.isFinite(autohackerCost) ? autohackerCost : "MAX";

  for (const [upgradeId, upgradeView] of Object.entries(upgradeElements)) {
    const level = getUpgradeLevel(state, upgradeId);
    const cost = getUpgradeCost(upgradeId, level);
    const canBuy = Number.isFinite(cost) && state.hacks >= cost;
    upgradeView.button.classList.toggle("can-buy", canBuy);
    upgradeView.button.classList.toggle("cannot-buy", !canBuy && Number.isFinite(cost));
    upgradeView.button.disabled = !Number.isFinite(cost);
    upgradeView.button.setAttribute(
      "aria-label",
      `${upgradeId} level ${level}, costs ${Number.isFinite(cost) ? cost : "maximum level"} hacks`,
    );
  }
}

function updateNodes(now) {
  const activeInput = lastInputAt > 0 && now - lastInputAt <= ACTIVE_INPUT_WINDOW;
  const manualPercent = Math.min(99, Math.floor(state.manualProgress * 100));
  elements.manualFill.style.height = `${state.manualProgress * 100}%`;
  elements.manualPercent.textContent = `${String(manualPercent).padStart(2, "0")}%`;
  elements.manualNodeState.textContent = activeInput ? "CHARGING" : state.manualProgress > 0 ? "HOLDING" : "LISTENING";
  elements.manualCycleText.textContent = `${(1 / getManualRate(state)).toFixed(2)}s CYCLE`;
  elements.manualCore.classList.toggle("charging", activeInput);

  const autoOnline = state.autohackerLevel > 0;
  elements.autoNode.classList.toggle("locked", !autoOnline);
  if (!autoOnline) {
    elements.autoFill.style.height = "0%";
    elements.autoPercent.textContent = "--";
    elements.autoNodeState.textContent = "OFFLINE";
    elements.autoNodeDetail.textContent = "AWAITING PURCHASE";
    elements.autoCycleText.textContent = "LOCKED";
    return;
  }

  const autoRate = getAutoRate(state);
  elements.autoFill.style.height = `${state.autoProgress * 100}%`;
  elements.autoPercent.textContent = `${String(Math.floor(state.autoProgress * 100)).padStart(2, "0")}%`;
  elements.autoNodeState.textContent = `RUNNING LV ${state.autohackerLevel}`;
  elements.autoNodeDetail.textContent = `+${autoRate.toFixed(2)} HPS`;
  elements.autoCycleText.textContent = `${(1 / autoRate).toFixed(1)}s CYCLE`;
}

function updateView(now = performance.now()) {
  const activeInput = lastInputAt > 0 && now - lastInputAt <= ACTIVE_INPUT_WINDOW;
  elements.hacksCount.textContent = formatHacks(state.hacks);
  elements.totalHacksCount.textContent = formatHacks(state.totalHacks);
  elements.hacksPerSecond.textContent = getAutoRate(state).toFixed(2);
  elements.sessionTimer.textContent = formatDuration((Date.now() - state.sessionStartedAt) / 1000);
  elements.inputState.textContent = activeInput ? "ACTIVE" : "STANDBY";
  elements.clockReadout.textContent = `SYS ${formatSystemClock()}`;
  updateNodes(now);
  updateUpgradeView();
}

function gameLoop(now) {
  const elapsedSeconds = Math.min(0.1, Math.max(0, (now - lastFrame) / 1000));
  lastFrame = now;

  const activeInput = lastInputAt > 0 && now - lastInputAt <= ACTIVE_INPUT_WINDOW;
  if (activeInput) {
    state.manualProgress += elapsedSeconds * getManualRate(state);
    while (state.manualProgress >= 1) {
      state.manualProgress -= 1;
      earnHacks(1);
    }
  } else if (lastInputAt > 0 && now - lastInputAt > MANUAL_DECAY_DELAY && state.manualProgress > 0) {
    state.manualProgress = Math.max(0, state.manualProgress - elapsedSeconds * MANUAL_DECAY_RATE);
  }

  const autoRate = getAutoRate(state);
  if (autoRate > 0) {
    state.autoProgress += elapsedSeconds * autoRate;
    while (state.autoProgress >= 1) {
      state.autoProgress -= 1;
      earnHacks(1, `autohacker LV ${state.autohackerLevel}`);
    }
  }

  updateView(now);
  window.requestAnimationFrame(gameLoop);
}

function handleUpgrade(upgradeId) {
  const result = buyUpgrade(state, upgradeId);
  if (!result.ok) {
    const needed = Number.isFinite(result.cost) ? result.cost - state.hacks : 0;
    showToast(needed > 0 ? `INSUFFICIENT HACKS // NEED ${needed} MORE` : "UPGRADE AT MAXIMUM LEVEL");
    return;
  }

  state = result.state;
  if (upgradeId === "autohacker" && result.level === 1) {
    addEvent("node 02 online :: autonomous loop attached");
    appendTerminal("output", "autohacker online :: second node now charging");
    showToast("NODE 02 ONLINE // AUTONOMOUS LOOP ATTACHED");
  } else {
    addEvent(`${upgradeId} upgraded to level ${result.level}`);
    appendTerminal("output", `${upgradeId} level ${result.level} installed :: throughput recalibrated`);
    showToast(`${upgradeId.toUpperCase()} UPGRADED // LV ${result.level}`);
  }

  updateView(performance.now());
  saveState();
}

document.addEventListener("keydown", handleGlobalKey, true);
document.addEventListener("paste", handlePaste, true);

for (const [upgradeId, upgradeView] of Object.entries(upgradeElements)) {
  upgradeView.button.addEventListener("click", () => handleUpgrade(upgradeId));
}

elements.resetButton.addEventListener("click", () => {
  if (window.confirm("Reset this local hacking session?")) resetState();
});

window.addEventListener("beforeunload", saveState);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") saveState();
});

updateNoteBuffer();
updateView(performance.now());
window.requestAnimationFrame(gameLoop);
window.setTimeout(() => elements.appShell?.focus({ preventScroll: true }), 0);
