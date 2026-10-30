"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { config } from "@/demo/config";
import { script } from "@/demo/script";
import { deriveState, stepDuration } from "./engine";

/** Step + clock for the scripted demo, with keyboard controls (→ ← R H). */
export function useDemo() {
  const last = script.steps.length - 1;
  const [step, setStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [recording, setRecording] = useState(false);

  const go = useCallback(
    (next: number, completed: boolean) => {
      const target = Math.max(0, Math.min(last, next));
      setStep(target);
      setElapsed(completed ? Infinity : 0);
    },
    [last],
  );

  const next = useCallback(() => go(step + 1, false), [go, step]);
  const prev = useCallback(() => go(step - 1, true), [go, step]);
  const reset = useCallback(() => go(0, false), [go]);
  const toggleRecording = useCallback(() => setRecording((r) => !r), []);

  // Run the clock for the current step until its last animation has finished.
  useEffect(() => {
    if (elapsed === Infinity) return;
    const duration = stepDuration(script, step);
    const start = performance.now() - elapsed;
    let frame = 0;
    const tick = (now: number) => {
      const t = now - start;
      setElapsed(t >= duration ? Infinity : t);
      if (t < duration) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // Restart only when the step changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      } else if (e.key === "r" || e.key === "R") reset();
      else if (e.key === "h" || e.key === "H") toggleRecording();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, reset, toggleRecording]);

  const state = useMemo(() => deriveState(script, step, elapsed, config.poolStart), [step, elapsed]);

  return { state, next, prev, reset, recording, toggleRecording };
}
