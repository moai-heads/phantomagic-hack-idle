# PHANTOMAGIC // HACK IDLE

A tiny terminal idle game for people who enjoy the look of movie hacking montages.

Type different keys into the terminal to keep the manual node charged. Keep a varied input rhythm for one second and the node crystallizes into one **hack**. Repeating one key, including a held key, does not keep the charge alive. Spend hacks on upgrades: bring an autonomous hacker online, then click it again to improve its throughput. Your progress is saved locally in the browser.

## Run locally

```bash
npm start
```

Open <http://localhost:4173>.

## Controls

- Click the terminal input, then type or mash different keys. Repeating one key does not charge the node.
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
