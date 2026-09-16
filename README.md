# PHANTOMAGIC // HACK IDLE

A tiny terminal idle game for people who enjoy the look of movie hacking montages.

Type anywhere while the game window is active to feed the manual node. The terminal auto-scrolls a fake line for every key and keeps a count of recent input in a note buffer without printing the raw keys. The manual node mints one hack every two seconds at base speed; repeated keys are allowed. The HUD shows both banked hacks and the all-time total completed. Spend hacks on 14 upgrade systems, including autonomous nodes, combo chains, timed scans, exploits, offline storage, and firewall protection. Your progress is saved locally in the browser.

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
- Locked upgrades unlock as your lifetime hack total grows; the sidebar explains each effect.
- Open the `INFINITE MODE` blueprint panel for the planned prestige loop.

## Project shape

This is intentionally a no-build-step vanilla app:

- `index.html` — semantic game shell
- `styles.css` — monochrome CRT-inspired interface
- `app.js` — game loop, terminal feed, persistence, timed systems, and upgrades
- `game.js` — normalized save state and pure upgrade/economy rules
- `docs/INFINITE_MODE.md` — prestige-mode implementation plan

## License

MIT
