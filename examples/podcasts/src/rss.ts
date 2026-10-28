// Podcast RSS parsing with tvml-react's parseDocument, i.e. TVJS's own
// DOMParser (TVMLKit's XML parser). It handles multi-megabyte feeds quickly,
// but its DOM is minimal:
//  - getElementsByTagName("itunes:duration") finds nothing, and there is no
//    getElementsByTagNameNS, so namespaced tags are found by walking children
//    and comparing nodeName.
//  - Malformed XML throws an IKDOMException rather than returning a
//    <parsererror> document.

import { parseDocument, type TVMLDocument, type TVMLElement } from "tvml-react";

import type { Episode } from "./types";
import { decodeEntities, parseDuration, stripHtml } from "./format";

const ELEMENT_NODE = 1;

function* children(node: TVMLElement): Generator<TVMLElement> {
  let child: TVMLElement | null | undefined = node.firstChild;
  while (child) {
    if (child.nodeType === ELEMENT_NODE) yield child;
    child = child.nextSibling;
  }
}

function child(node: TVMLElement, ...names: Array<string>): TVMLElement | undefined {
  for (const name of names) {
    for (const c of children(node)) {
      if (c.nodeName === name) return c;
    }
  }
  return undefined;
}

function text(node: TVMLElement, ...names: Array<string>): string {
  return child(node, ...names)?.textContent?.trim() ?? "";
}

function attr(node: TVMLElement | undefined, name: string): string {
  return node?.getAttribute(name) ?? "";
}

export interface Feed {
  title: string;
  author: string;
  description: string;
  artwork: string;
  episodes: Array<Episode>;
}

export function parseFeed(xml: string, fallbackArtwork: string): Feed {
  let doc: TVMLDocument;
  try {
    doc = parseDocument(xml);
  } catch {
    throw new Error("This feed isn't valid XML.");
  }

  const rss = doc.documentElement;
  const channel = rss && child(rss, "channel");
  if (!channel) {
    throw new Error("This feed isn't an RSS feed.");
  }

  const artwork =
    attr(child(channel, "itunes:image"), "href") ||
    text(child(channel, "image") ?? channel, "url") ||
    fallbackArtwork;

  const episodes: Array<Episode> = [];
  for (const item of children(channel)) {
    if (item.nodeName !== "item") continue;
    const enclosure = child(item, "enclosure");
    const url = attr(enclosure, "url");
    if (!url) continue; // text-only posts

    const published = Date.parse(text(item, "pubDate"));
    episodes.push({
      id: text(item, "guid") || url,
      title: decodeEntities(text(item, "itunes:title", "title")),
      description: stripHtml(text(item, "description", "itunes:summary", "content:encoded")),
      published: Number.isNaN(published) ? 0 : published,
      duration: parseDuration(text(item, "itunes:duration")),
      url,
      mediaType: attr(enclosure, "type").startsWith("video") ? "video" : "audio",
      artwork: attr(child(item, "itunes:image"), "href") || artwork,
      season: Number(text(item, "itunes:season")) || undefined,
      number: Number(text(item, "itunes:episode")) || undefined,
    });
  }
  episodes.sort((a, b) => b.published - a.published);

  return {
    title: decodeEntities(text(channel, "title")),
    author: decodeEntities(text(channel, "itunes:author")),
    description: stripHtml(text(channel, "description", "itunes:summary")),
    artwork,
    episodes,
  };
}
