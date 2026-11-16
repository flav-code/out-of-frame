// Shared by the content script, the options page and the tests.
// `var` and a plain function, not `const`: Chrome re-injects this file into open tabs after an update.
var DEFAULTS = { enabled: false, rules: 'mail.google.com\ndashboard.stripe.com', message: '' };

// One rule per line, "domain[/path]": covers the domain, its subdomains and every URL starting with it.
// "*" matches anything, so "*" alone covers every site.
function isHidden(url, rules) {
  let u;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  const target = u.host + u.pathname + u.search + u.hash;
  return rules.split('\n').some((line) => {
    const rule = line.trim().replace(/^[a-z][a-z0-9+.-]*:\/\//i, '');
    if (!rule) return false;
    const glob = rule.split('*').map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*');
    return new RegExp('^(?:[^/]*\\.)?' + glob, 'i').test(target);
  });
}

if (typeof module !== 'undefined') module.exports = { DEFAULTS, isHidden };
