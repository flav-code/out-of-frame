const t = (key) => chrome.i18n.getMessage(key);

document.documentElement.lang = chrome.i18n.getUILanguage();
for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);

chrome.commands.getAll().then((commands) => {
  const toggle = commands.find((c) => c.name === '_execute_action');
  document.getElementById('shortcut').textContent = toggle?.shortcut || t('noShortcut');
});

const saved = document.getElementById('saved');
const fields = ['rules', 'message'].map((id) => document.getElementById(id));
chrome.storage.local.get(DEFAULTS).then((s) => {
  for (const field of fields) field.value = s[field.id];
});
for (const field of fields) {
  field.addEventListener('input', () => {
    chrome.storage.local.set({ [field.id]: field.value }).then(() => {
      saved.textContent = t('saved');
    });
  });
}
