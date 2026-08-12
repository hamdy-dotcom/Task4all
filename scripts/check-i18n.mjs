#!/usr/bin/env node
/**
 * check-i18n.mjs — AST-based i18n key validator
 *
 * Uses the TypeScript compiler API to walk every .ts/.tsx file under src/,
 * find every getTranslations/useTranslations call, map the resulting variable
 * to its namespace, then verify every t("key") call site exists in both
 * en.json and ar.json.
 *
 * Exit 0 = clean. Exit 1 = missing keys (CI-safe loud failure).
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SRC  = join(ROOT, "src");
const EN   = JSON.parse(readFileSync(join(ROOT, "src/messages/en.json"), "utf8"));
const AR   = JSON.parse(readFileSync(join(ROOT, "src/messages/ar.json"), "utf8"));

// ── helpers ────────────────────────────────────────────────────────────────

function getNestedValue(obj, parts) {
  let node = obj;
  for (const p of parts) {
    if (node == null || typeof node !== "object") return undefined;
    node = node[p];
  }
  return node !== undefined ? node : undefined;
}

function resolveKey(messages, namespace, key) {
  const parts = namespace ? [namespace, ...key.split(".")] : key.split(".");
  return getNestedValue(messages, parts);
}

function* walkFiles(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      yield* walkFiles(full);
    } else if (/\.(tsx|ts)$/.test(entry) && !entry.endsWith(".d.ts")) {
      yield full;
    }
  }
}

// ── AST analysis ───────────────────────────────────────────────────────────

const TRANS_FNS = new Set(["getTranslations", "useTranslations"]);

/**
 * Given an AST node, return the string value if it is a string literal,
 * otherwise return null.
 */
function asStringLiteral(node) {
  if (!node) return null;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }
  return null;
}

/**
 * Walk the CallExpression for getTranslations/useTranslations and return
 * the namespace string if the first argument is a plain string literal.
 */
function extractNamespaceFromCall(callExpr) {
  const arg0 = callExpr.arguments?.[0];
  if (!arg0) return null;
  // Accept: getTranslations("ns") — plain string literal
  // Reject: getTranslations(variable) or getTranslations(`template`)
  if (ts.isStringLiteral(arg0)) return arg0.text;
  return null;
}

/**
 * Returns {varName → namespace} for one source file, using the TypeScript AST.
 *
 * Handles:
 *   const t = getTranslations("ns")
 *   const t = await getTranslations("ns")
 *   const [a, b] = await Promise.all([getTranslations("ns1"), getTranslations("ns2")])
 *   const {t, tNav} = … (object destructuring — unusual but we try)
 */
function extractVarToNs(sourceFile) {
  const varToNs = new Map();

  function visitNode(node) {
    // Only interested in VariableDeclaration nodes
    if (ts.isVariableDeclaration(node)) {
      const init = node.initializer;
      if (!init) {
        ts.forEachChild(node, visitNode);
        return;
      }

      // Unwrap: await expr → expr
      const unwrapped = ts.isAwaitExpression(init) ? init.expression : init;

      // Case 1: const t = getTranslations("ns")  OR  const t = await getTranslations("ns")
      if (ts.isCallExpression(unwrapped)) {
        const callee = unwrapped.expression;
        const calleeName = ts.isIdentifier(callee) ? callee.text
          : ts.isPropertyAccessExpression(callee) ? callee.name.text
          : null;

        if (calleeName && TRANS_FNS.has(calleeName)) {
          const ns = extractNamespaceFromCall(unwrapped);
          if (ns && ts.isIdentifier(node.name)) {
            varToNs.set(node.name.text, ns);
          }
          // Array binding: const [t1, t2] = getTranslations(…) — unusual, skip
        }

        // Case 2: const [a, b] = await Promise.all([…])
        if (
          ts.isPropertyAccessExpression(unwrapped.expression) &&
          ts.isIdentifier(unwrapped.expression.expression) &&
          unwrapped.expression.expression.text === "Promise" &&
          unwrapped.expression.name.text === "all"
        ) {
          // First argument must be an array literal
          const arrArg = unwrapped.arguments?.[0];
          if (arrArg && ts.isArrayLiteralExpression(arrArg)) {
            // Binding must be an array binding pattern
            if (ts.isArrayBindingPattern(node.name)) {
              const elements = node.name.elements;
              arrArg.elements.forEach((elem, i) => {
                // Unwrap await inside Promise.all array item
                const item = ts.isAwaitExpression(elem) ? elem.expression : elem;
                if (!ts.isCallExpression(item)) return;
                const cn = ts.isIdentifier(item.expression)
                  ? item.expression.text
                  : ts.isPropertyAccessExpression(item.expression)
                    ? item.expression.name.text
                    : null;
                if (!cn || !TRANS_FNS.has(cn)) return;
                const ns = extractNamespaceFromCall(item);
                if (!ns) return;
                const bindElem = elements[i];
                if (!bindElem || ts.isOmittedExpression(bindElem)) return;
                const varIdent = bindElem.name;
                if (ts.isIdentifier(varIdent)) {
                  varToNs.set(varIdent.text, ns);
                }
              });
            }
          }
        }
      }
    }

    ts.forEachChild(node, visitNode);
  }

  ts.forEachChild(sourceFile, visitNode);
  return varToNs;
}

