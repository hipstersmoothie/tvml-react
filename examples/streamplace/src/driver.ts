// TEMPORARY verification driver. Delete before finishing.
import { fireSelect, queryAll, queryByText } from "tvml-react/testing";
import { onAppStateChange } from "tvml-react";

import { queryClient } from "./queries";

const t0 = Date.now();
const log = (...args: Array<unknown>) => console.log(`[drv ${((Date.now() - t0) / 1000).toFixed(1)}s]`, ...args);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

queryClient.getQueryCache().subscribe((e) => {
  if (e.type !== "updated") return;
  const key = JSON.stringify(e.query.queryKey).slice(0, 60);
  if (key.includes("chat-record") || key.includes("handle") || key.includes('"profile"')) return;
  if (e.action.type === "fetch") log("FETCH", key);
  else if (e.action.type === "success") log("ok", key);
  else if (e.action.type === "error") log("ERROR", key, String(e.action.error));
  else if (e.action.type === "failed") log("retry-failed", key, e.action.failureCount);
  else if (e.action.type === "pause") log("PAUSED", key);
});

async function step(name: string, fn: () => void) {
  log("STEP", name);
  try {
    fn();
  } catch (error) {
    log("STEP FAILED", name, String(error));
  }
}

export async function runDriver() {
  const realFetch = globalThis.fetch;
  const failing: typeof fetch = (input, init) =>
    String(input).includes("getLiveUsers") ? Promise.reject(new TypeError("simulated")) : realFetch(input, init);
  const nav = () => (globalThis as any).navigationDocument;

  await sleep(3_000);
  await step("fail + reset live list", () => {
    globalThis.fetch = failing;
    void queryClient.resetQueries({ queryKey: ["live"] });
  });
  await sleep(9_000);
  await step("restore fetch + Try Again", () => {
    globalThis.fetch = realFetch;
    fireSelect(queryByText("Try Again")!);
  });
  await sleep(8_000);
  await step("push first live stream", () => fireSelect(queryAll("lockup")[0]!));
  await sleep(40_000);
  await step("watch", () => fireSelect(queryByText("Watch")!));
  await sleep(30_000);
  await step("stop player", () => (globalThis as any).__player.stop());
  await sleep(20_000);
  await step("pop", () => nav().popDocument());
  await sleep(35_000);
  onAppStateChange((state) => log("APP", state));
  log("READY for suspend");
}
