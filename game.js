export const SAVE_KEY = "phantomagic-hack-idle-v1";

export const UPGRADE_CONFIG = Object.freeze({
  amplifier: Object.freeze({
    baseCost: 3,
    costMultiplier: 1.82,
    maxLevel: 12,
  }),
  autohacker: Object.freeze({
    baseCost: 6,
    costMultiplier: 1.72,
    maxLevel: 12,
  }),
});

export function createDefaultState(now = Date.now()) {
  return {
    hacks: 0,
    amplifierLevel: 0,
    autohackerLevel: 0,
    manualProgress: 0,
    autoProgress: 0,
    totalTyped: 0,
    totalManualMints: 0,
    sessionStartedAt: now,
    lastSavedAt: now,
  };
}

export function getUpgradeLevel(state, upgradeId) {
  return upgradeId === "amplifier" ? state.amplifierLevel : state.autohackerLevel;
}

export function getUpgradeCost(upgradeId, currentLevel) {
  const config = UPGRADE_CONFIG[upgradeId];
  if (!config || currentLevel >= config.maxLevel) return Infinity;
  return Math.floor(config.baseCost * config.costMultiplier ** currentLevel);
}

export function getManualRate(state) {
  // The base manual node mints one hack every two seconds of active typing.
  return 0.5 * (1 + state.amplifierLevel * 0.15);
}

export function getAutoRate(state) {
  return state.autohackerLevel * 0.1 * (1 + state.amplifierLevel * 0.12);
}

export function buyUpgrade(state, upgradeId) {
  const currentLevel = getUpgradeLevel(state, upgradeId);
  const cost = getUpgradeCost(upgradeId, currentLevel);

  if (!Number.isFinite(cost) || state.hacks < cost) {
    return { ok: false, state, cost };
  }

  const nextState = {
    ...state,
    hacks: state.hacks - cost,
    ...(upgradeId === "amplifier"
      ? { amplifierLevel: currentLevel + 1 }
      : { autohackerLevel: currentLevel + 1 }),
  };

  return { ok: true, state: nextState, cost, level: currentLevel + 1 };
}

export function applyOfflineProgress(state, elapsedSeconds) {
  const safeElapsed = Math.min(8 * 60 * 60, Math.max(0, Number(elapsedSeconds) || 0));
  const autoOutput = getAutoRate(state);
  const combinedProgress = state.autoProgress + safeElapsed * autoOutput;
  const earned = Math.floor(combinedProgress);

  return {
    ...state,
    hacks: state.hacks + earned,
    autoProgress: combinedProgress - earned,
    offlineSeconds: safeElapsed,
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

  return {
    hacks: Math.floor(numberOr(candidate.hacks, fallback.hacks)),
    amplifierLevel: Math.min(UPGRADE_CONFIG.amplifier.maxLevel, Math.floor(numberOr(candidate.amplifierLevel, 0))),
    autohackerLevel: Math.min(UPGRADE_CONFIG.autohacker.maxLevel, Math.floor(numberOr(candidate.autohackerLevel, 0))),
    manualProgress: Math.min(0.9999, numberOr(candidate.manualProgress, 0)),
    autoProgress: Math.min(0.9999, numberOr(candidate.autoProgress, 0)),
    totalTyped: Math.floor(numberOr(candidate.totalTyped, 0)),
    totalManualMints: Math.floor(numberOr(candidate.totalManualMints, 0)),
    sessionStartedAt: numberOr(candidate.sessionStartedAt, now),
    lastSavedAt: numberOr(candidate.lastSavedAt, now),
  };
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
