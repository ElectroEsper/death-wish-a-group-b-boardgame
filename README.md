# Death Wish: A Group B Rally Game

A push-your-luck board game about the Group B rally era, with a browser version for playtesting and a weekly ranked rally.

- **Play:** drive the *Rally of the Week* (same seed for everyone, official rules) or free play with any seed.
- **Leaderboard:** one submission per name per week, no accounts. The server re-drives every run from its replay code, so times can't be faked.
- **Simulate / Numbers:** balance testing with bot strategies and tunable values.

## How it fits together

| File | What it is |
|---|---|
| `engine.js` | The rules. Shared by the page and the Worker, so both always agree. |
| `index.html` | The game page (GitHub Pages). |
| `site-config.js` | The leaderboard Worker's address. |
| `worker/` | Cloudflare Worker that checks and stores leaderboard runs. |

A rally is fully decided by its **seed** plus the player's **moves** (`0`–`3` = tyre choice, `s`/`c`/`f` = Safe/Committed/Flat Out). The page sends the moves; the Worker replays them with `engine.js` and stores the time it calculates.

## Setup

### 1. Turn on GitHub Pages

Repo **Settings → Pages → Build and deployment**: Source = *Deploy from a branch*, Branch = `main`, folder `/ (root)`. The game appears at `https://electroesper.github.io/death-wish-a-group-b-boardgame/`.

It works without a leaderboard; the Leaderboard tab just says it isn't connected.

### 2. Deploy the leaderboard Worker

Needs [Node.js](https://nodejs.org) 18+ on your computer.

```sh
cd worker
npm install
npx wrangler login                       # opens Cloudflare in your browser
npx wrangler kv namespace create LB      # prints an id = "…"
```

Paste that id into `worker/wrangler.toml` in place of `PASTE_YOUR_KV_NAMESPACE_ID_HERE`, then:

```sh
npx wrangler deploy                      # prints https://death-wish-leaderboard.<you>.workers.dev
```

### 3. Connect the page

1. Put the Worker address into `site-config.js`: `export const API_URL='https://death-wish-leaderboard.<you>.workers.dev';`
2. In `worker/wrangler.toml`, set `ALLOWED_ORIGIN = "https://electroesper.github.io"` and run `npx wrangler deploy` again, so only your site can submit.
3. Commit and push. Done.

## Changing the rules

Anything in `engine.js` that changes results needs **`RULES_VERSION` bumped**, then both:

- `npx wrangler deploy` (from `worker/`), and
- a push to `main` (for the page).

The weekly seed includes the rules version, so a new version means a fresh rally, and old pages are told to reload.

## Running locally

ES modules don't load from `file://`. From the repo root: `npx serve .` and open the address it prints. For the Worker: `cd worker && npx wrangler dev`, then point `site-config.js` at `http://localhost:8787` while testing.

## Notes and limits

- **No accounts.** The first browser to submit a name keeps it, via a secret saved in that browser. Clearing browser data loses the claim.
- **Practice is allowed.** The weekly seed is public, so players can drive it as often as they like before submitting. Think of it as a recce.
- **Free tier.** Cloudflare's free Workers and KV limits are far beyond what a hobby leaderboard needs. KV is eventually consistent, so in rare cases two near-simultaneous submissions from one name could both land.
