import {
  SAVE_KEY,
  UPGRADE_CONFIG,
  UPGRADE_IDS,
  applyOfflineProgress,
  buyUpgrade,
  createDefaultState,
  formatDuration,
  getAutoRate,
  getAutohackerRate,
  getGlobalOutputMultiplier,
  getManualRate,
  getLogScrubberMultiplier,
  getOfflineCapSeconds,
  getPortScannerBonusRate,
  getRelayRate,
  getSyntaxBurstReward,
  getTerminalLineLimit,
  getUpgradeCost,
  getUpgradeLevel,
  getZeroDayChance,
  getZeroDayReward,
  isUpgradeUnlocked,
  normalizeState,
} from "./game.js?v=powerups-20260916";

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
const MAX_EVENTS = 8;
const MAX_NOTE_BUFFER = 96;
const ACTIVE_INPUT_WINDOW = 650;
const MANUAL_DECAY_DELAY = 1100;
const MANUAL_DECAY_RATE = 0.12;
const MAX_COMBO = 12;
const PROCESS_FORK_INTERVAL_MS = 60_000;
const PORT_SCAN_INTERVAL_MS = 48_000;
const BLACK_ICE_INTERVAL_MS = 45_000;
const BLACK_ICE_DURATION_MS = 6_000;
const AUTOSAVE_INTERVAL_MS = 10_000;

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
  relayNode: document.querySelector("#relayNode"),
  relayFill: document.querySelector("#relayFill"),
  relayPercent: document.querySelector("#relayPercent"),
  relayNodeState: document.querySelector("#relayNodeState"),
  relayNodeDetail: document.querySelector("#relayNodeDetail"),
  relayCycleText: document.querySelector("#relayCycleText"),
  terminalScreen: document.querySelector("#terminalScreen"),
  noteBuffer: document.querySelector("#noteBuffer"),
  noteBufferCount: document.querySelector("#noteBufferCount"),
  eventLog: document.querySelector("#eventLog"),
  upgradeList: document.querySelector("#upgradeList"),
  upgradeCount: document.querySelector("#upgradeCount"),
  saveStatus: document.querySelector("#saveStatus"),
  toast: document.querySelector("#toast"),
  resetButton: document.querySelector("#resetButton"),
};

const upgradeElements = new Map();
const initialNow = performance.now();
let state;
let lastFrame = initialNow;
let lastAutosaveAt = Date.now();
let lastInputAt = 0;
let lastTypedKey = "";
let comboCount = 0;
let noteBuffer = "";
let noteBufferLine = "";
let lastTemplateIndex = -1;
let processForkUntil = 0;
let nextProcessForkAt = initialNow + PROCESS_FORK_INTERVAL_MS;
let portScannerUntil = 0;
let nextPortScannerAt = initialNow + PORT_SCAN_INTERVAL_MS;
let blackIceUntil = 0;
let nextBlackIceAt = initialNow + BLACK_ICE_INTERVAL_MS;
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
  lastAutosaveAt = state.lastSavedAt;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    elements.saveStatus.textContent = `STATE SYNCED ${new Date(state.lastSavedAt).toLocaleTimeString([], { hour12: false })}`;
  } catch {
    elements.saveStatus.textContent = "LOCAL SAVE UNAVAILABLE";
  }
}

function resetTimedSystems(now = performance.now()) {
  processForkUntil = 0;
  nextProcessForkAt = now + PROCESS_FORK_INTERVAL_MS;
  portScannerUntil = 0;
  nextPortScannerAt = now + PORT_SCAN_INTERVAL_MS;
  blackIceUntil = 0;
  nextBlackIceAt = now + BLACK_ICE_INTERVAL_MS;
}

