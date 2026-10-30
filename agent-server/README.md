# Agent server: Cardano preprod payments for Sayonara Claims

Built from the Cardano Foundation's [x402-express template](https://developers.cardano.org/templates/x402-express/).

| Piece | What it does | Chain |
|---|---|---|
| `POST /api/research` | The agent's research and quote, paid per request over **x402** (2 tADA to the cover pool) | Cardano preprod |
| `POST /demo/research` | Ana's agent pays `/api/research` over x402 and returns the quote and the payment transaction | Cardano preprod |
| `POST /demo/buy-policy` | Ana pays the premium to the pool; the policy terms go into the transaction metadata (CIP-20) | Cardano preprod |
| `GET /demo/wallets` | tADA balances of Ana and the pool | |
| `GET /demo/payouts` | Payouts the keeper sent | |
| `npm run keeper` | Watches `PolicySettled` on the `FlightDelayCover` contract (Base Sepolia) and sends each `PaidOut` payout from the pool to the traveller's Cardano address, once | both |

Amounts are in tADA; 1 tADA stands for €1 in the demo (research fee 2 tADA, premium 19, payout 250).

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
The pool needs about 260 tADA to pay a 250 tADA payout; Ana needs about 30.

The scripts use Koios and need no API key. Set `BLOCKFROST_PROJECT_ID` to use Blockfrost instead.

## Trust model

The settlement contract decides whether a policy pays out. The keeper only carries that decision to Cardano, so it
is a trusted step: whoever holds the pool wallet could refuse to pay. Roadmap: a Plutus validator that verifies the
Airnode signature on Cardano itself.
