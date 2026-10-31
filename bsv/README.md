# BSV: cover premiums paid in BSV, by travellers and by their AI agents

Branch `bsv-track`. Sayonara Claims sells flight cover: €19, and €250 if you land 3h+ late, for any cause, with no
claim. This adds BSV payment rails for the cover pool, built with the BSV SDK (`@bsv/sdk`, ts-stack):

| Flow | Who pays | How | Code |
|---|---|---|---|
| Traveller buys cover | The traveller, from BSV Desktop or BSV Browser | `WalletClient.createAction` pays the premium to the cover pool. Keys never leave the wallet (non-custodial). | `frontend/app/bsv/page.tsx` |
| Agent buys cover for its traveller | An AI agent, from its own BSV key | The model decides whether to buy; the agent pays the premium to the pool with an `OP_RETURN` memo of the policy terms and broadcasts through Arcade (ARC). | `bsv/src/agent.ts`, `bsv/src/chain.ts` |

On testnet, 1900 sat stands for the €19 premium. Every payment links to WhatsOnChain.

## Run

Needs Node.js 22.17+.

```sh
cd bsv && npm install
npm run keys        # twice: one key for the agent, one for the cover pool
cp .env.example .env   # put the agent's WIF and the pool's address in .env
# fund the agent address with test BSV (ask the BSV support contact)
npm run balance
npm run agent -- "LH 574" 2026-11-12   # the agent decides, pays, prints the WhatsOnChain link
```

Traveller flow: put `NEXT_PUBLIC_BSV_POOL_ADDRESS` (and `NEXT_PUBLIC_BSV_NETWORK=test`) in `frontend/.env.local`, run
the frontend (`npm install && npm run dev -- -p 3100`), open http://localhost:3100/bsv with BSV Desktop running, then
*Connect BSV wallet* and *Pay premium*.

## Example transactions

Add WhatsOnChain links here after the first runs.

## Limits

The cover pool is a wallet the team controls, and the payout still runs on Cardano after the API3-checked settlement
on Base Sepolia. Paying payouts in BSV from a non-custodial pool is the next step.
