"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useDemo } from "@/lib/useDemo";
import { Chat } from "./Chat";
import { EndSlide, Hud, PoolWidget, Stage, TopBar } from "./chrome";
import { FlightPanel, QuotePanel, SettlementPanel, TamperPanel } from "./panels";

export function Demo() {
  const { state, next, prev, reset, recording, toggleRecording } = useDemo();

  return (
    <Stage>
      <div className="flex h-full flex-col">
        <TopBar state={state} />
        <div className="grid min-h-0 flex-1 grid-cols-[55fr_45fr]">
          <div className="flex min-h-0 flex-col">
            <Chat state={state} onAdvance={next} />
            <Hud state={state} recording={recording} onPrev={prev} onNext={next} onReset={reset} onToggle={toggleRecording} />
          </div>

          <aside
            aria-label="Agent reasoning and settlement"
            className="mb-6 mr-6 flex min-h-0 flex-col gap-3.5 rounded-[22px] bg-white px-[26px] py-[22px] shadow-hair"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={state.panel}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.3 }}
                className="flex min-h-0 flex-1 flex-col gap-3.5"
              >
                {state.panel === "quote" && <QuotePanel state={state} />}
                {state.panel === "flight" && <FlightPanel state={state} />}
                {state.panel === "settlement" && <SettlementPanel state={state} />}
                {state.panel === "tamper" && <TamperPanel state={state} />}
              </motion.div>
            </AnimatePresence>
            <PoolWidget pool={state.pool} />
          </aside>
        </div>
        <AnimatePresence>{state.end && <EndSlide key="end" />}</AnimatePresence>
      </div>
    </Stage>
  );
}
