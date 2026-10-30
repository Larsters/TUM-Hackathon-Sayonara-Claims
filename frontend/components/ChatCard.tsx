"use client";

import type { Card, CardButton } from "@/demo/types";
import { formatEur, formatPrice } from "@/lib/format";
import { Eyebrow, PriceChip, TxHash } from "./ui";

interface Props {
  card: Card;
  pressed?: string;
  wallet: number;
  onAdvance: () => void;
}

function Buttons({
  buttons,
  pressed,
  dimOthers,
  onAdvance,
}: {
  buttons: CardButton[];
  pressed?: string;
  dimOthers?: boolean;
  onAdvance: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {buttons.map((b) => {
        const isPressed = pressed === b.id;
        const paid = isPressed && b.pressedLabel;
        const tone = paid
          ? "border-ok-line bg-ok-bg text-ok-deep"
          : isPressed
            ? "border-accent bg-accent text-ink"
            : b.primary
              ? "border-ink bg-ink text-white"
              : "border-ink bg-white text-ink";
        const dim = dimOthers && pressed && !isPressed ? "opacity-30" : "";
        return (
          <button
            key={b.id}
            type="button"
            onClick={onAdvance}
            aria-pressed={isPressed}
            className={`min-h-[46px] rounded-full border-[1.5px] px-[22px] text-[17px] font-bold transition-all duration-300 ${tone} ${dim}`}
          >
            {paid ? b.pressedLabel : b.label}
          </button>
        );
      })}
    </div>
  );
}

const shell = "relative ml-[50px] max-w-[580px] rounded-2xl bg-white shadow-card";

export function ChatCard({ card, pressed, wallet, onAdvance }: Props) {
  switch (card.variant) {
    case "payment":
      return (
        <div className={`${shell} flex flex-col gap-3 px-[22px] py-[18px]`}>
          <Eyebrow>{card.eyebrow}</Eyebrow>
          <div className="flex flex-wrap items-center gap-2.5">
            <p className="text-lg text-ink-2">{card.text}</p>
            <PriceChip>{formatPrice(card.price)}</PriceChip>
          </div>
          <Buttons buttons={card.buttons} pressed={pressed} onAdvance={onAdvance} />
        </div>
      );

    case "choice":
      return (
        <div className={`${shell} flex flex-col gap-3 px-[22px] py-[18px]`}>
          {card.eyebrow && <Eyebrow>{card.eyebrow}</Eyebrow>}
          {card.text && <p className="text-lg text-ink-2">{card.text}</p>}
          <Buttons buttons={card.buttons} pressed={pressed} dimOthers onAdvance={onAdvance} />
        </div>
      );

    case "policy":
      return (
        <div className={`${shell} grid grid-cols-[minmax(0,1fr)_150px] overflow-hidden`}>
          <div className="flex flex-col gap-2.5 px-[22px] py-[18px]">
            <Eyebrow>{card.eyebrow}</Eyebrow>
            <div className="text-[38px] font-bold tracking-[-0.03em]">
              {card.premium}
              <span className="mx-1 inline-block rounded-lg bg-accent px-2">→</span>
              {card.payout}
            </div>
            <p className="text-lg leading-snug text-ink-2">{card.text}</p>
            <Buttons buttons={card.buttons} pressed={pressed} onAdvance={onAdvance} />
          </div>
          <div className="flex flex-col justify-between gap-3 border-l-2 border-dashed border-line bg-stub px-4 py-[18px]">
            {card.stub.map((s) => (
              <div key={s.label}>
                <Eyebrow>{s.label}</Eyebrow>
                <div className="font-mono text-[15px] leading-normal">
                  {s.lines.map((l) => (
                    <div key={l}>{l}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    case "receipt":
      return (
        <div className={`${shell} grid grid-cols-[minmax(0,1fr)_150px] overflow-hidden`}>
          <div className="flex flex-col gap-2.5 px-[22px] py-[18px]">
            <Eyebrow>{card.eyebrow}</Eyebrow>
            <p className="text-lg text-ink-2">
              <strong className="text-ink">{card.title}</strong> · {card.text}
            </p>
            <TxHash tx={card.tx} />
          </div>
          <div className="flex flex-col justify-between gap-2 border-l-2 border-dashed border-line bg-stub px-4 py-[18px]">
            <Eyebrow>{card.stubLabel}</Eyebrow>
            <div className="font-mono text-xl">{card.stubValue}</div>
            <div className="barcode h-7" aria-hidden="true" />
          </div>
        </div>
      );

    case "payout":
      return (
        <div className={`${shell} flex flex-col gap-3 px-[22px] py-[18px]`}>
          <Eyebrow>{card.eyebrow}</Eyebrow>
          <div className="text-[38px] font-bold leading-tight tracking-[-0.03em]">{card.headline}</div>
          <TxHash tx={card.tx} />
          <div className="flex items-baseline justify-between border-t-2 border-dashed border-line pt-3">
            <Eyebrow>{card.walletLabel}</Eyebrow>
            <span className="font-mono text-[42px] font-medium tabular-nums text-ok-deep">{formatEur(wallet)}</span>
          </div>
        </div>
      );
  }
}
