"use client";

import { useState } from "react";
import { shortHash } from "@/lib/format";
import { CopyIcon } from "../Icons";

export function ChainBadge({ chain }: { chain: string }) {
  const cardano = chain.toLowerCase().includes("cardano");
  return (
    <span
      className={`whitespace-nowrap rounded-md px-2 py-[3px] font-mono text-[12px] font-medium ${
        cardano ? "bg-rule-bg text-rule-fg" : "bg-pay-bg text-pay-fg"
      }`}
    >
      {chain}
    </span>
  );
}

/** Shortened monospace hash with copy button and explorer link, for any transaction. */
export function TxLink({ hash, explorer, compact }: { hash: string; explorer: string; compact?: boolean }) {
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
    <div className={`flex items-center gap-2 rounded-[10px] bg-[#F2F4F7] pl-3 pr-1.5 font-mono ${compact ? "py-1 text-sm" : "py-1.5 text-base"}`}>
      <span className="flex-1">{shortHash(hash)}</span>
      <button
        type="button"
        onClick={copy}
        aria-label="Copy transaction hash"
        className={`grid place-items-center rounded-lg border-[1.5px] border-line bg-white text-ink ${compact ? "h-7 w-7" : "h-9 w-9"}`}
      >
        {copied ? <span className="text-xs">✓</span> : <CopyIcon />}
      </button>
      <a
        href={explorer}
        target="_blank"
        rel="noopener noreferrer"
        className="px-2 font-sans font-semibold text-ink underline decoration-accent decoration-2 underline-offset-4 hover:text-pay-fg"
      >
        Explorer ↗
      </a>
    </div>
  );
}
