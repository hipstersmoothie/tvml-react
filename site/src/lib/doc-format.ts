// Renders a TSDoc comment as HTML: paragraphs, indented code examples,
// `inline code` and [links](url).

function escape(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function inline(text: string): string {
  return escape(text)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

export function docToHtml(doc: string): string {
  if (!doc) return "";
  const blocks: Array<string> = [];
  let paragraph: Array<string> = [];
  let code: Array<string> = [];

  const flushParagraph = () => {
    if (paragraph.length) blocks.push(`<p>${inline(paragraph.join(" "))}</p>`);
    paragraph = [];
  };
  const flushCode = () => {
    if (code.length) {
      const indent = Math.min(...code.filter((l) => l.trim()).map((l) => l.match(/^ */)![0].length));
      blocks.push(`<pre><code>${escape(code.map((l) => l.slice(indent)).join("\n").trimEnd())}</code></pre>`);
    }
    code = [];
  };

  for (const line of doc.split("\n")) {
    if (/^ {2,}\S/.test(line) || (code.length && line.trim() === "")) {
      flushParagraph();
      code.push(line);
    } else if (line.trim() === "") {
      flushCode();
      flushParagraph();
    } else {
      flushCode();
      paragraph.push(line.trim());
    }
  }
  flushCode();
  flushParagraph();
  return blocks.join("\n");
}

/** The first sentence, for summaries. */
export function summary(doc: string): string {
  const first = doc.split(/\n\s*\n/)[0].replace(/\s+/g, " ");
  const end = first.search(/\.(\s|$)/);
  return end === -1 ? first : first.slice(0, end + 1);
}
