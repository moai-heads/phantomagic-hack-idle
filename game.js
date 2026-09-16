export const SAVE_KEY = "phantomagic-hack-idle-v1";
export const BASE_OFFLINE_SECONDS = 8 * 60 * 60;

export const UPGRADE_CONFIG = Object.freeze({
  amplifier: Object.freeze({
    stateKey: "amplifierLevel",
    label: "KEYSTROKE AMPLIFIER",
    description: "compresses manual signal bursts",
    baseEffect: "+15% manual speed / level",
    baseCost: 3,
    costMultiplier: 1.82,
    maxLevel: 12,
    unlockAt: 0,
    prerequisites: Object.freeze([]),
  }),
  autohacker: Object.freeze({
    stateKey: "autohackerLevel",
    label: "AUTOHACKER",
    description: "spawns a second autonomous node",
    baseEffect: "+0.10 HPS / level",
    baseCost: 6,
    costMultiplier: 1.72,
    maxLevel: 12,
    unlockAt: 0,
    prerequisites: Object.freeze([]),
  }),
  packetMirror: Object.freeze({
    stateKey: "packetMirrorLevel",
    label: "PACKET MIRROR",
    description: "duplicates autonomous signal output",
    baseEffect: "+20% autohacker output / level",
    baseCost: 24,
    costMultiplier: 1.95,
    maxLevel: 8,
    unlockAt: 25,
    prerequisites: Object.freeze([{ upgradeId: "autohacker", level: 1 }]),
  }),
  ghostProxy: Object.freeze({
    stateKey: "ghostProxyLevel",
    label: "GHOST PROXY",
    description: "routes around the visible firewall",
    baseEffect: "+25% offline output / level",
    baseCost: 36,
    costMultiplier: 1.95,
    maxLevel: 8,
    unlockAt: 50,
    prerequisites: Object.freeze([{ upgradeId: "autohacker", level: 1 }]),
  }),
  syntaxBurst: Object.freeze({
    stateKey: "syntaxBurstLevel",
    label: "SYNTAX BURST",
    description: "converts typing milestones into bonus hacks",
    baseEffect: "+2 hacks every 25 keys / level",
    baseCost: 50,
    costMultiplier: 2,
    maxLevel: 8,
    unlockAt: 75,
    prerequisites: Object.freeze([{ upgradeId: "amplifier", level: 1 }]),
  }),
  keySequence: Object.freeze({
    stateKey: "keySequenceLevel",
    label: "KEY SEQUENCE",
    description: "varied keys build a manual combo multiplier",
    baseEffect: "+1.5% combo output / level",
    baseCost: 70,
    costMultiplier: 2,
    maxLevel: 8,
    unlockAt: 120,
    prerequisites: Object.freeze([{ upgradeId: "amplifier", level: 2 }]),
  }),
  processFork: Object.freeze({
    stateKey: "processForkLevel",
    label: "PROCESS FORK",
    description: "periodically doubles autonomous processes",
    baseEffect: "+15s fork window / level",
    baseCost: 100,
    costMultiplier: 2,
    maxLevel: 6,
    unlockAt: 180,
    prerequisites: Object.freeze([{ upgradeId: "autohacker", level: 2 }]),
  }),
  terminalCache: Object.freeze({
    stateKey: "terminalCacheLevel",
    label: "TERMINAL CACHE",
    description: "stores more progress while you are away",
    baseEffect: "+2h offline cap / level",
    baseCost: 140,
    costMultiplier: 2,
    maxLevel: 8,
    unlockAt: 250,
    prerequisites: Object.freeze([{ upgradeId: "ghostProxy", level: 1 }]),
  }),
  zeroDay: Object.freeze({
    stateKey: "zeroDayLevel",
    label: "ZERO-DAY EXPLOIT",
    description: "occasionally cracks a massive bonus packet",
    baseEffect: "+1.5% chance for +10 hacks / level",
    baseCost: 220,
    costMultiplier: 2.08,
    maxLevel: 8,
    unlockAt: 400,
    prerequisites: Object.freeze([{ upgradeId: "syntaxBurst", level: 1 }]),
  }),
  portScanner: Object.freeze({
    stateKey: "portScannerLevel",
    label: "PORT SCANNER",
    description: "discovers temporary bonus nodes",
    baseEffect: "+0.15 HPS during scans / level",
    baseCost: 360,
    costMultiplier: 2.1,
    maxLevel: 6,
    unlockAt: 600,
    prerequisites: Object.freeze([{ upgradeId: "autohacker", level: 3 }]),
  }),
  rootAccess: Object.freeze({
    stateKey: "rootAccessLevel",
    label: "ROOT ACCESS",
    description: "permanently multiplies every output channel",
    baseEffect: "+20% all output / level",
    baseCost: 1000,
    costMultiplier: 2.55,
    maxLevel: 5,
    unlockAt: 1000,
    prerequisites: Object.freeze([
      { upgradeId: "packetMirror", level: 1 },
      { upgradeId: "keySequence", level: 1 },
      { upgradeId: "ghostProxy", level: 1 },
    ]),
  }),
  logScrubber: Object.freeze({
    stateKey: "logScrubberLevel",
    label: "LOG SCRUBBER",
    description: "compresses terminal noise to free autonomous cycles",
    baseEffect: "+5% autonomous output / level; trims the buffer",
    baseCost: 280,
    costMultiplier: 1.95,
    maxLevel: 8,
    unlockAt: 1500,
    prerequisites: Object.freeze([{ upgradeId: "autohacker", level: 2 }]),
  }),
  botnetRelay: Object.freeze({
    stateKey: "botnetRelayLevel",
    label: "BOTNET RELAY",
    description: "adds a third, lighter autonomous node",
    baseEffect: "+0.055 relay HPS / level",
    baseCost: 500,
    costMultiplier: 2.15,
    maxLevel: 8,
    unlockAt: 2500,
    prerequisites: Object.freeze([
      { upgradeId: "autohacker", level: 3 },
      { upgradeId: "packetMirror", level: 1 },
    ]),
  }),
  blackIceBypass: Object.freeze({
    stateKey: "blackIceBypassLevel",
    label: "BLACK ICE BYPASS",
    description: "blocks periodic firewall slowdowns",
    baseEffect: "prevents one disruption / level",
    baseCost: 800,
    costMultiplier: 2.2,
    maxLevel: 5,
    unlockAt: 4000,
    prerequisites: Object.freeze([{ upgradeId: "botnetRelay", level: 1 }]),
  }),
});

