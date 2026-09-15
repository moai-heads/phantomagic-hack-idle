import test from "node:test";
import assert from "node:assert/strict";
import {
  applyOfflineProgress,
  buyUpgrade,
  createDefaultState,
  formatDuration,
  getAutoRate,
  getManualRate,
  getUpgradeCost,
  normalizeState,
} from "../game.js";

test("new sessions start with empty score and ten-second manual cycles", () => {
  const state = createDefaultState(123);
  assert.equal(state.hacks, 0);
  assert.equal(getManualRate(state), 0.1);
  assert.equal(getAutoRate(state), 0);
});

test("upgrade costs scale and purchases spend hacks", () => {
  const state = { ...createDefaultState(), hacks: 20 };
  assert.equal(getUpgradeCost("amplifier", 0), 3);

  const result = buyUpgrade(state, "amplifier");
  assert.equal(result.ok, true);
  assert.equal(result.level, 1);
  assert.equal(result.state.hacks, 17);
  assert.ok(Math.abs(getManualRate(result.state) - 0.115) < 1e-12);
});

test("autohacker output is passive and amplifier boosts it", () => {
  const state = { ...createDefaultState(), autohackerLevel: 2, amplifierLevel: 1 };
  assert.ok(Math.abs(getAutoRate(state) - 0.224) < 1e-12);

  const progressed = applyOfflineProgress(state, 10);
  assert.equal(progressed.offlineGain, 2);
  assert.equal(progressed.hacks, 2);
  assert.ok(Math.abs(progressed.autoProgress - 0.24) < 1e-12);
});

test("offline progress is capped and preserves partial charge", () => {
  const state = { ...createDefaultState(), autohackerLevel: 1, autoProgress: 0.5 };
  const progressed = applyOfflineProgress(state, 100000);
  assert.equal(progressed.offlineSeconds, 28800);
  assert.equal(progressed.offlineGain, 2880);
  assert.equal(progressed.autoProgress, 0.5);
});

test("corrupt saved values are normalized to safe ranges", () => {
  const state = normalizeState({ hacks: -4, manualProgress: 9, autohackerLevel: 999 }, 50);
  assert.equal(state.hacks, 0);
  assert.equal(state.manualProgress, 0.9999);
  assert.equal(state.autohackerLevel, 12);
  assert.equal(state.sessionStartedAt, 50);
});

test("duration formatter keeps the HUD compact", () => {
  assert.equal(formatDuration(0), "00:00");
  assert.equal(formatDuration(65), "01:05");
  assert.equal(formatDuration(3661, true), "01:01:01");
});
