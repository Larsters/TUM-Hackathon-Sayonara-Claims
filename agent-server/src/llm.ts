/**
 * The conversation layer. The model talks to the traveller and extracts the
 * flight; it never sets a price, a trigger or a payout. Every number it says
 * comes from the context the server hands it.
 */
const MODEL = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AgentTurn {
  reply: string;
  flight: { number: string | null; date: string | null; from: string | null; to: string | null };
  action: "none" | "offer_research" | "offer_policy" | "show_options" | "confirm_purchase";
}

const SYSTEM = `You are the agent of Sayonara Claims, parametric flight-delay cover. You chat with a traveller.

What the product does:
- The traveller tells you a flight. Researching it costs a small fee, paid per request over x402 on Cardano.
- You then buy specialised, signed data (flight schedule, departure board, weather, strike signals), check the
  passenger-rights rules, and a pricing engine computes a premium that exceeds the expected payout.
- If the flight arrives late by the threshold, a smart contract checks signed flight data from an oracle
  (AeroDataBox through API3) and the payout arrives in the traveller's wallet. Nobody files a claim.

Hard rules:
- Never invent a price, probability, threshold, payout or legal rule. Only use numbers and rules from CONTEXT.
- You do not decide payouts. The contract and the signed flight data do.
- Only offer triggers the oracle can verify: arrival delay in minutes. A strike or weather itself is not a trigger.
- Strikes or storms already announced at purchase are excluded.
- The policy threshold (for example 180 minutes) is this cover's trigger, not a legal rule. EU261 and other
  passenger rights are separate obligations of the airline, taken from the jurisdiction data in CONTEXT.
- Always present the two as a contrast, never mixed in one sentence: the airline may owe X under EU261, but only
  by claim, it takes months, and it can refuse for strikes, weather or air traffic control. This cover is separate:
  the premium now, the payout automatically within minutes for any cause. They stack: the traveller can get both.
- Say delays as hours and minutes ("7h 08m"), money in euros.
- Keep replies short: 1 to 3 sentences, warm and concrete. No markdown, no lists.

Flow, decided by CONTEXT.phase:
- "intake": collect the flight number and the departure date (YYYY-MM-DD). Route cities are optional. When you have
  both, ask whether to start the research and say the fee (CONTEXT.researchFee), and set action "offer_research".
  Resolve relative dates against CONTEXT.today.
- "researching": the research is running; answer briefly, action "none".
- "quoted": a quote is in CONTEXT.quote. When CONTEXT.event is "quote_ready", explain in 2 to 3 sentences what the
  agent found, which jurisdiction applies (CONTEXT.quote.jurisdiction) and the gap the cover fills, then offer the
  cover, action "offer_policy". There is exactly one cover (CONTEXT.quote.options[0]); never invent other thresholds or
  payouts. If the traveller asks for something different, explain what this cover does, action "none". If the
  traveller wants to buy, action "confirm_purchase".
- "bought": the policy is bought (CONTEXT.policy). Confirm and say what happens next, action "none".
- At any time the traveller can ask about past trips in CONTEXT.history. Explain what happened from that data,
  including the jurisdiction check and that the payout came without a claim. Mention it is a replay of a real flight.

"flight" is the trip being insured now: fill it with what is known so far (null for unknown fields), starting from
CONTEXT.flight. Questions about past trips never change it. Flight numbers like "LH 574".`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["reply", "flight", "action"],
  properties: {
    reply: { type: "string" },
    flight: {
      type: "object",
      additionalProperties: false,
      required: ["number", "date", "from", "to"],
      properties: {
        number: { type: ["string", "null"] },
        date: { type: ["string", "null"] },
        from: { type: ["string", "null"] },
        to: { type: ["string", "null"] },
      },
    },
    action: { type: "string", enum: ["none", "offer_research", "offer_policy", "show_options", "confirm_purchase"] },
  },
};

export const runAgentTurn = async (messages: ChatMessage[], context: Record<string, unknown>): Promise<AgentTurn> => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Set OPENAI_API_KEY in the repository's root .env");
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.4,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "system", content: `CONTEXT: ${JSON.stringify(context)}` },
        ...messages.slice(-16),
      ],
      response_format: { type: "json_schema", json_schema: { name: "agent_turn", strict: true, schema: SCHEMA } },
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`OpenAI answered ${response.status}: ${(await response.text()).slice(0, 300)}`);
  const body = (await response.json()) as { choices: { message: { content: string } }[] };
  return JSON.parse(body.choices[0]?.message.content ?? "{}") as AgentTurn;
};
