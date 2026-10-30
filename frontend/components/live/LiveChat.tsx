"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { CoverOption } from "@/lib/api";
import type { Live, LiveCard } from "@/lib/useLive";
import { ArrowIcon } from "../Icons";
import { Eyebrow, PriceChip, rise } from "../ui";
import { TxLink } from "./TxLink";

const SUGGESTIONS = [
  "I'm flying LH 574 from Munich on 12 November. Can I get cover if it's badly delayed?",
  "What happened with my Rio flight last week?",
];

function TypingDots() {
  return (
    <span className="inline-flex gap-[5px] px-0.5 py-1.5" role="status" aria-label="Agent is typing">
      {[0, 0.15, 0.3].map(d => (
        <span key={d} className="h-2 w-2 animate-blink rounded-full bg-faint" style={{ animationDelay: `${d}s` }} />
      ))}
    </span>
  );
}

function Button({ children, onClick, primary, disabled }: { children: React.ReactNode; onClick?: () => void; primary?: boolean; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`min-h-[46px] rounded-full border-[1.5px] px-[22px] text-[17px] font-bold transition-all duration-300 disabled:opacity-40 ${
        primary ? "border-ink bg-ink text-white hover:bg-ink-2" : "border-ink bg-white text-ink hover:bg-soft"
      }`}
    >
      {children}
    </button>
  );
}

function Done({ label }: { label: string }) {
  return <span className="inline-flex min-h-[46px] items-center rounded-full border-[1.5px] border-ok-line bg-ok-bg px-[22px] text-[17px] font-bold text-ok-deep">{label}</span>;
}

const shell = "relative ml-[50px] max-w-[600px] rounded-2xl bg-white shadow-card";
const hours = (minutes: number) => `${minutes / 60}h`;
const tada = (lovelace: string) => `${(Number(lovelace) / 1e6).toFixed(1)} tADA`;

