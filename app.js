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
} from "./game.js";

const STREAM_TEMPLATES = Object.freeze([
  "ssh ghost@10.13.37.4 -p 443",
  "const phantom = await bypass.firewall();",
  "chmod +x /tmp/phantomagic",
  "SELECT * FROM shadows WHERE port = 22;",
  "decrypt --layer=07 --seed=0x7F3A",
  "[ok] route accepted :: packet echoed",
  "nmap -sS --min-rate 9000 172.16.0.0/16",
  "for (;;) { listen(); learn(); }",
  "proxy_chain[3] -> blackbox -> null",
  "echo 'nothing to see here' > /var/log/ghost",
]);

const HEX = "0123456789ABCDEF";
const MAX_TERMINAL_LINES = 38;
const MAX_EVENTS = 8;
const ACTIVE_INPUT_WINDOW = 850;
const MANUAL_DECAY_DELAY = 1250;
const MANUAL_DECAY_RATE = 0.075;

const elements = {
  hacksCount: document.querySelector("#hacksCount"),
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
  terminalForm: document.querySelector("#terminalForm"),
  terminalInput: document.querySelector("#terminalInput"),
  codeStream: document.querySelector("#codeStream"),
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
let previousInputValue = "";
let toastTimeout;
let ambientStreamTimeout;

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
  previousInputValue = "";
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // Local storage can be blocked in private browsing; the session still resets.
  }
  elements.terminalInput.value = "";
  clearTerminal();
  appendTerminal("output", "session reset :: manual node standing by");
  addEvent("local session reset");
  showToast("SESSION RESET // SIGNAL CLEAN");
  updateView(performance.now());
  saveState();
  elements.terminalInput.focus();
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

function fakeLineFromInput(input = "") {
  const cleanInput = input.replace(/\s+/g, " ").trim();
  const template = STREAM_TEMPLATES[Math.floor(Math.random() * STREAM_TEMPLATES.length)];
  if (!cleanInput) return template;
  if (cleanInput.length > 3 && Math.random() > 0.45) {
    const fragment = cleanInput.slice(-Math.min(cleanInput.length, 18));
    return `${template}  // ${fragment}`;
  }
  return template.replace(/0x7F3A|0x[0-9A-F]+/i, `0x${randomHex(4)}`);
}

function spawnStreamLine(text = fakeLineFromInput(), dim = false) {
  if (!elements.codeStream) return;
  const line = document.createElement("span");
  line.className = `stream-line${dim ? " dim" : ""}`;
  line.textContent = text;
  line.style.left = `${Math.round(4 + Math.random() * 74)}%`;
  line.style.setProperty("--stream-duration", `${(2.1 + Math.random() * 1.9).toFixed(2)}s`);
  line.style.setProperty("--stream-drift", `${Math.round(-30 + Math.random() * 58)}px`);
  elements.codeStream.append(line);
  line.addEventListener("animationend", () => line.remove(), { once: true });
}

function scheduleAmbientStream() {
  window.clearTimeout(ambientStreamTimeout);
  const delay = 1800 + Math.random() * 2600;
  ambientStreamTimeout = window.setTimeout(() => {
    if (lastInputAt && performance.now() - lastInputAt < 4000) {
      spawnStreamLine(fakeLineFromInput(), true);
    }
    scheduleAmbientStream();
  }, delay);
}

function currentTimeLabel() {
  return formatSystemClock();
}

function appendTerminal(kind, text) {
  const line = document.createElement("div");
  line.className = `terminal-line ${kind}`;

  const timestamp = document.createElement("span");
  timestamp.className = "terminal-time";
  timestamp.textContent = currentTimeLabel();

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

function earnHacks(amount, reason = "manual node") {
  if (!amount) return;
  state.hacks += amount;
  state.totalManualMints += reason === "manual node" ? amount : 0;
  appendTerminal("output", `${reason} :: +${amount} hack${amount === 1 ? "" : "s"} minted`);
  addEvent(`${reason} minted +${amount} hack${amount === 1 ? "" : "s"}`);
  spawnStreamLine(`[mint] ${reason} :: +${amount} HACK${amount === 1 ? "" : "S"}`);
  showToast(`HACK MINTED // +${amount}`);
}

function registerInput(inputValue = "") {
  const now = performance.now();
  lastInputAt = now;
  const delta = Math.max(1, Math.abs(inputValue.length - previousInputValue.length));
  state.totalTyped += delta;
  previousInputValue = inputValue;

  const burstCount = Math.min(3, Math.max(1, Math.ceil(delta / 3)));
  for (let index = 0; index < burstCount; index += 1) {
    spawnStreamLine(fakeLineFromInput(inputValue), index > 0);
  }
}

function commandResponse(command) {
  const normalized = command.trim().toLowerCase();
  const autoRate = getAutoRate(state);
  switch (normalized) {
    case "":
      return "empty payload accepted :: keep typing";
    case "help":
      return "commands: help | status | scan | clear :: all other input is classified as code";
    case "status":
      return `hacks=${state.hacks} :: manual=${Math.floor(state.manualProgress * 100)}% :: auto=${autoRate.toFixed(2)} HPS`;
    case "scan":
      spawnStreamLine("[scan] 3 open ghosts found :: pretending this is legal");
      return "scan complete :: 172.16.0.0/16 is mostly somebody's printer";
    case "clear":
      clearTerminal();
      return "terminal buffer cleared :: signal retained";
    default:
      return `[exec] ${command.slice(0, 72)} :: process forked :: no witnesses detected`;
  }
}

function submitCommand() {
  const command = elements.terminalInput.value.trim();
  appendTerminal("command", `guest@phantomagic:~$ ${command || "_"}`);
  const response = commandResponse(command);
  if (command.toLowerCase() !== "clear") appendTerminal("output", response);
  elements.terminalInput.value = "";
  previousInputValue = "";
  spawnStreamLine(command ? `> ${command.slice(0, 42)}` : "> _", true);
  elements.terminalInput.focus();
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
  elements.manualCycleText.textContent = `${(1 / getManualRate(state)).toFixed(1)}s CYCLE`;
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

elements.terminalInput.addEventListener("input", (event) => {
  registerInput(event.currentTarget.value);
});

elements.terminalForm.addEventListener("submit", (event) => {
  event.preventDefault();
  submitCommand();
});

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

updateView(performance.now());
scheduleAmbientStream();
window.requestAnimationFrame(gameLoop);
window.setTimeout(() => elements.terminalInput.focus(), 250);
