"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { api, type TamperCase, type TamperCheck, type TamperRun } from "@/lib/api";
import { Eyebrow, Spinner, rise } from "../ui";

const short = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`;

function CaseRow({ c, index, onEdit }: { c: TamperCase; index: number; onEdit: (c: TamperCase) => void }) {
  const accepted = c.outcome === "accepted";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.35 }}
      className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-start gap-3 border-b-[1.5px] border-hair py-2.5"
    >
      <span className={`mt-0.5 grid h-6 w-6 place-items-center rounded-full text-sm font-bold ${accepted ? "bg-ok-bg text-ok-fg" : "bg-bad-bg text-bad-fg"}`}>
        {accepted ? "✓" : "✕"}
      </span>
      <div className="min-w-0">
        <div className="text-base font-bold">{c.name}</div>
        <div className="text-[14px] leading-snug text-ink-2">{c.what}</div>
        <div className={`mt-1 break-all font-mono text-[12px] ${accepted ? "text-ok-fg" : "text-bad-fg"}`}>
          {accepted ? "accepted: " : "reverted: "}
          {c.detail}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className={`rounded px-1.5 py-0.5 font-mono text-[11px] font-bold ${c.passed ? "bg-ok-bg text-ok-deep" : "bg-bad-bg text-bad-fg"}`}>
          {c.passed ? "PASS" : "FAIL"}
        </span>
        <button type="button" onClick={() => onEdit(c)} className="font-mono text-[11px] text-muted underline underline-offset-2 hover:text-ink">
          edit ↓
        </button>
      </div>
    </motion.div>
  );
}

export function TamperPanel() {
  const [run, setRun] = useState<TamperRun | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [now, setNow] = useState(false);
  const [check, setCheck] = useState<TamperCheck | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);

  const start = async () => {
    setRunning(true);
    setError(null);
    setRun(null);
    try {
      const result = await api.tamper();
      setRun(result);
      if (!draft) setDraft(JSON.stringify(result.cases[0].response, null, 2));
    } catch (e) {
      setError(String(e));
    } finally {
      setRunning(false);
    }
  };

  const submit = async () => {
    setChecking(true);
    setCheck(null);
    setCheckError(null);
    try {
      setCheck(await api.checkResponse(draft, now));
    } catch (e) {
      setCheckError(e instanceof Error ? e.message : String(e));
    } finally {
      setChecking(false);
    }
  };

  const passed = run?.cases.filter(c => c.passed).length ?? 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto [scrollbar-width:thin]">
      <div className="rounded-xl bg-soft px-4 py-3 text-[15px] leading-snug">
        <Eyebrow>API3 · signed flight data</Eyebrow>
        <p className="mt-1">
          The payout depends on one signed AeroDataBox response from API3 AirnodeHub. The <strong>FlightDelayCover</strong> contract on Base
          Sepolia accepts it only if the expected Airnode signed it, it answers this policy&apos;s request, and it is fresh. Here the contract
          gets one real response and four forged ones.
        </p>
        <div className="mt-1.5 font-mono text-[12px] text-muted">
          contract{" "}
          <a
            href="https://sepolia.basescan.org/address/0xade3e17961a471a522fcd935241c459a924e2e27#code"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-accent decoration-2 underline-offset-2"
          >
            0xade3…2e27 ↗
          </a>{" "}
          · policy 2 · LH 501 · simulated calls, no gas
        </div>
      </div>

      <button
        type="button"
        onClick={start}
        disabled={running}
        className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-ink px-4 py-3 text-base font-bold text-white disabled:opacity-60"
      >
        {running ? <Spinner label="checking" /> : null}
        {running ? "Asking the contract…" : run ? "Run the tamper test again" : "Run the tamper test"}
      </button>
      {error && <p className="text-[14px] text-bad-fg">{error}</p>}

      <AnimatePresence>
        {run && (
          <motion.div key="cases" {...rise}>
            {run.cases.map((c, i) => (
              <CaseRow key={c.id} c={c} index={i} onEdit={x => { setDraft(JSON.stringify(x.response, null, 2)); setCheck(null); }} />
            ))}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: run.cases.length * 0.35 }}
              className={`mt-2 rounded-md px-3 py-1.5 text-center font-bold ${passed === run.cases.length ? "bg-accent" : "bg-bad-bg text-bad-fg"}`}
            >
              {passed === run.cases.length ? "1 accepted, 4 rejected: tamper test passed" : `${passed}/${run.cases.length} as expected`}
            </motion.div>
            <p className="mt-1.5 text-[13px] text-muted">
              Contract {short(run.contract)}, response window {run.maxResponseAgeSeconds / 3600} h. The real response settled policy 1 on chain:{" "}
              <a
                href="https://sepolia.basescan.org/tx/0xda8d73e8d276b9c7da9d5f23b57077a1cc93f76beb4172f229e9b718f602f4fe"
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-accent decoration-2 underline-offset-2"
              >
                PaidOut tx ↗
              </a>
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-1 flex flex-col gap-2 rounded-xl border-[1.5px] border-hair px-4 py-3">
        <Eyebrow>Try your own response</Eyebrow>
        <p className="text-[14px] leading-snug text-ink-2">
          Paste a signed response or edit this one (any value, the timestamp or the signature), then send it to the contract.
        </p>
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          spellCheck={false}
          rows={7}
          placeholder='{ "timestamp": "…", "data": "…", "signature": "0x…" }'
          className="w-full resize-y rounded-lg bg-soft p-2 font-mono text-[12px] leading-snug outline-none focus:ring-2 focus:ring-accent"
        />
        <label className="flex items-center gap-2 text-[13px] text-ink-2">
          <input type="checkbox" checked={now} onChange={e => setNow(e.target.checked)} />
          Check at the current time (otherwise 10 min after the response&apos;s own timestamp)
        </label>
        <button
          type="button"
          onClick={submit}
          disabled={checking || !draft.trim()}
          className="flex items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2 text-[15px] font-bold disabled:opacity-60"
        >
          {checking ? <Spinner label="checking" /> : null}
          Send to FlightDelayCover
        </button>
        {checkError && <p className="text-[14px] text-bad-fg">{checkError}</p>}
        {check && (
          <motion.div
            {...rise}
            className={`break-all rounded-lg px-3 py-2 font-mono text-[13px] ${check.outcome === "accepted" ? "bg-ok-bg text-ok-deep" : "bg-bad-bg text-bad-fg"}`}
          >
            {check.outcome === "accepted" ? "accepted: " : "reverted: "}
            {check.detail}
            <div className="mt-0.5 text-[11px] opacity-70">policy {check.policyId} · checked at {check.checkedAt}</div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
