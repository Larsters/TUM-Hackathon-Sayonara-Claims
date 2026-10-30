# Agent server: Cardano preprod payments for Sayonara Claims

Built from the Cardano Foundation's [x402-express template](https://developers.cardano.org/templates/x402-express/).

| Route | What it does | Chain |
|---|---|---|
| `POST /api/chat` | The conversation (OpenAI). The model talks and extracts the flight; it never sets a price, trigger or payout | |
| `POST /api/research` | Paid per request over **x402**: 2 tADA to the cover pool buys one research run | Cardano preprod |
| `POST /demo/research` | Streams the research as server-sent events: the x402 fee (paid by Ana's agent), the flight schedule and the live departure board bought from **AeroDataBox over x402 in aUSD**, scripted extra sources, the jurisdiction check and the deterministic price | both |
| `POST /demo/buy-policy` | Ana pays the premium to the pool (policy terms in CIP-20 metadata) **and** the policy is registered in `FlightDelayCover` | both |
| `GET /demo/wallets` | tADA balances of Ana and the pool | Cardano preprod |
| `GET /demo/history` | Vasiliy's past trips: LH 501 Rio → Frankfurt, a replay of a real flight that landed 7h 08m late and was paid out | |
| `GET /demo/payouts` | Payouts the keeper sent | |
| `npm run keeper` | Watches `PolicySettled` on Base Sepolia and sends each `PaidOut` payout from the pool to the traveller on Cardano, once | both |

What is real and what is scripted in the research: the fee, the flight schedule, the departure board and natural
events near the route (NASA EONET) are real paid calls; the other five sources (aircraft rotation, route weather,
airspace notices, strike signals, travel blog) return scripted findings. The jurisdiction rules (`src/jurisdiction.ts`) and the price (`src/research.ts`) are deterministic code.

The quote is in euros; on-chain 1 tADA stands for €5 (research fee 2 tADA, premium €19 = 3.8 tADA, payout €250 = 50 tADA).

## Run

```sh
npm install
cp .env.example .env    # then fill in the wallets, or run `npm run wallet` twice
npm run balances        # both wallets need test ADA
npm run server          # http://localhost:4021
npm run keeper          # needs COVER_ADDRESS
```

Test ADA: the [Cardano faucet](https://docs.cardano.org/cardano-testnets/tools/faucet) (choose Preprod) or the
[Masumi dispenser](https://dispenser.masumi.network/) (needs the verification code from the Masumi registration email).
The pool needs about 60 tADA to pay one 50 tADA payout; `npm run fund-ana` moves 20 tADA from the pool to Ana.

The scripts use Koios and need no API key. Set `BLOCKFROST_PROJECT_ID` to use Blockfrost instead.

## Trust model

The settlement contract decides whether a policy pays out. The keeper only carries that decision to Cardano, so it
is a trusted step: whoever holds the pool wallet could refuse to pay. Roadmap: a Plutus validator that verifies the
Airnode signature on Cardano itself.
