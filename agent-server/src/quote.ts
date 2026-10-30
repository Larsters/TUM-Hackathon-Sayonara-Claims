/**
 * Money on testnet. Quotes are in euros; on Cardano preprod 1 tADA stands for
 * €5, so the €250 payout is 50 tADA. The research fee is a flat 2 tADA, about
 * the smallest payment Cardano allows.
 */
export const RESEARCH_FEE_LOVELACE = 2_000_000n;
export const EUR_PER_TADA = 5;
export const eurToLovelace = (eur: number) => BigInt(Math.round((eur / EUR_PER_TADA) * 1_000_000));
