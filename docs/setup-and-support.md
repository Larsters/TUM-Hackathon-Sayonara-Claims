# Setup, test funds and support

Collected from the hackathon Telegram group (export of 30 Oct 2026, 15:41) and the prize page.

## Rules that affect us

- **Build during the hackathon.** The organisers: "we require our hackers to build a unique idea that is catered
  towards our partners' proposed tracks during the hackathon". Open-source frameworks and starters are fine;
  a project prepared beforehand is not. Sayonara Claims is a new project, and we do not reuse EigenCover code.
- Up to 3 partner tracks per team. The TUM Blockchain / Adevar Labs audit credits are not a separate track:
  judges pick the best 3 projects across all tracks.
- Submission deadline: Sat 31 Oct, 15:00. Live judging at the partner booths starts at 15:00.

## Test funds and accounts

### Cardano (preprod)

| What | Where | Notes |
|---|---|---|
| Test ADA and tUSDM | https://dispenser.masumi.network/ | Recommended by the Masumi tech lead |
| Test ADA (alternative) | https://docs.cardano.org/cardano-testnets/tools/faucet | Official faucet; rate limited |
| More funds | DM Sandro (Masumi tech lead) in the Telegram group with your preprod address | He tops up on request |
| Sokosumi preprod account | https://preprod.sokosumi.com/signup | Use your own Personal Workspace |
| Sokosumi credits | In your own org, use the Stripe demo checkout with the test card `4242 4242 4242 4242` | Per Sandro; any future expiry date and CVC |
| Blockfrost preprod key | https://blockfrost.io | Free; needed for x402 on Cardano |
| Wallet | A browser wallet switched to the preprod network (for example Lace or Eternl) | |
| Explorer | https://preprod.cardanoscan.io | For transaction links in the demo |

### API3 (EVM testnet)

| What | Where | Notes |
|---|---|---|
| aUSD for paid AirnodeHub calls (x402, Base Sepolia) | https://api3dao.github.io/airnodehub-hackathon/faucet/ | The payer needs no ETH: the facilitator submits the transfer |
| Testnet USDC | https://faucet.circle.com | Listed on the prize page |
| Base Sepolia ETH | any Base Sepolia faucet | Needed to **deploy** our contract and submit responses (gas) |
| Starter | https://github.com/api3dao/airnodehub-hackathon-starter | Foundry, Node.js, pnpm |
| AeroDataBox Airnode | https://airnode-aerodatabox.fly.dev/ | Was briefly down on 30 Oct (intermittent, fixed). Cache every signed response we need |

Open question someone already asked in the group, still unanswered: **can `flightStatusOnDate` return flights
that have already landed (for example yesterday's)?** We depend on this. Ask Matej at the API3 booth.

## Funding the demo wallets

Testnets are practice blockchains. Their coins are free and worth nothing, but every transaction still pays a fee
in the chain's own coin, so each wallet needs a little of it.

| Wallet | Chain | Needs | Used for |
|---|---|---|---|
| Dev wallet `0xABC2d5C2CfDcE8467925923c833283A0B768C070` | Base Sepolia | ~0.001+ ETH | Gas: mint aUSD, deploy `FlightDelayCover`, create policies, settle |
| Cover pool `addr_test1qqmjn9gvslf6pcrhc7ncagjur4u2xuj46ataeqfkcx6hqejpp2es3m992vz0zzsjmy20sc80ehpmqhqv8pdnpa8sj34q4aperg` | Cardano preprod | ~350 tADA | Pays the 250 tADA payout; funds Ana's wallet |
| Ana (traveller) | Cardano preprod | ~50 tADA | Research fee (2) and premium (19). Funded from the pool |

Only two faucet claims are needed: ETH to the dev wallet, and tADA to the pool. The scripts move tADA from the pool to Ana.

1. **Base Sepolia ETH:** https://portal.cdp.coinbase.com/products/faucet (sign in, network Base Sepolia, token
   ETH, paste the dev wallet address). Alternatives: https://www.alchemy.com/faucets/base-sepolia, or ask the API3
   team at their booth.
2. **Test ADA:** https://docs.cardano.org/cardano-testnets/tools/faucet (environment Preprod Testnet, paste the pool
   address, solve the captcha). Alternatives: the Masumi dispenser with the code from the registration email, or
   DM Sandro (Masumi) with the pool address.
3. aUSD (for the paid AeroDataBox calls) is minted by script from the dev wallet once it has ETH:
   `npm run flight -- mint-ausd` in `settlement/`.

## People to ask

| Topic | Who | How |
|---|---|---|
| Masumi / Sokosumi technical | Phil (Masumi) | In person at the hackathon |
| Masumi / Sokosumi technical | Sandro (Masumi tech lead) | Remote: Telegram DM, or a 1:1 via https://calendly.com/sandro-schaier/hackathon |
| Cardano track, judging | Bora (Cardano Foundation) | In person, Cardano support topic on Telegram |
| API3 / AirnodeHub | Matej Falat (API3) | API3 booth, API3 support topic on Telegram |
| Programme, rules | Hackathon mentors | Table at the entrance (Fri until 18:00, Sat 09:00–15:00) |

Inspiration: Cardano's overview of previous winners from their Token2049 hackathon:
https://x.com/Cardano_CF/status/2108218814160662878

## Open questions other teams asked (watch for answers)

- Does a paid job through your own Masumi node, not through Sokosumi, count for the Cardano track?
- How does an agent get listed on Sokosumi, or should we use the Coworker route?
- Does the agent need a stable URL, or is a tunnel (cloudflared) acceptable?

## Safety

The organisers warned about scam DMs impersonating them. They never DM first. Never share a seed phrase or
private key, not even for "test funds".
