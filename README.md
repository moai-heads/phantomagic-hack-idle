# PHANTOMAGIC // HACK IDLE

A tiny terminal idle game for people who enjoy the look of movie hacking montages.

Type into the terminal to keep the manual node charged. Hold the rhythm for ten seconds and the node crystallizes into one **hack**. Spend hacks on upgrades: bring an autonomous hacker online, then click it again to improve its throughput. Your progress is saved locally in the browser.

## Run locally

```bash
npm start
```

Open <http://localhost:4173>.

## Controls

- Click the terminal input, then type or mash keys.
- Press `Enter` to submit a faux command to the live feed.
- Click an available upgrade card to buy it.
- Terminal commands: `help`, `status`, `scan`, and `clear`.

## Project shape

This is intentionally a no-build-step vanilla app:

- `index.html` — semantic game shell
- `styles.css` — monochrome CRT-inspired interface
- `app.js` — game loop, terminal feed, persistence, and upgrades

## License

MIT
