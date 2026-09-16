# Infinite mode blueprint

Infinite mode should turn a completed run into a repeatable breach loop instead of adding a hard level cap. It is planned as a prestige layer, not a second disconnected game.

## Player loop

1. **Reach the breach gate** — unlock the mode after buying `ROOT ACCESS V` and reaching the first lifetime-hack milestone.
2. **Breach** — press a clearly labelled `START INFINITE RUN` action. Banked hacks and ordinary upgrade levels reset for the run.
3. **Earn Ghost Fragments** — the breach reward is based on lifetime hacks, run depth, and the highest firewall tier cleared.
4. **Rebuild faster** — spend permanent Ghost Fragments on account-wide starting bonuses and new upgrade branches.
5. **Push the next firewall** — each infinite tier raises the target and adds one controlled complication, then repeats forever.

## Scaling rules

- Run target: `1,000 × 1.65^tier` hacks, rounded to a readable whole number.
- Firewall pressure: manual and passive output penalties grow gently and soft-cap at 50%.
- Fragment reward: `floor(sqrt(run hacks / 1,000) × (tier + 1))`, with a small first-clear bonus.
- Every fifth tier adds a new cosmetic terminal theme or node glyph; power growth stays mostly linear so old upgrades remain useful.
- Offline progress remains capped by `GHOST PROXY` and `TERMINAL CACHE`; infinite mode must not become an unattended exponential runaway.

## Permanent upgrades

The first fragment shop should contain three safe, legible choices:

- **Cold Start** — begin each run with a small bank of hacks.
- **Persistent Relay** — retain a fraction of Botnet Relay output between runs.
- **Deep Cache** — increase the infinite-mode offline cap.

Later additions can add starting amplifier tiers, cosmetic themes, and challenge modifiers. Permanent bonuses should be stored separately from the run state so a reset can never erase them accidentally.

## Implementation phases

### Phase 1 — state and save migration

- Add `mode`, `infiniteTier`, `runHacks`, `ghostFragments`, and `infiniteBest` to the normalized save model.
- Keep the current save key compatible; missing fields default to a standard-mode state.
- Extract breach rewards and target calculations into pure functions in `game.js`.

### Phase 2 — presentation and controls

- Add an `INFINITE MODE` panel beside the upgrade deck.
- Show the current tier, target, run progress, best tier, and fragment balance.
- Require a confirmation step that explains exactly what resets and what persists.
- Keep the normal mode playable if the panel is collapsed or unavailable.

### Phase 3 — prestige economy

- Add the three permanent fragment upgrades.
- Apply their modifiers to `createDefaultState`, offline progress, and node rates.
- Add migration tests, purchase tests, and a reset-preservation test.

### Phase 4 — challenge content

- Add one deterministic firewall modifier per tier band, such as shorter input windows or a temporary locked node.
- Add milestone terminal announcements and cosmetic unlocks.
- Add a debug-only way to simulate a tier for balancing without changing production saves.

## Guardrails

- No server or account is required; all progress remains local like the current game.
- Never delete permanent fragments during a normal session reset.
- Use deterministic formulas for rewards and seeded challenge rolls where possible, so reloads cannot duplicate a breach.
- Add a visible `RESET RUN` versus `RESET ALL LOCAL DATA` distinction before shipping the mode.

## Definition of done

Infinite mode is ready when a player can breach, receive a deterministic fragment reward, buy a permanent bonus, start the next tier, reload the page without losing either layer of progress, and complete the loop without the normal upgrade cards becoming unusable.
