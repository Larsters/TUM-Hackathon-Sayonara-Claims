"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { LogItem } from "@/lib/engine";
import { formatPrice } from "@/lib/format";
import { KindIcon } from "./Icons";
import { PriceChip, Spinner, rise } from "./ui";

export function LogRow({ item }: { item: LogItem }) {
  return (
    <div
      className={`grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 border-b-[1.5px] border-hair px-0.5 py-[11px] transition-opacity duration-300 ${
        item.status === "rejected" ? "opacity-45" : ""
      }`}
    >
      <KindIcon kind={item.kind} />
      <div>
        <div className="text-base font-bold">{item.title}</div>
        <div className="mt-0.5 text-[15px] leading-snug text-ink-2">{item.detail}</div>
      </div>
      <div className="flex flex-col items-end gap-1">
        {item.price && item.status === "done" && <PriceChip>{formatPrice(item.price)}</PriceChip>}
        {item.status === "running" && <Spinner />}
        {item.status === "done" && <span className="font-mono text-[13px] font-medium text-ok-fg">{item.doneLabel}</span>}
        {item.status === "rejected" && <span className="font-mono text-[13px] font-medium text-bad-fg">rejected</span>}
      </div>
    </div>
  );
}

/** Newest entries at the bottom; older ones slide up and fade out at the top. */
export function LogList({ items, empty }: { items: LogItem[]; empty: string }) {
  return (
    <div className="fade-top flex min-h-0 flex-1 flex-col justify-end overflow-hidden">
      {items.length === 0 && <div className="py-3 text-base text-faint">{empty}</div>}
      <AnimatePresence initial={false}>
        {items.map((item) => (
          <motion.div key={item.id} layout {...rise}>
            <LogRow item={item} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