export const UPGRADE_IDS = Object.freeze(Object.keys(UPGRADE_CONFIG));

export function createDefaultState(now = Date.now()) {
  return {
    hacks: 0,
    amplifierLevel: 0,
    autohackerLevel: 0,
    packetMirrorLevel: 0,
    ghostProxyLevel: 0,
    syntaxBurstLevel: 0,
    keySequenceLevel: 0,
    processForkLevel: 0,
    terminalCacheLevel: 0,
    zeroDayLevel: 0,
    portScannerLevel: 0,
    rootAccessLevel: 0,
    logScrubberLevel: 0,
    botnetRelayLevel: 0,
    blackIceBypassLevel: 0,
    manualProgress: 0,
    autoProgress: 0,
    relayProgress: 0,
    totalTyped: 0,
    totalHacks: 0,
    totalManualMints: 0,
    sessionStartedAt: now,
    lastSavedAt: now,
  };
}

export function getUpgradeLevel(state, upgradeId) {
  const config = UPGRADE_CONFIG[upgradeId];
  if (!config) return 0;
  return Math.max(0, Number(state?.[config.stateKey]) || 0);
}

export function areUpgradePrerequisitesMet(state, upgradeId) {
  const config = UPGRADE_CONFIG[upgradeId];
  if (!config) return false;
  return (config.prerequisites || []).every(({ upgradeId: prerequisiteId, level }) => (
    getUpgradeLevel(state, prerequisiteId) >= level
  ));
}