function CardView({ card, done, live }: { card: LiveCard; done?: string; live: Live }) {
  switch (card.kind) {
    case "fee":
      return (
        <div className={`${shell} flex flex-col gap-3 px-[22px] py-[18px]`}>
          <Eyebrow>Research fee · paid per request</Eyebrow>
          <div className="flex flex-wrap items-center gap-2.5">
            <p className="text-lg text-ink-2">
              Flight research for {card.flight} on {card.date}
            </p>
            <PriceChip>x402 · €0.50 · 2 tADA</PriceChip>
          </div>
          {done ? <Done label={done} /> : <div><Button primary onClick={live.startResearch}>Pay €0.50</Button></div>}
          {live.fee.status === "pending" && done && <span className="font-mono text-sm text-muted">Settling on Cardano preprod… the agent already started buying data</span>}
          {live.fee.explorer && done && <TxLink hash={live.fee.explorer.split("/").pop() ?? ""} explorer={live.fee.explorer} />}
        </div>
      );

    case "policy":
      return (
        <div className={`${shell} grid grid-cols-[minmax(0,1fr)_160px] overflow-hidden`}>
          <div className="flex flex-col gap-2.5 px-[22px] py-[18px]">
            <Eyebrow>Your cover · {card.flight.number}</Eyebrow>
            <div className="text-[38px] font-bold tracking-[-0.03em]">
              €{card.option.premiumEur}
              <span className="mx-1 inline-block rounded-lg bg-accent px-2">→</span>€{card.option.payoutEur}
            </div>
            <p className="text-lg leading-snug text-ink-2">
              if you arrive {hours(card.option.thresholdMinutes)}+ late, for any reason. Paid automatically, no claim to file.
            </p>
            {done ? (
              <Done label={done} />
            ) : (
              <div className="flex gap-2.5">
                <Button primary onClick={() => live.buy(card.option)}>Buy</Button>
                <Button onClick={live.showOptions}>Customise</Button>
              </div>
            )}
          </div>
          <div className="flex flex-col justify-between gap-3 border-l-2 border-dashed border-line bg-stub px-4 py-[18px]">
            {[
              { label: "Flight", lines: [card.flight.number, card.flight.date] },
              { label: "Route", lines: [`${card.flight.from.iata ?? "?"} → ${card.flight.to.iata ?? "?"}`] },
              { label: "Trigger", lines: [`arrival ≥ ${card.option.thresholdMinutes} min late`] },
            ].map(s => (
              <div key={s.label}>
                <Eyebrow>{s.label}</Eyebrow>
                <div className="font-mono text-[15px] leading-normal">
                  {s.lines.map(l => (
                    <div key={l}>{l}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    case "options":
      return (
        <div className={`${shell} flex flex-col gap-3 px-[22px] py-[18px]`}>
          <Eyebrow>Choose your cover</Eyebrow>
          {done ? (
            <Done label={done} />
          ) : (
            <div className="flex flex-wrap gap-2.5">
              {card.options.map((o: CoverOption) => (
                <Button key={o.id} primary={o.id === "standard"} onClick={() => live.buy(o)}>
                  {hours(o.thresholdMinutes)}+ late → €{o.payoutEur} for €{o.premiumEur}
                </Button>
              ))}
            </div>
          )}
        </div>
      );

    case "receipt":
      return (
        <div className={`${shell} grid grid-cols-[minmax(0,1fr)_160px] overflow-hidden`}>
          <div className="flex flex-col gap-2.5 px-[22px] py-[18px]">
            <Eyebrow>Policy bought · on two chains</Eyebrow>
            <p className="text-lg text-ink-2">
              <strong className="text-ink">Premium €{card.option.premiumEur}</strong> · {tada(card.option.premiumLovelace)} on Cardano preprod
            </p>
            <TxLink hash={card.purchase.premium.transaction} explorer={card.purchase.premium.explorer} />
            <p className="text-lg text-ink-2">
              <strong className="text-ink">Registered in FlightDelayCover</strong> · Base Sepolia
            </p>
            <TxLink hash={card.purchase.registration.transaction} explorer={card.purchase.registration.explorer} />
          </div>
          <div className="flex flex-col justify-between gap-2 border-l-2 border-dashed border-line bg-stub px-4 py-[18px]">
            <Eyebrow>Policy</Eyebrow>
            <div className="font-mono text-2xl">#{card.purchase.registration.policyId ?? "—"}</div>
            <div className="font-mono text-[15px]">
              €{card.option.payoutEur} if ≥ {card.option.thresholdMinutes} min
            </div>
            <div className="barcode h-7" aria-hidden="true" />
          </div>
        </div>
      );
  }
}

export function LiveChat({ live }: { live: Live }) {
  const [input, setInput] = useState("");
  const scroller = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [live.messages]);

  const submit = (text: string) => {
    if (!text.trim() || live.busy) return;
    void live.send(text);
    setInput("");
    field.current?.focus();
  };

  const empty = live.messages.length === 0;

  return (
    <section aria-label="Chat with the cover agent" className="flex min-h-0 flex-1 flex-col">
      <div ref={scroller} className="fade-top flex min-h-0 flex-1 flex-col overflow-y-auto px-8 pb-4 pt-4 [scrollbar-width:none]">
        <div className="mt-auto flex flex-col gap-4">
          {empty && (
            <motion.div {...rise} className="flex flex-col gap-3.5 pb-4">
              <h1 className="text-[60px] font-bold leading-none tracking-[-0.035em]">
                Late flight?
                <br />
                Say <em className="rounded-lg bg-accent px-2.5 not-italic">sayonara</em>
                <br />
                to claims.
              </h1>
              <p className="max-w-[580px] text-[21px] leading-snug text-ink-2">
                Tell the agent your flight. It buys the data it needs, checks your passenger rights and prices cover that
                pays out by itself when you land late.
              </p>
              <div className="flex flex-col items-start gap-2 pt-2">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => submit(s)}
                    className="rounded-full border-[1.5px] border-line bg-white px-4 py-2 text-left text-[16px] text-ink-2 hover:border-ink"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
          <AnimatePresence initial={false}>
            {live.messages.map(m => {
              if (m.kind === "user")
                return (
                  <motion.div key={m.id} {...rise} className="flex justify-end">
                    <div className="max-w-[78%] rounded-[20px] rounded-br-md bg-ink px-[18px] py-3.5 text-xl leading-snug text-white">{m.text}</div>
                  </motion.div>
                );
              if (m.kind === "agent" || m.kind === "typing")
                return (
                  <motion.div key={m.id} {...rise} className="flex items-end gap-3">
                    <span aria-hidden="true" className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-xl bg-accent text-[13px] font-bold text-ink">
                      SC
                    </span>
                    <div className="max-w-[78%] rounded-[20px] rounded-bl-md bg-white px-[18px] py-3.5 text-xl leading-snug shadow-hair">
                      {m.kind === "typing" ? <TypingDots /> : m.text}
                    </div>
                  </motion.div>
                );
              if (m.kind === "system")
                return (
                  <motion.div key={m.id} {...rise} className="flex justify-center">
                    <span className={`rounded-full px-[18px] py-2.5 text-[16px] font-bold ${m.tone === "bad" ? "bg-bad-bg text-bad-fg" : "bg-accent text-ink"}`}>
                      {m.text}
                    </span>
                  </motion.div>
                );
              if (m.kind !== "card") return null;
              return (
                <motion.div key={m.id} {...rise}>
                  <CardView card={m.card} done={m.done} live={live} />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      <form
        className="shrink-0 px-8 pb-5 pt-3"
        onSubmit={e => {
          e.preventDefault();
          submit(input);
        }}
      >
        <div className="flex min-h-[66px] items-center gap-3 rounded-full bg-white pl-[26px] pr-2.5 text-[19px] shadow-hair focus-within:ring-2 focus-within:ring-accent">
          <input
            ref={field}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={live.phase === "intake" ? "Your flight number and date…" : "Ask the agent anything…"}
            aria-label="Message the agent"
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-faint"
          />
          <button type="submit" aria-label="Send" disabled={live.busy} className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-full bg-accent text-ink disabled:opacity-40">
            <ArrowIcon />
          </button>
        </div>
      </form>
    </section>
  );
}
