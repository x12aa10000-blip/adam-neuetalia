// SAST v2: analyses EVERY template literal that builds HTML (contains '<'), descends into nested templates,
// conditionals, string concatenation, .map() callbacks and IIFEs, and reports each inserted leaf value that
// looks like data and is not passed through esc()/encodeURIComponent()/number formatting.
import ts from '/opt/npm-tools/node_modules/typescript/lib/typescript.js';
import fs from 'node:fs'; import path from 'node:path';
const dir = process.argv[2] || 'js';
const SAFE_FN = /^(esc|encodeURIComponent|eur|ic|V\.ic|Number|parseInt|parseFloat|Math\.\w+|C\.date|C\.dt|C\.ago|ST\.fmtEur|fmtEur|ST\.round2|V5\.src|V\.src|imgAttr|PDP\.encode|String)$/;
const DATA = /(name|text|email|phone|note|msg|message|answer|street|city|zip|title|code|card|recipient|label|desc|reply|comment|query|addr|url|src|href|link|img|preview|user|cust|bill|tracking|store|reason|lab\b|\.f\b|\.to\b|\.from\b|\.q\b|\.a\b|\.v\b|value)/i;
const out = [];
function leaves(n, sf, acc) {
  if (!n) return acc;
  if (ts.isTemplateExpression(n)) { n.templateSpans.forEach(s => leaves(s.expression, sf, acc)); return acc; }
  if (ts.isParenthesizedExpression(n)) return leaves(n.expression, sf, acc);
  if (ts.isConditionalExpression(n)) { leaves(n.whenTrue, sf, acc); leaves(n.whenFalse, sf, acc); return acc; }
  if (ts.isBinaryExpression(n) && [ts.SyntaxKind.PlusToken, ts.SyntaxKind.BarBarToken, ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.QuestionQuestionToken].includes(n.operatorToken.kind)) { leaves(n.left, sf, acc); leaves(n.right, sf, acc); return acc; }
  if (ts.isBinaryExpression(n)) return acc; // comparisons, arithmetic
  if (ts.isCallExpression(n)) {
    const c = n.expression.getText(sf);
    if (SAFE_FN.test(c)) return acc;
    if (/\.(join|filter|slice|concat|reverse|sort)$/.test(c)) { leaves(n.expression.expression, sf, acc); n.arguments.forEach(a => /join/.test(c) ? null : leaves(a, sf, acc)); return acc; }
    if (/\.(map|flatMap)$/.test(c)) { leaves(n.expression.expression, sf, []); const f = n.arguments[0]; if (f && (ts.isArrowFunction(f) || ts.isFunctionExpression(f))) { if (ts.isBlock(f.body)) f.body.statements.forEach(st => st.forEachChild(function r(x) { if (ts.isReturnStatement(x)) leaves(x.expression, sf, acc); else if (!ts.isFunctionLike(x)) x.forEachChild(r); })); else leaves(f.body, sf, acc); } return acc; }
    if (/\.(toFixed|length|repeat|toUpperCase|toLowerCase|trim|padStart|split)$/.test(c)) { if (/toFixed|length|repeat|padStart/.test(c)) return acc; return leaves(n.expression.expression, sf, acc); }
    if (/^(t|T|W|tx|SITE\.tx|L3|K)$/.test(c)) { n.arguments.forEach(a => { if (ts.isObjectLiteralExpression(a)) a.properties.forEach(p => ts.isPropertyAssignment(p) && leaves(p.initializer, sf, acc)); }); return acc; }
    if (ts.isArrowFunction(n.expression) || ts.isParenthesizedExpression(n.expression)) { let f = n.expression; while (ts.isParenthesizedExpression(f)) f = f.expression; if (ts.isBlock(f.body)) f.body.forEachChild(function r(x) { if (ts.isReturnStatement(x)) leaves(x.expression, sf, acc); else if (!ts.isFunctionLike(x)) x.forEachChild(r); }); else leaves(f.body, sf, acc); return acc; }
    if (/^L$|\.L$|^L\(/.test(c) || /^DOCS\.(lines|linesText)/.test(c)) { acc.push(n); return acc; } // localised data (product names etc.)
    return acc; // other helpers build their own (separately analysed) HTML
  }
  if (ts.isStringLiteral(n) || ts.isNumericLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || ts.isPrefixUnaryExpression(n) || n.kind === ts.SyntaxKind.TrueKeyword || n.kind === ts.SyntaxKind.FalseKeyword) return acc;
  if (ts.isArrayLiteralExpression(n)) { n.elements.forEach(e => leaves(e, sf, acc)); return acc; }
  acc.push(n); return acc;
}
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.js') && !['catalog.js', 'catalog2.js', 'catalog3.js', 'masks.js'].includes(f))) {
  const sf = ts.createSourceFile(path.join(dir, f), fs.readFileSync(path.join(dir, f), 'utf8'), ts.ScriptTarget.Latest, true);
  const visit = n => {
    if (ts.isTemplateExpression(n) && (n.head.text + n.templateSpans.map(s => s.literal.text).join('')).includes('<') && !(ts.isTemplateExpression(n.parent) || ts.isTemplateSpan(n.parent))) {
      for (const leaf of leaves(n, sf, [])) {
        const txt = leaf.getText(sf);
        if (!DATA.test(txt) || /^(i|k|n|idx|gi|qi|ci|j)$/.test(txt) || /\b(id|pid|no|st|status|tpl|kind|method|key|lang|type|role|cls|icon|k|v)$/.test(txt)) continue;
        const { line } = sf.getLineAndCharacterOfPosition(leaf.getStart(sf));
        out.push(`${sf.fileName}:${line + 1}  ${txt.slice(0, 100)}`);
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
}
const uniq = [...new Set(out)]; uniq.forEach(x => console.log(x)); console.log('CANDIDATES:', uniq.length);
