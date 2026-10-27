// WORKAROUND: usePlayer() doesn't expose the TVJS Player it creates, but a
// podcast app needs it to set `overlayDocument` (audio items otherwise play
// over a plain black screen). Wrap the global constructor once so the instance
// usePlayer() creates can be reached.

import type { TVMLDocument } from "tvml-react";

export interface TVJSPlayer {
  overlayDocument?: TVMLDocument | null;
}

type PlayerConstructor = new () => TVJSPlayer;

let latest: TVJSPlayer | null = null;

const globals = globalThis as unknown as { Player?: PlayerConstructor };
const Original = globals.Player;
if (Original) {
  globals.Player = function Player() {
    latest = new Original();
    return latest;
  } as unknown as PlayerConstructor;
}

/** The most recently created TVJS Player, if any. */
export function currentTVJSPlayer(): TVJSPlayer | null {
  return latest;
}
