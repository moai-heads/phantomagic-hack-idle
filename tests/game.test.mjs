import test from "node:test";
import assert from "node:assert/strict";
import {
  BASE_OFFLINE_SECONDS,
  UPGRADE_CONFIG,
  UPGRADE_IDS,
  applyOfflineProgress,
  buyUpgrade,
  createDefaultState,
  formatDuration,
  getAutoRate,
  getGlobalOutputMultiplier,
  getManualRate,
  getOfflineCapSeconds,
  getOfflineMultiplier,
  getRelayRate,
  getSyntaxBurstReward,
  getTerminalLineLimit,
  getUpgradeCost,
  getUpgradeLevel,
  getZeroDayChance,
  getZeroDayReward,
  isUpgradeUnlocked,
  normalizeState,
} from "../game.js";

test("new sessions start with empty score and two-second manual cycles", () => {
  const state = createDefaultState(123);
  assert.equal(state.hacks, 0);
  assert.equal(state.totalHacks, 0);
  assert.equal(getManualRate(state), 0.5);
  assert.equal(getAutoRate(state), 0);
});

test("upgrade costs scale and purchases spend hacks", () => {
  const state = { ...createDefaultState(), hacks: 20 };
  assert.equal(getUpgradeCost("amplifier", 0), 3);

  const result = buyUpgrade(state, "amplifier");
  assert.equal(result.ok, true);
  assert.equal(result.level, 1);
  assert.equal(result.state.hacks, 17);
  assert.ok(Math.abs(getManualRate(result.state) - 0.575) < 1e-12);
});

test("autohacker output is passive and amplifier boosts it", () => {
  const state = { ...createDefaultState(), autohackerLevel: 2, amplifierLevel: 1 };
  assert.ok(Math.abs(getAutoRate(state) - 0.224) < 1e-12);

  const progressed = applyOfflineProgress(state, 10);
  assert.equal(progressed.offlineGain, 2);
  assert.equal(progressed.hacks, 2);
  assert.equal(progressed.totalHacks, 2);
  assert.ok(Math.abs(progressed.autoProgress - 0.24) < 1e-12);
});

test("offline progress is capped and preserves partial charge", () => {
  const state = { ...createDefaultState(), autohackerLevel: 1, autoProgress: 0.5 };
  const progressed = applyOfflineProgress(state, 100000);
  assert.equal(progressed.offlineSeconds, BASE_OFFLINE_SECONDS);
  assert.equal(progressed.offlineGain, 2880);
  assert.equal(progressed.totalHacks, 2880);
  assert.equal(progressed.autoProgress, 0.5);
});

test("new powerups scale their matching systems", () => {
  const base = createDefaultState();
  const powered = {
    ...base,
    amplifierLevel: 2,
    autohackerLevel: 2,
    packetMirrorLevel: 1,
    rootAccessLevel: 1,
    botnetRelayLevel: 2,
  };

  assert.equal(getGlobalOutputMultiplier(powered), 1.2);
  assert.ok(getAutoRate(powered) > getAutoRate({ ...powered, packetMirrorLevel: 0 }));
  assert.ok(getRelayRate(powered) > 0);
  assert.ok(getManualRate(powered) > getManualRate(base));
});

test("offline powerups expand both the cap and the stored output", () => {
  const state = {
    ...createDefaultState(),
    autohackerLevel: 1,
    ghostProxyLevel: 2,
    terminalCacheLevel: 3,
  };
  assert.equal(getOfflineMultiplier(state), 1.5);
  assert.equal(getOfflineCapSeconds(state), BASE_OFFLINE_SECONDS + 8 * 60 * 60);

  const progressed = applyOfflineProgress(state, 10);
  assert.equal(progressed.offlineGain, 1);
  assert.ok(progressed.autoProgress > 0.49);
});

test("milestone, exploit, and scrubber rules expose predictable values", () => {
  const state = {
    ...createDefaultState(),
    syntaxBurstLevel: 3,
    zeroDayLevel: 4,
    logScrubberLevel: 5,
  };
  assert.equal(getSyntaxBurstReward(state), 6);
  assert.equal(getZeroDayChance(state), 0.06);
  assert.equal(getZeroDayReward(state), 40);
  assert.equal(getTerminalLineLimit(state), 39);
});

test("future upgrades unlock from lifetime hacks and cannot be bought early", () => {
  const state = { ...createDefaultState(), hacks: 9999, totalHacks: 0 };
  assert.equal(isUpgradeUnlocked(state, "packetMirror"), false);
  const locked = buyUpgrade(state, "packetMirror");
  assert.equal(locked.ok, false);
  assert.equal(locked.reason, "locked");

  const unlocked = { ...state, totalHacks: UPGRADE_CONFIG.packetMirror.unlockAt };
  assert.equal(isUpgradeUnlocked(unlocked, "packetMirror"), true);
  assert.equal(buyUpgrade(unlocked, "packetMirror").ok, true);
});

test("all planned powerups have bounded, normalizable levels", () => {
  assert.equal(UPGRADE_IDS.length, 14);
  const candidate = Object.fromEntries(
    UPGRADE_IDS.map((upgradeId) => [UPGRADE_CONFIG[upgradeId].stateKey, 999]),
  );
  const state = normalizeState(candidate, 50);

  for (const upgradeId of UPGRADE_IDS) {
    assert.equal(getUpgradeLevel(state, upgradeId), UPGRADE_CONFIG[upgradeId].maxLevel);
  }
});

test("corrupt saved values are normalized to safe ranges", () => {
  const state = normalizeState({ hacks: -4, manualProgress: 9, autohackerLevel: 999 }, 50);
  assert.equal(state.hacks, 0);
  assert.equal(state.totalHacks, 0);
  assert.equal(state.manualProgress, 0.9999);
  assert.equal(state.autohackerLevel, 12);
  assert.equal(state.sessionStartedAt, 50);
});

test("duration formatter keeps the HUD compact", () => {
  assert.equal(formatDuration(0), "00:00");
  assert.equal(formatDuration(65), "01:05");
  assert.equal(formatDuration(3661, true), "01:01:01");
});
