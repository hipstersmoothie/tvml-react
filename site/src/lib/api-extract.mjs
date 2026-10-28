// Reads tvml-react's public API from its TypeScript source: every export of
// every entry point, with its kind, declaration, doc comment and members.
// The Reference pages render from this, so signatures and property tables
// can't drift from the code. Plain JS so scripts/check-reference.mjs can use
// it outside Astro.

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";

// The library's source. Resolved from the site's directory, since Astro
// bundles this file somewhere else when it builds.
const SRC = [resolve(process.cwd(), "../src") + "/", fileURLToPath(new URL("../../../src/", import.meta.url))].find(
  (dir) => existsSync(dir + "index.ts"),
);
if (!SRC) throw new Error("api-extract: can't find tvml-react's src/ (run from the site directory)");

/** Entry points, by the module name users import. */
export const ENTRY_POINTS = {
  "tvml-react": "index.ts",
  "tvml-react/query": "query.ts",
  "tvml-react/native": "native-elements.ts",
  "tvml-react/layout": "layout.ts",
  "tvml-react/testing": "testing.ts",
  "tvml-react/build": "build.ts",
};

let cache;

/** @returns {Map<string, ApiSymbol>} */
export function loadApi() {
  if (cache) return cache;
  const files = Object.values(ENTRY_POINTS).map((file) => SRC + file);
  const program = ts.createProgram(files, {
    jsx: ts.JsxEmit.ReactJSX,
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    strict: true,
    skipLibCheck: true,
  });
  const checker = program.getTypeChecker();
  const api = new Map();

  for (const [module, file] of Object.entries(ENTRY_POINTS)) {
    const source = program.getSourceFile(SRC + file);
    const moduleSymbol = checker.getSymbolAtLocation(source);
    for (const exported of checker.getExportsOfModule(moduleSymbol)) {
      if (api.has(exported.name)) continue; // re-exported elsewhere first
      const symbol =
        exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported;
      api.set(exported.name, describe(exported.name, module, symbol, checker));
    }
  }
  cache = api;
  return api;
}

function docOf(symbol, checker) {
  return ts.displayPartsToString(symbol.getDocumentationComment(checker)).trim();
}

/** Source text of a declaration without its body or doc comments. */
function headerText(node) {
  const sf = node.getSourceFile();
  const start = node.getStart(sf);
  const body = node.body;
  const end = body ? body.getStart(sf) : node.getEnd();
  return sf.text.slice(start, end).replace(/\s+$/, "").replace(/^export\s+(declare\s+)?/, "");
}

/** `function name(params): Return`, with destructured params shown as `props`. */
function signatureText(node, name, kind, checker) {
  const typeParams = node.typeParameters
    ? `<${node.typeParameters.map((t) => t.getText()).join(", ")}>`
    : "";
  const params = node.parameters
    .map((p) => {
      const named = ts.isIdentifier(p.name) ? p.name.getText() : kind === "component" ? "props" : "options";
      const optional = p.questionToken || p.initializer ? "?" : "";
      const type = p.type
        ? p.type.getText()
        : checker.typeToString(checker.getTypeAtLocation(p), undefined, ts.TypeFormatFlags.NoTruncation);
      return `${p.dotDotDotToken ? "..." : ""}${named}${optional}: ${type}`;
    })
    .join(", ");
  let returns = node.type ? node.type.getText() : "";
  if (!returns) {
    const signature = checker.getSignatureFromDeclaration(node);
    returns = signature
      ? checker.typeToString(signature.getReturnType(), undefined, ts.TypeFormatFlags.NoTruncation)
      : "void";
    if (kind === "component" && /Element|ReactNode/.test(returns)) returns = "JSX.Element";
  }
  return `function ${name}${typeParams}(${params}): ${returns}`.replace(/\s+/g, " ").replace(/\( /g, "(");
}

function membersOf(declaration, checker) {
  const nodes = ts.isInterfaceDeclaration(declaration)
    ? declaration.members
    : ts.isTypeAliasDeclaration(declaration) && ts.isTypeLiteralNode(declaration.type)
      ? declaration.type.members
      : [];
  const members = [];
  for (const member of nodes) {
    if (!member.name) continue;
    if (ts.getJSDocTags(member).some((tag) => tag.tagName.text === "internal")) continue;
    const symbol = checker.getSymbolAtLocation(member.name);
    const name = member.name.getText();
    let type = "";
    if (ts.isMethodSignature(member)) {
      const params = member.parameters.map((p) => p.getText()).join(", ");
      type = `(${params}) => ${member.type ? member.type.getText() : "void"}`;
    } else if (member.type) {
      type = member.type.getText();
    }
    members.push({
      name,
      type: type.replace(/\s+/g, " "),
      optional: Boolean(member.questionToken),
      doc: symbol ? docOf(symbol, checker) : "",
    });
  }
  return members;
}

function kindOf(name, declaration) {
  if (ts.isInterfaceDeclaration(declaration) || ts.isTypeAliasDeclaration(declaration)) return "type";
  if (ts.isVariableDeclaration(declaration)) {
    const init = declaration.initializer;
    if (init && (ts.isArrowFunction(init) || ts.isFunctionExpression(init))) return functionKind(name);
    return "constant";
  }
  if (ts.isClassDeclaration(declaration)) return "type";
  return functionKind(name);
}

function functionKind(name) {
  if (/^use[A-Z]/.test(name)) return "hook";
  if (/^[A-Z]/.test(name)) return "component";
  return "function";
}

function describe(name, module, symbol, checker) {
  const declarations = symbol.declarations ?? [];
  const primary = declarations[0];
  const kind = primary ? kindOf(name, primary) : "type";
  let declaration = "";

  if (primary && ts.isFunctionDeclaration(primary)) {
    // Overloads, if any; otherwise the implementation's signature.
    const overloads = declarations.filter((d) => ts.isFunctionDeclaration(d) && !d.body);
    const shown = overloads.length ? overloads : declarations.filter(ts.isFunctionDeclaration);
    declaration = shown.map((d) => signatureText(d, name, kind, checker)).join("\n");
  } else if (primary && ts.isVariableDeclaration(primary)) {
    const init = primary.initializer;
    if (kind === "constant") {
      declaration = `const ${name} = ${init ? init.getText() : ""}`;
    } else {
      const type = checker.getTypeOfSymbolAtLocation(symbol, primary);
      declaration = `const ${name}: ${checker.typeToString(type, undefined, ts.TypeFormatFlags.NoTruncation)}`;
    }
  } else if (primary) {
    declaration = headerText(primary);
    if (ts.isInterfaceDeclaration(primary)) {
      declaration = declaration.replace(/\{[\s\S]*$/, "{ … }");
    }
  }

  return {
    name,
    module,
    kind,
    doc: docOf(symbol, checker),
    declaration: declaration.replace(/\n\s*\n/g, "\n"),
    members: primary ? membersOf(primary, checker) : [],
    file: primary ? primary.getSourceFile().fileName.replace(SRC, "src/") : "",
  };
}

/**
 * @typedef {{ name: string, module: string, kind: string, doc: string,
 *   declaration: string, members: Array<{ name: string, type: string,
 *   optional: boolean, doc: string }>, file: string }} ApiSymbol
 */
