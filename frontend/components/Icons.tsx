import type { LogKind } from "@/demo/types";

type IconProps = { size?: number; className?: string };

const stroke = (size: number, className: string | undefined, children: React.ReactNode) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={className}
  >
    {children}
  </svg>
);

export const DataIcon = ({ size = 20, className }: IconProps) =>
  stroke(size, className, <>
    <ellipse cx="12" cy="5" rx="8" ry="3" />
    <path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5" />
    <path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
  </>);

export const RuleIcon = ({ size = 20, className }: IconProps) =>
  stroke(size, className, <>
    <path d="M12 3v18M5 7h14M8 21h8" />
    <path d="M5 7l-3 7a3 3 0 0 0 6 0z" />
    <path d="M19 7l-3 7a3 3 0 0 0 6 0z" />
  </>);

export const CoinIcon = ({ size = 20, className }: IconProps) =>
  stroke(size, className, <>
    <circle cx="12" cy="12" r="9" />
    <path d="M15 9a3.5 3.5 0 1 0 0 6" />
    <path d="M8 11h5M8 13h5" />
  </>);

export const ChainIcon = ({ size = 20, className }: IconProps) =>
  stroke(size, className, <>
    <path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" />
    <path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
  </>);

export const ShieldIcon = ({ size = 20, className }: IconProps) =>
  stroke(size, className, <path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z" />);

export const CopyIcon = ({ size = 16, className }: IconProps) =>
  stroke(size, className, <>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V5a2 2 0 0 1 2-2h10" />
  </>);

export const ArrowIcon = ({ size = 20, className }: IconProps) =>
  stroke(size, className, <path d="M5 12h14M13 6l6 6-6 6" />);

export const PlaneIcon = ({ size = 32, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
    <path d="M21 12c0-.8-.7-1.5-1.5-1.5H14L9.5 3H7.5l2.2 7.5H5.5L4 8.5H2.5l1 3.5-1 3.5H4l1.5-2h4.2L7.5 21h2l4.5-7.5h5.5c.8 0 1.5-.7 1.5-1.5z" />
  </svg>
);

const kindStyle: Record<LogKind, string> = {
  data: "bg-pay-bg text-pay-fg",
  payment: "bg-pay-bg text-pay-fg",
  rule: "bg-rule-bg text-rule-fg",
  chain: "bg-ok-bg text-ok-fg",
  oracle: "bg-ok-bg text-ok-fg",
};

export function KindIcon({ kind }: { kind: LogKind }) {
  const Icon = { data: DataIcon, payment: CoinIcon, rule: RuleIcon, chain: ChainIcon, oracle: ShieldIcon }[kind];
  return (
    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-[10px] ${kindStyle[kind]}`}>
      <Icon />
    </span>
  );
}
