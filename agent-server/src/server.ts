/**
 * The Sayonara Claims agent API.
 *
 * - POST /api/research is paid per request over x402 on Cardano preprod: the
 *   fee goes to the cover pool, and the response is the agent's quote.
 * - The /demo routes let the frontend drive the demo: each one makes a real
 *   preprod transaction from Ana's demo wallet and returns its hash.
 */
import { readFileSync } from "node:fs";
import { config } from "dotenv";
import express from "express";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { toClientCardanoSigner } from "@x402/cardano";
import { ExactCardanoScheme as ExactCardanoServerScheme } from "@x402/cardano/exact/server";
import { ExactCardanoScheme as ExactCardanoClientScheme } from "@x402/cardano/exact/client";
import { wrapFetchWithPayment, x402Client, x402HTTPClient } from "@x402/fetch";
import { balance, EXPLORER, formatAda, NETWORK, pay, providerConfig } from "./cardano.js";
import { buildQuote, RESEARCH_FEE_LOVELACE } from "./quote.js";

config();

const requireEnv = (name: string) => {
  const value = process.env[name];
  if (!value) {
    console.error(`Set ${name} in .env (see .env.example)`);
    process.exit(1);
  }
  return value;
};

const poolAddress = requireEnv("POOL_ADDRESS");
const anaMnemonic = requireEnv("ANA_MNEMONIC");
const anaAddress = requireEnv("ANA_ADDRESS");
const facilitatorUrl = requireEnv("FACILITATOR_URL");
const port = Number(process.env.SELLER_PORT ?? 4021);
const KEEPER_LOG = "keeper-log.json";

const resourceServer = new x402ResourceServer(new HTTPFacilitatorClient({ url: facilitatorUrl }));
resourceServer.register(NETWORK, new ExactCardanoServerScheme());

const app = express();
app.use(express.json());
// The demo frontend runs on another port on this machine.
app.use((_req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, PAYMENT-SIGNATURE");
  res.setHeader("Access-Control-Expose-Headers", "PAYMENT-REQUIRED, PAYMENT-RESPONSE");
  next();
});
app.options("*", (_req, res) => res.sendStatus(204));

app.use(
  paymentMiddleware(
    {
      "POST /api/research": {
        accepts: [
          {
            scheme: "exact",
            network: NETWORK,
            price: { amount: RESEARCH_FEE_LOVELACE.toString(), asset: "lovelace" },
            payTo: poolAddress,
          },
        ],
        description: "Flight-disruption research and a priced cover quote",
        mimeType: "application/json",
      },
    },
    resourceServer,
  ),
);

app.post("/api/research", (req, res) => {
  const { flight = "XX123", date = "2026-11-12" } = (req.body ?? {}) as { flight?: string; date?: string };
  res.json(buildQuote(flight, date));
});

// Ana's agent pays for the research over x402, exactly as an outside agent would.
app.post("/demo/research", async (req, res) => {
  try {
    const client = new x402Client().setSpendControls({
      allowedAssets: [{ network: "cardano:*", asset: "lovelace", maxAmountPerPayment: "5000000" }],
    });
    client.register(
      "cardano:*",
      new ExactCardanoClientScheme(
        toClientCardanoSigner({ mnemonic: anaMnemonic, network: NETWORK, provider: providerConfig() }),
      ),
    );
    const response = await wrapFetchWithPayment(fetch, client)(`http://localhost:${port}/api/research`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body ?? {}),
    });
    if (!response.ok) throw new Error(`Research payment failed with HTTP ${response.status}`);
    const receipt = new x402HTTPClient(client).getPaymentSettleResponse(name => response.headers.get(name));
    res.json({
      quote: await response.json(),
      payment: { transaction: receipt?.transaction, explorer: `${EXPLORER}/${receipt?.transaction}` },
    });
  } catch (error) {
    res.status(502).json({ error: String(error) });
  }
});

// Ana pays the premium to the cover pool. The metadata records the policy terms on-chain.
app.post("/demo/buy-policy", async (req, res) => {
  try {
    const { flight = "XX123", date = "2026-11-12", premium = 19, payout = 250, thresholdMinutes = 180 } =
      (req.body ?? {}) as Record<string, string | number>;
    const transaction = await pay({
      mnemonic: anaMnemonic,
      to: poolAddress,
      lovelace: BigInt(Math.round(Number(premium) * 1_000_000)),
      message: ["Sayonara Claims policy", `${flight} ${date}`, `pays ${payout} if >= ${thresholdMinutes} min late`],
    });
    res.json({ transaction, explorer: `${EXPLORER}/${transaction}` });
  } catch (error) {
    res.status(502).json({ error: String(error) });
  }
});

app.get("/demo/wallets", async (_req, res) => {
  try {
    const [ana, pool] = await Promise.all([balance(anaAddress), balance(poolAddress)]);
    res.json({
      ana: { address: anaAddress, lovelace: ana.toString(), display: formatAda(ana) },
      pool: { address: poolAddress, lovelace: pool.toString(), display: formatAda(pool) },
    });
  } catch (error) {
    res.status(502).json({ error: String(error) });
  }
});

// Payouts that the keeper has sent, newest last.
app.get("/demo/payouts", (_req, res) => {
  try {
    res.json(JSON.parse(readFileSync(KEEPER_LOG, "utf8")));
  } catch {
    res.json([]);
  }
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.listen(port, () => {
  console.log(`Sayonara Claims agent on http://localhost:${port}`);
  console.log(`Paid route: POST /api/research (${formatAda(RESEARCH_FEE_LOVELACE)} on ${NETWORK}, to the pool)`);
  console.log(`Facilitator: ${facilitatorUrl}`);
});
