# PHANTOMAGIC // HACK IDLE

A tiny terminal idle game for people who enjoy the look of movie hacking montages.

Type anywhere while the game window is active to feed the manual node. The terminal auto-scrolls a fake line for every key and keeps a count of recent input in a note buffer without printing the raw keys. The manual node mints one hack every two seconds at base speed; repeated keys are allowed. The HUD shows both banked hacks and the all-time total completed. Spend hacks on 14 upgrade systems, including autonomous nodes, combo chains, timed scans, exploits, offline storage, firewall protection, and a log scrubber that both trims terminal noise and boosts autonomous output by 5% per level. The upgrade deck reveals dependent systems as their parent upgrades come online: the automation branch starts with Autohacker, the keyboard branch starts with Keystroke Amplifier, and child systems stay hidden until their prerequisites are installed. Your progress is saved locally in the browser.

## Run locally

```bash
npm start
```

Open <http://localhost:4173>.

## Controls

- Focus the game window, then type anywhere; no terminal field is required.
- Watch the terminal auto-scroll fake code and command lines.
- The note buffer keeps the most recent keyboard input.
- Click an available upgrade card to buy it.
- Upgrade cards only appear after their prerequisite parent nodes are installed; lifetime hack thresholds still gate purchases, and the sidebar explains each effect.
- The simulation uses a wall-clock timer separate from animation, so autohackers continue when the tab is visible but unfocused. Returning from a suspended/background tab flushes capped offline progress.
- Open the `INFINITE MODE` blueprint panel for the planned prestige loop.

## Project shape

This is intentionally a no-build-step vanilla app:

- `index.html` — semantic game shell
- `styles.css` — monochrome CRT-inspired interface
- `app.js` — wall-clock simulation, terminal feed, persistence, timed systems, and upgrades
- `game.js` — normalized save state and pure upgrade/economy rules
- `docs/INFINITE_MODE.md` — prestige-mode implementation plan

## Upgrade notes

- **Autohacker** is the first automation root. Level 1 reveals Packet Mirror and Ghost Proxy; later levels reveal Process Fork, Terminal Cache, Port Scanner, Log Scrubber, and Botnet Relay through their dependency chain.
- **Keystroke Amplifier** is the keyboard root. It reveals Syntax Burst and Key Sequence at its required levels.
- **Log Scrubber** has a real mechanical benefit: each level adds 5% autonomous output and reduces the retained terminal log by five lines, keeping the feed lean while passive nodes run faster.

## License

MIT