export function getVisibleUpgradeIds(state) {
  return UPGRADE_IDS.filter((upgradeId) => areUpgradePrerequisitesMet(state, upgradeId));
}

export function isUpgradeUnlocked(state, upgradeId) {
  const config = UPGRADE_CONFIG[upgradeId];
  if (!config || !areUpgradePrerequisitesMet(state, upgradeId)) return false;
  return (Number(state?.totalHacks) || 0) >= config.unlockAt;
}

export function getUpgradeCost(upgradeId, currentLevel) {
  const config = UPGRADE_CONFIG[upgradeId];
  if (!config || currentLevel >= config.maxLevel) return Infinity;
  return Math.floor(config.baseCost * config.costMultiplier ** currentLevel);
}

export function getGlobalOutputMultiplier(state) {
  return 1 + getUpgradeLevel(state, "rootAccess") * 0.2;
}

export function getLogScrubberMultiplier(state) {
  return 1 + getUpgradeLevel(state, "logScrubber") * 0.05;
}

export function getKeySequenceMultiplier(state, combo = 0) {
  const safeCombo = Math.min(12, Math.max(0, Number(combo) || 0));
  return 1 + safeCombo * getUpgradeLevel(state, "keySequence") * 0.015;
}

export function getManualRate(state, { combo = 0 } = {}) {
  const amplifierMultiplier = 1 + getUpgradeLevel(state, "amplifier") * 0.15;
  return 0.5 * amplifierMultiplier * getKeySequenceMultiplier(state, combo) * getGlobalOutputMultiplier(state);
}

export function getAutohackerRate(state, { processForkActive = false } = {}) {
  const amplifierMultiplier = 1 + getUpgradeLevel(state, "amplifier") * 0.12;
  const mirrorMultiplier = 1 + getUpgradeLevel(state, "packetMirror") * 0.2;
  const rootMultiplier = getGlobalOutputMultiplier(state);
  const scrubberMultiplier = getLogScrubberMultiplier(state);
  const baseRate = getUpgradeLevel(state, "autohacker") * 0.1 * amplifierMultiplier * mirrorMultiplier * scrubberMultiplier;
  return baseRate * (processForkActive ? 2 : 1) * rootMultiplier;
}

export function getRelayRate(state) {
  const amplifierMultiplier = 1 + getUpgradeLevel(state, "amplifier") * 0.04;
  return getUpgradeLevel(state, "botnetRelay")
    * 0.055
    * amplifierMultiplier
    * getLogScrubberMultiplier(state)
    * getGlobalOutputMultiplier(state);
}

export function getPortScannerBonusRate(state, { portScannerActive = false } = {}) {
  if (!portScannerActive) return 0;
  return getUpgradeLevel(state, "portScanner")
    * 0.15
    * getLogScrubberMultiplier(state)
    * getGlobalOutputMultiplier(state);
}

export function getAutoRate(state, { processForkActive = false, portScannerActive = false } = {}) {
  return getAutohackerRate(state, { processForkActive })
    + getRelayRate(state)
    + getPortScannerBonusRate(state, { portScannerActive });
}

export function getOfflineMultiplier(state) {
  return 1 + getUpgradeLevel(state, "ghostProxy") * 0.25;
}

export function getOfflineCapSeconds(state) {
  const ghostProxyHours = getUpgradeLevel(state, "ghostProxy");
  const terminalCacheHours = getUpgradeLevel(state, "terminalCache") * 2;
  return BASE_OFFLINE_SECONDS + (ghostProxyHours + terminalCacheHours) * 60 * 60;
}

export function getSyntaxBurstReward(state) {
  return getUpgradeLevel(state, "syntaxBurst") * 2;
}

export function getZeroDayChance(state) {
  return Math.min(0.2, getUpgradeLevel(state, "zeroDay") * 0.015);
}

export function getZeroDayReward(state) {
  return getUpgradeLevel(state, "zeroDay") * 10;
}