function resetState() {
  state = createDefaultState(Date.now());
  lastInputAt = 0;
  lastTypedKey = "";
  comboCount = 0;
  noteBuffer = "";
  noteBufferLine = "";
  lastTemplateIndex = -1;
  resetTimedSystems();
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

  while (elements.terminalScreen.children.length > getTerminalLineLimit(state)) {
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

function updateCombo(key, now) {
  const normalizedKey = key.length === 1 ? key.toLowerCase() : key;
  const recentInput = lastInputAt > 0 && now - lastInputAt <= ACTIVE_INPUT_WINDOW;

  if (!recentInput) {
    comboCount = 1;
  } else if (normalizedKey === lastTypedKey) {
    comboCount = 0;
  } else {
    comboCount = Math.min(MAX_COMBO, comboCount + 1);
  }

  lastTypedKey = normalizedKey;
}

function earnHacks(amount, reason = "manual node", applyOutputMultiplier = false) {
  const rawAmount = Math.max(0, Number(amount) || 0);
  const multiplier = applyOutputMultiplier ? getGlobalOutputMultiplier(state) : 1;
  const minted = Math.floor(rawAmount * multiplier);
  if (minted <= 0) return;

  state.hacks += minted;
  state.totalHacks += minted;
  state.totalManualMints += reason === "manual node" ? minted : 0;
  appendTerminal("output", `${reason} :: +${minted} hack${minted === 1 ? "" : "s"} minted`);
  addEvent(`${reason} minted +${minted} hack${minted === 1 ? "" : "s"}`);

  if (reason === "manual node" || reason.includes("burst") || reason.includes("exploit")) {
    showToast(`HACK MINTED // +${minted}`);
  }
}

function recordKey(key) {
  const now = performance.now();
  updateCombo(key, now);
  lastInputAt = now;
  state.totalTyped += 1;
  updateNoteBufferWithKey(key);

  const fakeCommand = fakeLineFromInput();
  updateNoteBuffer(fakeCommand);
  appendTerminal("output", `${fakeCommand}  :: packet ${randomHex(4)}`);

  const syntaxReward = getSyntaxBurstReward(state);
  if (syntaxReward > 0 && state.totalTyped % 25 === 0) {
    earnHacks(syntaxReward, "syntax burst", true);
  }

  const zeroDayReward = getZeroDayReward(state);
  if (zeroDayReward > 0 && Math.random() < getZeroDayChance(state)) {
    earnHacks(zeroDayReward, "zero-day exploit", true);
  }
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

function createUpgradeElement(upgradeId) {
  const config = UPGRADE_CONFIG[upgradeId];
  const button = document.createElement("button");
  button.className = "upgrade-card locked-card";
  button.type = "button";
  button.dataset.upgrade = upgradeId;

  const topline = document.createElement("span");
  topline.className = "upgrade-topline";
  const name = document.createElement("span");
  name.className = "upgrade-name";
  name.textContent = config.label;
  const level = document.createElement("span");
  level.className = "upgrade-level";
  topline.append(name, level);

  const description = document.createElement("span");
  description.className = "upgrade-description";
  description.textContent = config.description;

  const bottomline = document.createElement("span");
  bottomline.className = "upgrade-bottomline";
  const effect = document.createElement("span");
  effect.className = "upgrade-effect";
  const cost = document.createElement("span");
  cost.className = "upgrade-cost";
  const costIcon = document.createElement("span");
  costIcon.className = "cost-icon";
  costIcon.textContent = "◆";
  const costValue = document.createElement("span");
  cost.append(costIcon, costValue);
  bottomline.append(effect, cost);

  const unlock = document.createElement("span");
  unlock.className = "upgrade-unlock";

  button.append(topline, description, bottomline, unlock);
  button.addEventListener("click", () => handleUpgrade(upgradeId));
  elements.upgradeList.append(button);
  upgradeElements.set(upgradeId, { button, level, effect, cost: costValue, unlock });
}

function renderUpgradeCards() {
  elements.upgradeList.replaceChildren();
  const hint = document.createElement("div");
  hint.className = "upgrade-list-hint";
  hint.textContent = "BUY TIERS WITH BANKED HACKS // NEW SYSTEMS UNLOCK FROM LIFETIME OUTPUT";
  elements.upgradeList.append(hint);
  upgradeElements.clear();
  for (const upgradeId of UPGRADE_IDS) createUpgradeElement(upgradeId);
}

function getUpgradeEffectText(upgradeId, level) {
  if (!level) return UPGRADE_CONFIG[upgradeId].baseEffect;

  switch (upgradeId) {
    case "amplifier":
      return `+${level * 15}% manual speed`;
    case "autohacker":
      return `+${getAutohackerRate(state).toFixed(2)} HPS`;
    case "packetMirror":
      return `+${level * 20}% autohacker output`;
    case "ghostProxy":
      return `+${level * 25}% offline output`;
    case "syntaxBurst":
      return `+${getSyntaxBurstReward(state)} hacks / 25 keys`;
    case "keySequence":
      return `+${(level * 1.5).toFixed(1)}% / combo step`;
    case "processFork":
      return `+${level * 15}s fork window`;
    case "terminalCache":
      return `+${level * 2}h offline cap`;
    case "zeroDay":
      return `${(getZeroDayChance(state) * 100).toFixed(1)}% for +${getZeroDayReward(state)}`;
    case "portScanner":
      return `+${(level * 0.15).toFixed(2)} HPS during scans`;
    case "rootAccess":
      return `+${(getGlobalOutputMultiplier(state) - 1) * 100}% all output`;
    case "logScrubber":
      return `+${((getLogScrubberMultiplier(state) - 1) * 100).toFixed(0)}% auto output // ${getTerminalLineLimit(state)} lines`;
    case "botnetRelay":
      return `+${getRelayRate(state).toFixed(2)} relay HPS`;
    case "blackIceBypass":
      return `${Math.min(100, level * 20)}% block chance`;
    default:
      return UPGRADE_CONFIG[upgradeId].baseEffect;
  }
}

function updateUpgradeView() {
  const activeCount = UPGRADE_IDS.filter((upgradeId) => getUpgradeLevel(state, upgradeId) > 0).length;
  elements.upgradeCount.textContent = `${String(activeCount).padStart(2, "0")}/${String(UPGRADE_IDS.length).padStart(2, "0")}`;

  for (const upgradeId of UPGRADE_IDS) {
    const config = UPGRADE_CONFIG[upgradeId];
    const upgradeView = upgradeElements.get(upgradeId);
    const level = getUpgradeLevel(state, upgradeId);
    const cost = getUpgradeCost(upgradeId, level);
    const unlocked = isUpgradeUnlocked(state, upgradeId);
    const canBuy = unlocked && Number.isFinite(cost) && state.hacks >= cost;

    upgradeView.level.textContent = !unlocked
      ? `LOCK ${formatHacks(config.unlockAt)}`
      : level >= config.maxLevel
        ? "MAX"
        : `LV ${level}`;
    upgradeView.effect.textContent = getUpgradeEffectText(upgradeId, level);
    upgradeView.cost.textContent = unlocked && Number.isFinite(cost) ? cost : "--";
    upgradeView.unlock.textContent = unlocked
      ? level >= config.maxLevel
        ? "FULLY INSTALLED"
        : "CLICK TO INSTALL NEXT TIER"
      : `UNLOCK AT ${formatHacks(config.unlockAt)} TOTAL HACKS`;

    upgradeView.button.disabled = !unlocked || !Number.isFinite(cost);
    upgradeView.button.classList.toggle("locked-card", !unlocked);
    upgradeView.button.classList.toggle("can-buy", canBuy);
    upgradeView.button.classList.toggle("cannot-buy", unlocked && !canBuy && Number.isFinite(cost));
    upgradeView.button.setAttribute(
      "aria-label",
      `${config.label}, ${unlocked ? `level ${level}, costs ${Number.isFinite(cost) ? cost : "maximum level"}` : `locked until ${config.unlockAt} total hacks`}`,
    );
  }
}

function isProcessForkActive(now) {
  return processForkUntil > now;
}

function isPortScannerActive(now) {
  return portScannerUntil > now;
}

function isBlackIceActive(now) {
  return blackIceUntil > now;
}

function updateNodes(now) {
  const activeInput = lastInputAt > 0 && now - lastInputAt <= ACTIVE_INPUT_WINDOW;
  const processForkActive = isProcessForkActive(now);
  const portScannerActive = isPortScannerActive(now);
  const blackIceActive = isBlackIceActive(now);
  const manualRate = getManualRate(state, { combo: comboCount });
  const manualPercent = Math.min(99, Math.floor(state.manualProgress * 100));

  elements.manualFill.style.height = `${state.manualProgress * 100}%`;
  elements.manualPercent.textContent = `${String(manualPercent).padStart(2, "0")}%`;
  elements.manualNodeState.textContent = blackIceActive
    ? "BLACK ICE"
    : activeInput
      ? comboCount > 1 && getUpgradeLevel(state, "keySequence") > 0
        ? `COMBO X${comboCount}`
        : "CHARGING"
      : state.manualProgress > 0
        ? "HOLDING"
        : "LISTENING";
  elements.manualCycleText.textContent = `${(1 / manualRate).toFixed(2)}s CYCLE`;
  elements.manualCore.classList.toggle("charging", activeInput && !blackIceActive);
  elements.manualCore.classList.toggle("disrupted", blackIceActive);

  const autoOnline = getUpgradeLevel(state, "autohacker") > 0;
  elements.autoNode.classList.toggle("locked", !autoOnline);
  if (!autoOnline) {
    elements.autoFill.style.height = "0%";
    elements.autoPercent.textContent = "--";
    elements.autoNodeState.textContent = "OFFLINE";
    elements.autoNodeDetail.textContent = "AWAITING PURCHASE";
    elements.autoCycleText.textContent = "LOCKED";
  } else {
    const autoRate = getAutohackerRate(state, { processForkActive })
      + getPortScannerBonusRate(state, { portScannerActive });
    elements.autoFill.style.height = `${state.autoProgress * 100}%`;
    elements.autoPercent.textContent = `${String(Math.floor(state.autoProgress * 100)).padStart(2, "0")}%`;
    elements.autoNodeState.textContent = processForkActive ? "FORKED" : `RUNNING LV ${state.autohackerLevel}`;
    elements.autoNodeDetail.textContent = `${portScannerActive ? "SCAN // " : ""}+${autoRate.toFixed(2)} HPS`;
    elements.autoCycleText.textContent = `${(1 / autoRate).toFixed(1)}s CYCLE`;
  }

  const relayOnline = getUpgradeLevel(state, "botnetRelay") > 0;
  elements.relayNode.classList.toggle("locked", !relayOnline);
  if (!relayOnline) {
    elements.relayFill.style.height = "0%";
    elements.relayPercent.textContent = "--";
    elements.relayNodeState.textContent = "OFFLINE";
    elements.relayNodeDetail.textContent = "AWAITING PURCHASE";
    elements.relayCycleText.textContent = "LOCKED";
  } else {
    const relayRate = getRelayRate(state);
    elements.relayFill.style.height = `${state.relayProgress * 100}%`;
    elements.relayPercent.textContent = `${String(Math.floor(state.relayProgress * 100)).padStart(2, "0")}%`;
    elements.relayNodeState.textContent = `RELAYING LV ${state.botnetRelayLevel}`;
    elements.relayNodeDetail.textContent = `+${relayRate.toFixed(2)} HPS`;
    elements.relayCycleText.textContent = `${(1 / relayRate).toFixed(1)}s CYCLE`;
  }
}

function updateView(now = performance.now()) {
  const activeInput = lastInputAt > 0 && now - lastInputAt <= ACTIVE_INPUT_WINDOW;
  const blackIceActive = isBlackIceActive(now);
  const autoRate = getAutoRate(state, {
    processForkActive: isProcessForkActive(now),
    portScannerActive: isPortScannerActive(now),
  });
  elements.hacksCount.textContent = formatHacks(state.hacks);
  elements.totalHacksCount.textContent = formatHacks(state.totalHacks);
  elements.hacksPerSecond.textContent = autoRate.toFixed(2);
  elements.sessionTimer.textContent = formatDuration((Date.now() - state.sessionStartedAt) / 1000);
  elements.inputState.textContent = blackIceActive ? "ICE LOCK" : activeInput ? "ACTIVE" : "STANDBY";
  elements.clockReadout.textContent = `SYS ${formatSystemClock()}`;
  updateNodes(now);
  updateUpgradeView();
}

function processTimedSystems(now) {
  const processLevel = getUpgradeLevel(state, "processFork");
  if (processLevel <= 0) {
    processForkUntil = 0;
  } else if (now >= nextProcessForkAt) {
    processForkUntil = now + processLevel * 15_000;
    nextProcessForkAt = now + Math.max(30_000, PROCESS_FORK_INTERVAL_MS - processLevel * 5_000);
    appendTerminal("command", `fork --autohacker --ttl=${processLevel * 15}s`);
    addEvent(`process fork online :: ${processLevel * 15}s autonomous double-output`);
    showToast("PROCESS FORK // AUTONOMOUS OUTPUT DOUBLED");
  }

  const scannerLevel = getUpgradeLevel(state, "portScanner");
  if (scannerLevel <= 0) {
    portScannerUntil = 0;
  } else if (now >= nextPortScannerAt) {
    portScannerUntil = now + 18_000 + scannerLevel * 2_000;
    nextPortScannerAt = now + Math.max(30_000, PORT_SCAN_INTERVAL_MS - scannerLevel * 3_000);
    appendTerminal("command", `scan --ports=65535 --bonus-nodes=${scannerLevel}`);
    addEvent(`port scanner found ${scannerLevel} temporary bonus node${scannerLevel === 1 ? "" : "s"}`);
    showToast("PORT SCAN COMPLETE // BONUS NODES FOUND");
  }

  if (now >= nextBlackIceAt) {
    nextBlackIceAt = now + BLACK_ICE_INTERVAL_MS;
    const bypassLevel = getUpgradeLevel(state, "blackIceBypass");
    const bypassChance = Math.min(1, bypassLevel * 0.2);
    if (bypassLevel > 0 && Math.random() < bypassChance) {
      blackIceUntil = 0;
      appendTerminal("output", "black ice signature detected :: bypass accepted");
      addEvent(`black ice bypassed :: ${Math.round(bypassChance * 100)}% shield roll`);
    } else {
      blackIceUntil = now + BLACK_ICE_DURATION_MS;
      appendTerminal("error", "BLACK ICE // manual channel slowed for 6s");
      addEvent("black ice detected :: manual channel temporarily locked");
      showToast("BLACK ICE // CHANNEL LOCKED FOR 6S");
    }
  }
}

function gameLoop(now) {
  const elapsedSeconds = Math.min(0.1, Math.max(0, (now - lastFrame) / 1000));
  lastFrame = now;
  processTimedSystems(now);

  const activeInput = lastInputAt > 0 && now - lastInputAt <= ACTIVE_INPUT_WINDOW;
  const blackIceActive = isBlackIceActive(now);
  if (activeInput && !blackIceActive) {
    state.manualProgress += elapsedSeconds * getManualRate(state, { combo: comboCount });
    while (state.manualProgress >= 1) {
      state.manualProgress -= 1;
      earnHacks(1);
    }
  } else if (!blackIceActive && lastInputAt > 0 && now - lastInputAt > MANUAL_DECAY_DELAY && state.manualProgress > 0) {
    state.manualProgress = Math.max(0, state.manualProgress - elapsedSeconds * MANUAL_DECAY_RATE);
  }

  const processForkActive = isProcessForkActive(now);
  const portScannerActive = isPortScannerActive(now);
  const autoRate = getAutohackerRate(state, { processForkActive })
    + getPortScannerBonusRate(state, { portScannerActive });
  if (autoRate > 0) {
    state.autoProgress += elapsedSeconds * autoRate;
    while (state.autoProgress >= 1) {
      state.autoProgress -= 1;
      earnHacks(1, `autohacker LV ${state.autohackerLevel}`);
    }
  }

  const relayRate = getRelayRate(state);
  if (relayRate > 0) {
    state.relayProgress += elapsedSeconds * relayRate;
    while (state.relayProgress >= 1) {
      state.relayProgress -= 1;
      earnHacks(1, `relay LV ${state.botnetRelayLevel}`);
    }
  }

  if (Date.now() - lastAutosaveAt >= AUTOSAVE_INTERVAL_MS) saveState();
  updateView(now);
  window.requestAnimationFrame(gameLoop);
}

function handleUpgrade(upgradeId) {
  const result = buyUpgrade(state, upgradeId);
  const config = UPGRADE_CONFIG[upgradeId];
  if (!result.ok) {
    if (result.reason === "locked") {
      const remaining = Math.max(0, result.unlockAt - state.totalHacks);
      showToast(`LOCKED // NEED ${remaining} MORE LIFETIME HACKS`);
    } else if (result.reason === "insufficient") {
      const needed = Number.isFinite(result.cost) ? result.cost - state.hacks : 0;
      showToast(`INSUFFICIENT HACKS // NEED ${needed} MORE`);
    } else {
      showToast("UPGRADE AT MAXIMUM LEVEL");
    }
    return;
  }

  state = result.state;
  if (upgradeId === "autohacker" && result.level === 1) {
    addEvent("node 02 online :: autonomous loop attached");
    appendTerminal("output", "autohacker online :: second node now charging");
    showToast("NODE 02 ONLINE // AUTONOMOUS LOOP ATTACHED");
  } else if (upgradeId === "botnetRelay" && result.level === 1) {
    addEvent("node 03 online :: relay branch attached");
    appendTerminal("output", "botnet relay online :: third node now charging");
    showToast("NODE 03 ONLINE // RELAY BRANCH ATTACHED");
  } else {
    addEvent(`${config.label.toLowerCase()} upgraded to level ${result.level}`);
    appendTerminal("output", `${config.label.toLowerCase()} level ${result.level} installed :: throughput recalibrated`);
    showToast(`${config.label} UPGRADED // LV ${result.level}`);
  }

  updateView(performance.now());
  saveState();
}

document.addEventListener("keydown", handleGlobalKey, true);
document.addEventListener("paste", handlePaste, true);

elements.resetButton.addEventListener("click", () => {
  if (window.confirm("Reset this local hacking session?")) resetState();
});

window.addEventListener("beforeunload", saveState);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") saveState();
});

renderUpgradeCards();
state = loadState();
updateNoteBuffer();
updateView(performance.now());
window.requestAnimationFrame(gameLoop);
window.setTimeout(() => elements.appShell?.focus({ preventScroll: true }), 0);
