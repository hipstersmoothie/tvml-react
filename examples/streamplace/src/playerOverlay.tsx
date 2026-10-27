// A chat panel over the fullscreen player.
//
// TVJS's Player has an `overlayDocument` that it draws over the video, but
// tvml-react's usePlayer() keeps its Player instance private. Workaround:
// wrap the global Player constructor so we can see the instance usePlayer()
// creates, then hand it a document that React renders into through a portal.

import { useState } from "react";
import { createDocument, createPortal, type TVMLDocument } from "tvml-react";

import type { ChatMessage } from "./api";

interface OverlayablePlayer {
  overlayDocument?: TVMLDocument | null;
}

let lastPlayer: OverlayablePlayer | null = null;

/** Call once before anything creates a Player. */
export function capturePlayers(): void {
  const g = globalThis as unknown as { Player?: new () => OverlayablePlayer };
  if (!g.Player) return;
  g.Player = new Proxy(g.Player, {
    construct(target, args, newTarget) {
      const player = Reflect.construct(target, args, newTarget) as OverlayablePlayer;
      lastPlayer = player;
      return player;
    },
  });
}

/** Show `doc` over the video of the most recently created Player. */
export function attachOverlay(doc: TVMLDocument): void {
  if (lastPlayer) lastPlayer.overlayDocument = doc;
}

/**
 * Keeps a document rendered with the latest chat, for `attachOverlay`. The
 * document is always non-empty: TVMLKit ignores mutations to a document that
 * was empty when it was handed over.
 */
export function useChatOverlay(messages: Array<ChatMessage>, heading: string) {
  const [doc] = useState(createDocument);
  const recent = messages.slice(0, 5).reverse(); // oldest at the top, like chat
  const portal = createPortal(
    <divTemplate>
      <stack style={{ tvPosition: "top-right", width: 640, margin: "60 60 0 0" }}>
        <text style={{ color: "white", fontSize: 30, fontWeight: "semibold", backgroundColor: "rgba(0, 0, 0, 0.65)", padding: "20 24 8 24", tvAlign: "left" }}>
          {heading}
        </text>
        {recent.map((m) => (
          <text key={m.uri} style={{ color: "white", fontSize: 26, backgroundColor: "rgba(0, 0, 0, 0.65)", padding: "6 24", tvTextMaxLines: 3, tvAlign: "left" }}>
            {`@${m.handle}  ${m.text}`}
          </text>
        ))}
      </stack>
    </divTemplate>,
    doc.documentElement,
  );
  return { doc, portal };
}
