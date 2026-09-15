# PHANTOMAGIC // HACK IDLE

A tiny terminal idle game for people who enjoy the look of movie hacking montages.

Type anywhere while the game window is active to feed the manual node. The terminal auto-scrolls a fake line for every key and keeps a count of recent input in a note buffer without printing the raw keys. The manual node now mints one hack every two seconds at base speed; repeated keys are allowed for the current prototype. Spend hacks on upgrades: bring an autonomous hacker online, then click it again to improve its throughput. Your progress is saved locally in the browser.

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

## Project shape

This is intentionally a no-build-step vanilla app:

- `index.html` — semantic game shell
- `styles.css` — monochrome CRT-inspired interface
- `app.js` — game loop, terminal feed, persistence, and upgrades

## License

MIT
