import 'dotenv/config';
import { PrivateKey } from '@bsv/sdk';
import { addressOf, balanceOf, pay, txLink } from './chain.js';

/**
 * A simple AI agent that buys Sayonara Claims flight cover for its traveller and pays the premium in BSV
 * from its own wallet. The language model only decides whether to buy; the price and the payment are code.
 *
 *   npm run agent -- "LH 574" 2026-11-12
 */

const required = (name: string) => {
  const value = process.env[name];
  if (!value) throw new Error(`Set ${name} in bsv/.env (see .env.example)`);
  return value;
};

const [flight = 'LH 574', date = '2026-11-12'] = process.argv.slice(2);
const agentKey = PrivateKey.fromWif(required('BSV_AGENT_WIF'));
const pool = required('BSV_POOL_ADDRESS');
const premium = Number(process.env.BSV_PREMIUM_SATS ?? 1900);

type ToolCall = { function: { name: string; arguments: string } };
type ChatResponse = { choices?: { message?: { content?: string | null; tool_calls?: ToolCall[] } }[] };

const decide = async (): Promise<{ buy: boolean; reason: string }> => {
  if (!process.env.OPENAI_API_KEY) return { buy: true, reason: 'no OPENAI_API_KEY set, so the agent buys by default' };
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a travel agent. Your traveller asked you to protect their trip against long delays within their budget. ' +
            'Sayonara Claims cover pays out automatically, for any cause, when the flight arrives 3 hours late or more. ' +
            'If the cover fits, call buy_cover.',
        },
        {
          role: 'user',
          content: `Flight ${flight} on ${date}. Budget: 2500 satoshis. Cover costs ${premium} satoshis and pays 25000 satoshis if the flight lands 3h+ late.`,
        },
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'buy_cover',
            description: 'Pay the premium in BSV from the agent wallet and buy the cover',
            parameters: { type: 'object', properties: { reason: { type: 'string' } }, required: ['reason'] },
          },
        },
      ],
    }),
  });
  if (!response.ok) throw new Error(`OpenAI: HTTP ${response.status}`);
  const message = ((await response.json()) as ChatResponse).choices?.[0]?.message;
  const call = message?.tool_calls?.find(c => c.function.name === 'buy_cover');
  if (!call) return { buy: false, reason: message?.content ?? 'no answer' };
  return { buy: true, reason: (JSON.parse(call.function.arguments) as { reason?: string }).reason ?? '' };
};

const agentAddress = addressOf(agentKey);
console.log(`Agent wallet ${agentAddress}: ${await balanceOf(agentAddress)} sat`);
console.log(`Traveller's flight: ${flight} on ${date}. Premium: ${premium} sat to the cover pool ${pool}`);

const decision = await decide();
console.log(`Agent decision: ${decision.buy ? 'buy' : 'skip'} (${decision.reason})`);
if (!decision.buy) process.exit(0);

const txid = await pay(agentKey, pool, premium, `SAYONARA ${flight.replace(/\s/g, '')} ${date} >=180min`);
console.log(`Premium paid on BSV: ${txLink(txid)}`);