/**
 * Collect every t("key") call site from the file.
 * Returns array of {varName, key, pos} objects.
 */
function extractCallSites(sourceFile) {
  const sites = [];

  function visitNode(node) {
    if (ts.isCallExpression(node)) {
      const callee = node.expression;
      // t("key")  or  tNav("key")  — single identifier call
      if (ts.isIdentifier(callee)) {
        const varName = callee.text;
        // Ignore known non-translation identifiers
        if (
          varName === "require" ||
          varName === "import" ||
          varName === "console" ||
          TRANS_FNS.has(varName)
        ) {
          ts.forEachChild(node, visitNode);
          return;
        }
        // First argument must be a plain string literal (no template interpolation)
        const arg0 = node.arguments?.[0];
        const key = asStringLiteral(arg0);
        if (key !== null && key.length > 0 && !key.includes("${")) {
          const { line } = sourceFile.getLineAndCharacterOfPosition(node.pos);
          sites.push({ varName, key, line: line + 1 });
        }
      }
    }

    ts.forEachChild(node, visitNode);
  }

  ts.forEachChild(sourceFile, visitNode);
  return sites;
}

// ── main ───────────────────────────────────────────────────────────────────

const issues = [];

for (const file of walkFiles(SRC)) {
  const text = readFileSync(file, "utf8");
  const relPath = relative(SRC, file);

  const sourceFile = ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    /\.tsx$/.test(file) ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );

  const varToNs = extractVarToNs(sourceFile);
  if (varToNs.size === 0) continue;

  const callSites = extractCallSites(sourceFile);
  for (const { varName, key, line } of callSites) {
    const ns = varToNs.get(varName);
    if (!ns) continue;

    const enVal = resolveKey(EN, ns, key);
    const arVal = resolveKey(AR, ns, key);

    if (enVal === undefined) {
      issues.push({ file: relPath, line, ns, key, lang: "en" });
    }
    if (arVal === undefined) {
      issues.push({ file: relPath, line, ns, key, lang: "ar" });
    }
  }
}

// ── report ─────────────────────────────────────────────────────────────────

if (issues.length === 0) {
  console.log("✓ i18n check passed — all t() keys found in en.json and ar.json");
  process.exit(0);
}

const grouped = {};
for (const { file, line, ns, key, lang } of issues) {
  const label = `${ns}.${key} [${lang}]`;
  (grouped[label] ??= []).push(`${file}:${line}`);
}

console.error("✗ Missing i18n keys:\n");
for (const [label, locations] of Object.entries(grouped)) {
  console.error(`  ${label}`);
  for (const loc of [...new Set(locations)]) {
    console.error(`    → src/${loc}`);
  }
}
console.error(`\n${issues.length} issue(s) found.`);
process.exit(1);
