# Sayonara Claims · scripted demo

A scripted, offline demo of an AI agent that sells parametric flight-delay cover. A smart contract then pays out from signed flight data. There is no backend or LLM: the presenter steps through the story.

```bash
npm install
npm run dev        # http://localhost:3000
```

For the booth, run `npm run build && npm start`. The page needs no network once it is installed, because fonts are bundled through Fontsource.

## Controls

| Key | Action |
|---|---|
| → | next step |
| ← | previous step (shown fully played) |
| R | reset |
| H | recording mode (hides the step counter and buttons; they reappear on hover) |

The buttons inside the chat (Pay, Yes/No, Buy, Customise, Send) also advance the script, so a presenter can click instead of using the keyboard.

The stage is a fixed 1440×900 layout that scales to fit any screen or projector.

## Changing the story: `demo/script.ts`

Each entry in `steps` is one press of →. A step is a list of events, and `at` is milliseconds after the press:

```ts
{ id: "fee", label: "Research fee", events: [
  { at: 0,    type: "agent", text: "Sure. Researching this flight costs €0.50…" },
  { at: 1800, type: "card",  card: { id: "fee", variant: "payment", … } },
]}
```

Event types:

- `type`: types into the input letter by letter, then sends it as the traveller's message.
- `user`, `agent`, `system`: chat messages. `agent` messages show a typing indicator, then stream in word by word.
- `card`: a rich card in the chat (`payment`, `choice`, `policy`, `receipt`, `payout`).
- `press`: highlights a button on an earlier card, using the card `id` and button `id`.
- `source`: pays a source from `sources`. The coin flies, the wheel node lights up and a log entry appears. A source with `rejected` set fades out with that reason.
- `log`: a reasoning entry with a running → done/rejected status. `panel: "settlement"` puts it in the settlement panel instead of the reasoning panel.
- `calc`, `verdict`: pricing lines.
- `panel`: switches the right panel (`quote` · `flight` · `settlement` · `tamper`).
- `flight`, `flightStatus`: the plane animation and the status line.
- `check`, `forged`, `banner`: settlement checks, tamper attempts and their closing lines.
- `pool`, `wallet`: animated money movements.
- `end`: the closing slide.

Timing defaults (typing speed, word speed, how long running → done takes) are in `script.timing`. A step's clock runs until its last animation ends, so you never set durations by hand.

## Transactions and links: `demo/config.ts`

Before the demo, replace the placeholder hashes in `transactions.policy` (Cardano preprod) and `transactions.payout` (EVM testnet). Adjust the `explorer` URL builders if you use a different explorer or chain. The same file holds the pool's starting balance, the team names, the repo URL and the sponsor logos (put files in `/public` and set `logo`).

## Where things live

```
demo/      script.ts (story) · config.ts (tx, links) · types.ts
lib/       engine.ts (script + step + time → screen state) · useDemo.ts (clock, keys)
components/
  Demo.tsx        layout
  Chat.tsx        messages and input
  ChatCard.tsx    payment / choice / policy / receipt / payout cards
  SourceWheel.tsx agent and data sources, coin animation
  LogList.tsx     reasoning log
  panels.tsx      quote · flight · settlement · tamper panels
  chrome.tsx      top bar, cover pool, presenter controls, end slide, stage scaling
```

The engine is pure: the screen is a function of `(step, ms since step start)`. That makes ← exact, and you can later swap the script for real agent events without touching the components.

The accent colour is a single CSS variable, `--accent`, in `app/globals.css`.