export function getTerminalLineLimit(state) {
  return Math.max(24, 64 - getUpgradeLevel(state, "logScrubber") * 5);
}

export function buyUpgrade(state, upgradeId) {
  const config = UPGRADE_CONFIG[upgradeId];
  if (!config) return { ok: false, state, cost: Infinity, reason: "unknown" };

  const currentLevel = getUpgradeLevel(state, upgradeId);
  const cost = getUpgradeCost(upgradeId, currentLevel);

  if (!areUpgradePrerequisitesMet(state, upgradeId)) {
    return { ok: false, state, cost, reason: "prerequisite", prerequisites: config.prerequisites };
  }
  if (!isUpgradeUnlocked(state, upgradeId)) {
    return { ok: false, state, cost, reason: "locked", unlockAt: config.unlockAt };
  }
  if (!Number.isFinite(cost) || state.hacks < cost) {
    return { ok: false, state, cost, reason: "insufficient" };
  }

  const nextState = {
    ...state,
    hacks: state.hacks - cost,
    [config.stateKey]: currentLevel + 1,
  };

  return { ok: true, state: nextState, cost, level: currentLevel + 1 };
}

export function applyOfflineProgress(state, elapsedSeconds) {
  const safeElapsed = Math.min(getOfflineCapSeconds(state), Math.max(0, Number(elapsedSeconds) || 0));
  const offlineMultiplier = getOfflineMultiplier(state);
  const autoProgress = state.autoProgress + safeElapsed * getAutohackerRate(state) * offlineMultiplier;
  const relayProgress = state.relayProgress + safeElapsed * getRelayRate(state) * offlineMultiplier;
  const autoEarned = Math.floor(autoProgress);
  const relayEarned = Math.floor(relayProgress);
  const earned = autoEarned + relayEarned;

  return {
    ...state,
    hacks: state.hacks + earned,
    totalHacks: state.totalHacks + earned,
    autoProgress: autoProgress - autoEarned,
    relayProgress: relayProgress - relayEarned,
    offlineSeconds: safeElapsed,
    offlineAutoGain: autoEarned,
    offlineRelayGain: relayEarned,
    offlineGain: earned,
  };
}

export function normalizeState(candidate, now = Date.now()) {
  const fallback = createDefaultState(now);
  if (!candidate || typeof candidate !== "object") return fallback;

  const numberOr = (value, fallbackValue, minimum = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= minimum ? parsed : fallbackValue;
  };

  const normalizedHacks = Math.floor(numberOr(candidate.hacks, fallback.hacks));
  const normalizedTotalHacks = Math.max(
    normalizedHacks,
    Math.floor(numberOr(candidate.totalHacks, normalizedHacks)),
  );
  const normalized = {
    ...fallback,
    hacks: normalizedHacks,
    manualProgress: Math.min(0.9999, numberOr(candidate.manualProgress, 0)),
    autoProgress: Math.min(0.9999, numberOr(candidate.autoProgress, 0)),
    relayProgress: Math.min(0.9999, numberOr(candidate.relayProgress, 0)),
    totalTyped: Math.floor(numberOr(candidate.totalTyped, 0)),
    totalHacks: normalizedTotalHacks,
    totalManualMints: Math.floor(numberOr(candidate.totalManualMints, 0)),
    sessionStartedAt: numberOr(candidate.sessionStartedAt, now),
    lastSavedAt: numberOr(candidate.lastSavedAt, now),
  };

  for (const upgradeId of UPGRADE_IDS) {
    const config = UPGRADE_CONFIG[upgradeId];
    normalized[config.stateKey] = Math.min(
      config.maxLevel,
      Math.floor(numberOr(candidate[config.stateKey], 0)),
    );
  }

  return normalized;
}

export function formatDuration(totalSeconds, showHours = false) {
  const seconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;

  if (showHours || hours > 0) {
    return [hours, minutes, remainder].map((part) => String(part).padStart(2, "0")).join(":");
  }

  return [minutes, remainder].map((part) => String(part).padStart(2, "0")).join(":");
}
