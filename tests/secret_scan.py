"""Secret scan over every commit of every branch (Gitleaks-style patterns). Prints findings with commit + file."""
import re, subprocess, sys
PAT = {
  'Supabase service/secret key': r'sb_secret_[A-Za-z0-9_-]{20,}|service_role',
  'JWT': r'eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}',
  'Private key': r'-----BEGIN (RSA |EC |OPENSSH |)PRIVATE KEY-----',
  'AWS key': r'AKIA[0-9A-Z]{16}',
  'Google API key': r'AIza[0-9A-Za-z_-]{35}',
  'Stripe live key': r'sk_live_[0-9a-zA-Z]{20,}',
  'PayPal secret-ish': r'(?i)paypal[^\n]{0,40}(secret|client_secret)[^\n]{0,10}[:=]\s*[\'"][A-Za-z0-9_-]{20,}',
  'Resend key': r're_[A-Za-z0-9]{8,}_[A-Za-z0-9]{16,}',
  'GitHub token': r'gh[pousr]_[A-Za-z0-9]{36,}',
  'Telegram bot token': r'\b\d{8,10}:[A-Za-z0-9_-]{35}\b',
  'Generic password assignment': r'(?i)(password|passwort|pw)[\'"]?\s*[:=,]\s*[\'"][^\'"\s]{8,}[\'"]',
  'Postgres URL with password': r'postgres(ql)?://[^:\s]+:[^@\s]+@',
}
log = subprocess.run(['git', 'log', '--all', '-p', '--no-color', '--format=@@COMMIT %H %s'], capture_output=True, text=True, errors='replace').stdout
commit = ''; file = ''; hits = {}
for line in log.splitlines():
    if line.startswith('@@COMMIT '): commit = line.split()[1][:8]; continue
    if line.startswith('+++ b/'): file = line[6:]; continue
    if not line.startswith('+') or line.startswith('+++'): continue
    for name, p in PAT.items():
        for m in re.finditer(p, line):
            key = (name, file, m.group(0)[:60])
            hits.setdefault(key, commit)
for (name, file, val), c in sorted(hits.items()):
    print(f'{name:28} {file:40} {c} {val}')
print('FINDINGS:', len(hits))
