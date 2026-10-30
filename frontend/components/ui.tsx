"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { config } from "@/demo/config";
import type { TxKey } from "@/demo/types";
import { shortHash } from "@/lib/format";
import { CopyIcon } from "./Icons";

export const rise = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0 },
  transition: { duration: 0.35, ease: "easeOut" },
} as const;

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <span className="text-xs font-bold uppercase tracking-[0.1em] text-muted">{children}</span>;
}

export function PriceChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="whitespace-nowrap rounded-full border-[1.5px] border-accent bg-white px-2.5 py-1 font-mono text-sm text-ink">
      {children}
    </span>
  );
}

export function Spinner({ label = "running" }: { label?: string }) {
  return (
    <motion.span
      role="status"
      aria-label={label}
      className="block h-4 w-4 rounded-full border-2 border-line border-t-accent"
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
    />
  );
}

/** Shortened monospace hash with copy button and explorer link. */
export function TxHash({ tx }: { tx: TxKey }) {
  const { hash, explorer } = config.transactions[tx];
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(hash);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard can be blocked; the explorer link still works */
    }
  };
  return (
    <div className="flex items-center gap-2.5 rounded-[10px] bg-[#F2F4F7] py-1.5 pl-3 pr-1.5 font-mono text-base">
      <span className="flex-1">{shortHash(hash)}</span>
      <button
        type="button"
        onClick={copy}
        aria-label="Copy transaction hash"
        className="grid h-9 w-9 place-items-center rounded-lg border-[1.5px] border-line bg-white text-ink"
      >
        {copied ? <span className="text-xs">✓</span> : <CopyIcon />}
      </button>
      <a
        href={explorer(hash)}
        target="_blank"
        rel="noopener noreferrer"
        className="px-2 font-sans text-base font-semibold text-ink underline decoration-accent decoration-2 underline-offset-4 hover:text-pay-fg"
      >
        Explorer ↗
      </a>
    </div>
  );
}
