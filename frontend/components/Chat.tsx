"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { script } from "@/demo/script";
import type { DemoState } from "@/lib/engine";
import { ChatCard } from "./ChatCard";
import { ArrowIcon } from "./Icons";
import { rise } from "./ui";

function TypingDots() {
  return (
    <span className="inline-flex gap-[5px] px-0.5 py-1.5" role="status" aria-label="Agent is typing">
      {[0, 0.15, 0.3].map((d) => (
        <span key={d} className="h-2 w-2 animate-blink rounded-full bg-faint" style={{ animationDelay: `${d}s` }} />
      ))}
    </span>
  );
}

function Hero() {
  const [first, say, rest] = script.hero.title;
  return (
    <motion.div {...rise} className="flex flex-col gap-3.5 pb-6">
      <h1 className="text-[60px] font-bold leading-none tracking-[-0.035em]">
        {first}
        <br />
        {say} <em className="rounded-lg bg-accent px-2.5 not-italic">{script.hero.highlight}</em>
        <br />
        {rest}
      </h1>
      <p className="max-w-[560px] text-[21px] leading-snug text-ink-2">{script.hero.text}</p>
    </motion.div>
  );
}

export function Chat({ state, onAdvance }: { state: DemoState; onAdvance: () => void }) {
  const scroller = useRef<HTMLDivElement>(null);

  // Keep the newest message in view: re-scroll when a message arrives or a streamed reply grows a line.
  const last = state.messages[state.messages.length - 1];
  const scrollKey = `${state.messages.length}:${last?.kind === "agent" ? Math.floor(last.text.length / 40) : 0}`;
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [scrollKey]);

  const empty = state.messages.length === 0 && !state.input;

  return (
    <section aria-label="Chat with the cover agent" className="flex min-h-0 flex-1 flex-col">
      <div ref={scroller} className="fade-top flex min-h-0 flex-1 flex-col overflow-y-auto px-8 pb-4 pt-4 [scrollbar-width:none]">
        <div className="mt-auto flex flex-col gap-4">
          {empty && <Hero />}
          <AnimatePresence initial={false}>
            {state.messages.map((m) => {
              if (m.kind === "user")
                return (
                  <motion.div key={m.id} {...rise} className="flex justify-end">
                    <div className="max-w-[78%] rounded-[20px] rounded-br-md bg-ink px-[18px] py-3.5 text-xl leading-snug text-white">
                      {m.text}
                    </div>
                  </motion.div>
                );
              if (m.kind === "agent")
                return (
                  <motion.div key={m.id} {...rise} className="flex items-end gap-3">
                    <span
                      aria-hidden="true"
                      className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-xl bg-accent text-[13px] font-bold text-ink"
                    >
                      {script.agent.initials}
                    </span>
                    <div className="max-w-[78%] rounded-[20px] rounded-bl-md bg-white px-[18px] py-3.5 text-xl leading-snug shadow-hair">
                      {m.typing ? <TypingDots /> : m.text}
                    </div>
                  </motion.div>
                );
              if (m.kind === "system")
                return (
                  <motion.div key={m.id} {...rise} className="flex justify-center">
                    <span className="rounded-full bg-accent px-[18px] py-2.5 text-[17px] font-bold text-ink">{m.text}</span>
                  </motion.div>
                );
              return (
                <motion.div key={m.id} {...rise}>
                  <ChatCard card={m.card} pressed={m.pressed} wallet={state.wallet} onAdvance={onAdvance} />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      <div className="shrink-0 px-8 pb-2 pt-3">
        <div className="flex min-h-[66px] items-center gap-3 rounded-full bg-white pl-[26px] pr-2.5 text-[19px] shadow-hair">
          {state.input ? (
            <span className="min-w-0 flex-1 truncate">
              {state.input}
              <span className="ml-0.5 inline-block h-[22px] w-0.5 animate-blink bg-ink align-middle" />
            </span>
          ) : (
            <span className="flex-1 text-faint">{script.agent.inputPlaceholder}</span>
          )}
          <button
            type="button"
            onClick={onAdvance}
            aria-label="Send"
            className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-full bg-accent text-ink"
          >
            <ArrowIcon />
          </button>
        </div>
      </div>
    </section>
  );
}
