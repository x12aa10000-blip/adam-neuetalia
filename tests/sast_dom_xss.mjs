// SAST: DOM-XSS sinks. Parses every JS file (TypeScript compiler API), finds HTML sinks
// (innerHTML/outerHTML assignments, insertAdjacentHTML, document.write, and the app's HTML helpers
// SHOP.page / S.page / shell / A.shell / ADMIN.shell), and reports every ${...} inside the HTML
// that carries data-looking values without escaping. Output = candidates for manual triage.
import ts from '/opt/npm-tools/node_modules/typescript/lib/typescript.js';
import fs from 'node:fs'; import path from 'node:path';
const dir = process.argv[2] || 'js';
const SAFE_CALLS = /^(esc|escAttr|encodeURIComponent|eur|ic|Number|parseInt|parseFloat|Math\.\w+|C\.date|C\.dt|C\.ago|C\.num|V\.ic|ST\.fmtEur|fmtEur|JSON\.stringify|String\(.*\)\.length|V5\.src|V\.src|imgAttr|starsMini|PDP\.encode|btoa)$/;
const DATA = /\b(name|text|email|phone|note|msg|message|answer|street|city|zip|title|code|card|recipient|label|desc|reply|comment|query|addr|value|url|src|href|link|img|preview|user|to|from|cust|ship|bill|tracking|store|lines?|reason|q|e)\b/i;
const findings = [];
function exprSafe(n, sf) {
  if (!n) return true;
  if (ts.isStringLiteral(n) || ts.isNumericLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || n.kind === ts.SyntaxKind.TrueKeyword || n.kind === ts.SyntaxKind.FalseKeyword || n.kind === ts.SyntaxKind.NullKeyword) return true;
  if (ts.isParenthesizedExpression(n)) return exprSafe(n.expression, sf);
  if (ts.isPrefixUnaryExpression(n) && n.operator === ts.SyntaxKind.PlusToken) return true;
  if (ts.isConditionalExpression(n)) return exprSafe(n.whenTrue, sf) && exprSafe(n.whenFalse, sf);
  if (ts.isBinaryExpression(n)) {
    const op = n.operatorToken.kind;
    if ([ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken, ts.SyntaxKind.PlusToken].includes(op)) return exprSafe(n.left, sf) && exprSafe(n.right, sf);
    if ([ts.SyntaxKind.MinusToken, ts.SyntaxKind.AsteriskToken, ts.SyntaxKind.SlashToken, ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken, ts.SyntaxKind.LessThanToken, ts.SyntaxKind.GreaterThanToken].includes(op)) return true;
  }
  if (ts.isTemplateExpression(n)) return n.templateSpans.every(s => exprSafe(s.expression, sf));
  if (ts.isCallExpression(n)) {
    const callee = n.expression.getText(sf);
    if (SAFE_CALLS.test(callee)) return true;
    if (/^t$|^T$|^W$|^L$|^tx$|SITE\.tx$/.test(callee)) return n.arguments.slice(1).every(a => !ts.isObjectLiteralExpression(a) || a.properties.every(p => !ts.isPropertyAssignment(p) || exprSafe(p.initializer, sf))) && (callee !== 'L' || true);
    if (/\.join$/.test(callee)) { const inner = n.expression.expression; return exprSafe(inner, sf); }
    if (/\.map$/.test(callee)) { const fn = n.arguments[0]; if (fn && (ts.isArrowFunction(fn) || ts.isFunctionExpression(fn))) { const body = fn.body; return ts.isBlock(body) ? false : exprSafe(body, sf); } return false; }
    if (/\.(toFixed|toLocaleString|length|repeat|toUpperCase|toLowerCase|slice|trim|replace|padStart)$/.test(callee)) { const base = n.expression.expression; return !DATA.test(base.getText(sf)) || /toFixed|length|repeat/.test(callee); }
    return !DATA.test(n.getText(sf)); // unknown helper: flag only if it touches data
  }
  if (ts.isPropertyAccessExpression(n) || ts.isIdentifier(n) || ts.isElementAccessExpression(n)) return !DATA.test(n.getText(sf).split('.').pop()) && !/^(o|it|i|m|r|q|c|a|x|p|d|me|l|s|g|u|e)$/.test(n.getText(sf));
  return false;
}
function htmlArg(n, sf, where) {
  if (!n) return;
  if (ts.isTemplateExpression(n)) { for (const s of n.templateSpans) if (!exprSafe(s.expression, sf)) report(s.expression, sf, where); return; }
  if (ts.isNoSubstitutionTemplateLiteral(n) || ts.isStringLiteral(n)) return;
  if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.PlusToken) { htmlArg(n.left, sf, where); htmlArg(n.right, sf, where); return; }
  if (ts.isConditionalExpression(n)) { htmlArg(n.whenTrue, sf, where); htmlArg(n.whenFalse, sf, where); return; }
  if (ts.isParenthesizedExpression(n)) return htmlArg(n.expression, sf, where);
  if (!exprSafe(n, sf)) report(n, sf, where);
}
function report(n, sf, where) { const { line } = sf.getLineAndCharacterOfPosition(n.getStart(sf)); findings.push({ file: sf.fileName, line: line + 1, sink: where, expr: n.getText(sf).slice(0, 90) }); }
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.js'))) {
  const sf = ts.createSourceFile(path.join(dir, f), fs.readFileSync(path.join(dir, f), 'utf8'), ts.ScriptTarget.Latest, true);
  const visit = n => {
    if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isPropertyAccessExpression(n.left) && /^(innerHTML|outerHTML)$/.test(n.left.name.text)) htmlArg(n.right, sf, n.left.name.text);
    if (ts.isCallExpression(n)) {
      const c = n.expression.getText(sf);
      if (/insertAdjacentHTML$/.test(c)) htmlArg(n.arguments[1], sf, 'insertAdjacentHTML');
      if (/^document\.write/.test(c)) htmlArg(n.arguments[0], sf, 'document.write');
      if (/^(SHOP\.page|S\.page|shell|A\.shell|ADMIN\.shell)$/.test(c)) htmlArg(n.arguments[c.endsWith('page') ? 0 : 1], sf, c);
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
}
const sinks = findings.length;
for (const x of findings) console.log(`${x.file}:${x.line}  [${x.sink}]  ${x.expr}`);
console.log('CANDIDATES:', sinks);
