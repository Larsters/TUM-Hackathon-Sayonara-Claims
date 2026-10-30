import type { Price } from "@/demo/types";

export const formatPrice = (p: Price) => `${p.rail} · ${p.amount}`;

export const formatEur = (n: number) =>
  "€" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const shortHash = (hash: string) => `${hash.slice(0, 6)}…${hash.slice(-4)}`;
