// While stream mode is on, precover.css makes every new page start black before Chrome draws it:
// content.js reads the settings asynchronously, and a page can paint before the answer arrives.
let precover = Promise.resolve();
const syncPrecover = (enabled) => {
  precover = precover
    .then(() => chrome.scripting.unregisterContentScripts())
    .then(() => enabled && chrome.scripting.registerContentScripts([
      { id: 'precover', matches: ['<all_urls>'], css: ['precover.css'], runAt: 'document_start' },
    ]))
    .catch(console.error);
};

const showState = ({ enabled }) => {
  chrome.action.setBadgeText({ text: enabled ? 'ON' : '' });
  chrome.action.setBadgeBackgroundColor({ color: '#d93025' });
  chrome.action.setTitle({ title: chrome.i18n.getMessage(enabled ? 'actionOn' : 'actionOff') });
  syncPrecover(enabled);
};
const refresh = () => chrome.storage.local.get('enabled').then(showState);

// Icon click and the Alt+Shift+H shortcut (_execute_action) both land here.
const toggle = async () => {
  const { enabled } = await chrome.storage.local.get('enabled');
  await chrome.storage.local.set({ enabled: !enabled });
};
chrome.action.onClicked.addListener(toggle);

chrome.storage.onChanged.addListener((changes) => {
  if (changes.enabled) showState({ enabled: changes.enabled.newValue });
});

chrome.runtime.onStartup.addListener(refresh);

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  refresh();
  if (reason === 'install') chrome.runtime.openOptionsPage();
  // Chrome injects content scripts only when a page loads: also cover the tabs already open.
  for (const tab of await chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] })) {
    chrome.scripting
      .executeScript({ target: { tabId: tab.id }, files: ['shared.js', 'content.js'] })
      .catch(() => {}); // discarded or restricted tab: it gets the script on its next load
  }
});
