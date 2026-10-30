/**
 * The Sayonara Claims agent API, used by the live frontend.
 *
 * - POST /api/research is paid per request over x402 on Cardano preprod: the
 *   fee goes to the cover pool and buys one research run.
 * - POST /api/chat is the conversation (OpenAI); it never sets a number.
 * - POST /demo/research streams the research: the fee, real AeroDataBox data
 *   bought over x402 on Base Sepolia, the jurisdiction check and the price.
 * - POST /demo/buy-policy pays the premium on Cardano and registers the policy
 *   in FlightDelayCover on Base Sepolia.
 */
import { randomUUID } from "node:crypto";
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
import { BASESCAN, registerPolicy } from "./evm.js";
import { buildHistory } from "./history.js";
import { runAgentTurn, type ChatMessage } from "./llm.js";
import { EUR_PER_TADA, RESEARCH_FEE_LOVELACE } from "./quote.js";
import { runResearch, type CoverOption } from "./research.js";

config();
// The OpenAI key lives in the repository's root .env.
config({ path: "../.env" });

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
// The frontend runs on another port on this machine.
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
        description: "One flight-disruption research run and a priced cover quote",
        mimeType: "application/json",
      },
    },
    resourceServer,
  ),
);

// The paid resource: a ticket for one research run.
app.post("/api/research", (req, res) => {
  res.json({ ticket: randomUUID(), request: req.body ?? {}, paidAt: new Date().toISOString() });
});

// Ana's agent pays for the research over x402, exactly as an outside agent would, and returns the transaction.
const payResearchFee = async (body: unknown) => {
  const client = new x402Client().setSpendControls({
    allowedAssets: [{ network: "cardano:*", asset: "lovelace", maxAmountPerPayment: "5000000" }],
  });
  client.register(
    "cardano:*",
    new ExactCardanoClientScheme(toClientCardanoSigner({ mnemonic: anaMnemonic, network: NETWORK, provider: providerConfig() })),
  );
  const response = await wrapFetchWithPayment(fetch, client)(`http://localhost:${port}/api/research`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  if (!response.ok) throw new Error(`Research fee payment failed with HTTP ${response.status}`);
  return new x402HTTPClient(client).getPaymentSettleResponse(name => response.headers.get(name))?.transaction;
};

// Server-sent events: one line per research step.
app.post("/demo/research", async (req, res) => {
  const { flight, date, from, to } = (req.body ?? {}) as { flight?: string; date?: string; from?: string; to?: string };
  if (!flight || !date) {
    res.status(400).json({ error: "Send flight and date" });
    return;
  }
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.flushHeaders();
  const send = (event: unknown) => res.write(`data: ${JSON.stringify(event)}\n\n`);
  try {
    await runResearch({ flight, date, from, to }, send, () => payResearchFee({ flight, date }));
  } catch (error) {
    send({ type: "error", message: String(error) });
  }
  res.end();
});

app.post("/api/chat", async (req, res) => {
  try {
    const { messages = [], context = {} } = (req.body ?? {}) as { messages?: ChatMessage[]; context?: Record<string, unknown> };
    const turn = await runAgentTurn(messages, {
      ...context,
      today: new Date().toISOString().slice(0, 10),
      researchFee: "€0.50, paid per request over x402 (2 tADA on Cardano preprod)",
      history: buildHistory(),
    });
    res.json(turn);
  } catch (error) {
    res.status(502).json({ error: String(error) });
  }
});

// Ana pays the premium to the cover pool on Cardano, and the policy is registered in FlightDelayCover on Base.
app.post("/demo/buy-policy", async (req, res) => {
  try {
    const { flight, date, option } = (req.body ?? {}) as { flight?: string; date?: string; option?: CoverOption };
    if (!flight || !date || !option) {
      res.status(400).json({ error: "Send flight, date and option" });
      return;
    }
    const [premium, registration] = await Promise.all([
      pay({
        mnemonic: anaMnemonic,
        to: poolAddress,
        lovelace: BigInt(option.premiumLovelace),
        message: ["Sayonara Claims policy", `${flight} ${date}`, `pays EUR ${option.payoutEur} if >= ${option.thresholdMinutes} min late`],
      }),
      registerPolicy({
        flightNumber: flight,
        dateLocal: date,
        thresholdMinutes: option.thresholdMinutes,
        payoutLovelace: BigInt(option.payoutLovelace),
        payoutAddress: anaAddress,
      }),
    ]);
    res.json({
      premium: { transaction: premium, explorer: `${EXPLORER}/${premium}` },
      registration: { ...registration, explorer: `${BASESCAN}/${registration.transaction}` },
    });
  } catch (error) {
    res.status(502).json({ error: String(error) });
  }
});

app.get("/demo/wallets", async (_req, res) => {
  try {
    const [ana, pool] = await Promise.all([balance(anaAddress), balance(poolAddress)]);
    const toEur = (lovelace: bigint) => (Number(lovelace) / 1_000_000) * EUR_PER_TADA;
    res.json({
      eurPerTada: EUR_PER_TADA,
      ana: { address: anaAddress, lovelace: ana.toString(), display: formatAda(ana), eur: toEur(ana) },
      pool: { address: poolAddress, lovelace: pool.toString(), display: formatAda(pool), eur: toEur(pool) },
    });
  } catch (error) {
    res.status(502).json({ error: String(error) });
  }
});

app.get("/demo/history", (_req, res) => {
  res.json(buildHistory());
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
  res.json({ ok: true, llm: Boolean(process.env.OPENAI_API_KEY), base: Boolean(process.env.BASE_PRIVATE_KEY) });
});

app.listen(port, () => {
  console.log(`Sayonara Claims agent on http://localhost:${port}`);
  console.log(`Paid route: POST /api/research (${formatAda(RESEARCH_FEE_LOVELACE)} on ${NETWORK}, to the pool)`);
  console.log(`Facilitator: ${facilitatorUrl}`);
});
