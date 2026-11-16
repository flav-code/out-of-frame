(() => {
  const MASKED_TITLE = chrome.i18n.getMessage('maskedTitle');
  const state = { ...DEFAULTS };
  let realTitle = null;
  let retired = false;

  const cover = document.createElement('out-of-frame-cover');
  cover.setAttribute('popover', 'manual');
  cover.setAttribute(
    'style',
    ['all:initial', 'position:fixed', 'inset:0', 'z-index:2147483647', 'background:#000',
      'display:flex', 'align-items:center', 'justify-content:center']
      .map((rule) => rule + '!important').join(';'),
  );
  const label = cover.attachShadow({ mode: 'closed' }).appendChild(document.createElement('p'));
  label.setAttribute('style', 'margin:0 24px;color:#888;font:20px/1.4 system-ui,sans-serif;text-align:center');

  // The top layer draws above any z-index; re-entering it puts the cover above whatever the page opened since.
  const promote = () => {
    try {
      if (cover.matches(':popover-open')) cover.hidePopover();
      cover.showPopover();
    } catch {}
  };

  const maskTitle = () => {
    if (document.title === MASKED_TITLE) return;
    realTitle = document.title;
    document.title = MASKED_TITLE;
  };

  // While covered: put the cover back if the page removes it, and keep the tab title masked
  // (the tab strip shows on stream, and Gmail puts the email subject and your address there).
  const guard = new MutationObserver(() => {
    if (!cover.isConnected) {
      document.documentElement.append(cover);
      promote();
    }
    maskTitle();
  });

  const show = () => {
    if (cover.isConnected) return;
    document.documentElement.append(cover);
    promote();
    guard.observe(document, { subtree: true, childList: true, characterData: true });
    maskTitle();
  };

  const hide = () => {
    if (!cover.isConnected) return;
    guard.disconnect();
    cover.remove();
    if (realTitle !== null) document.title = realTitle;
  };

  const update = () => {
    if (retired) return;
    label.textContent = state.message;
    const hidden = state.enabled && isHidden(location.href, state.rules);
    // shortcut: a page that strips this attribute from <html> while the mode is on turns black again; fine for privacy.
    document.documentElement.toggleAttribute('data-out-of-frame-clear', !hidden); // lifts precover.css
    if (hidden) show();
    else hide();
  };

  const reload = () => {
    if (retired) return Promise.resolve();
    return chrome.storage.local.get(DEFAULTS).then((saved) => {
      Object.assign(state, saved);
      update();
    });
  };

  // A page Chrome freezes or keeps in its back/forward cache can miss settings changes. Cover it on the
  // way out if it is listed, so it comes back covered, then let reload() decide with fresh settings.
  const coverIfListed = () => {
    if (retired || !isHidden(location.href, state.rules)) return;
    document.documentElement.removeAttribute('data-out-of-frame-clear');
    show();
  };

  addEventListener('toggle', (e) => {
    if (cover.isConnected && e.target !== cover && e.newState === 'open') promote();
  }, true);
  addEventListener('fullscreenchange', () => cover.isConnected && promote(), true);
  addEventListener('pagehide', (e) => e.persisted && coverIfListed());
  addEventListener('pageshow', (e) => e.persisted && reload());
  document.addEventListener('freeze', coverIfListed);
  document.addEventListener('resume', reload);
  navigation.addEventListener('currententrychange', update); // pushState and #hash navigations
  chrome.storage.onChanged.addListener((changes) => {
    for (const [key, { newValue }] of Object.entries(changes)) state[key] = newValue ?? DEFAULTS[key];
    update();
  });

  reload().then(() => {
    // After an extension update, the old copy of this script still runs here but no longer gets
    // settings changes: retire it, now that this copy covers the page if needed.
    document.dispatchEvent(new Event('out-of-frame:retire'));
    document.addEventListener('out-of-frame:retire', () => {
      retired = true;
      hide();
    }, { once: true });
  });
})();
