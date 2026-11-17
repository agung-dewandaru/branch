const shortcutNames = {
  child: 'Add child', sibling: 'Add sibling', rich: 'Add rich text', symbol: 'Add symbol node', edit: 'Edit node',
  doodle: 'Doodle', collapse: 'Collapse or expand', connect: 'Connect nodes', attach: 'Reattach',
  delete: 'Delete branch', fit: 'Fit to view', find: 'Find nodes', undo: 'Undo',
  redo: 'Redo', save: 'Save map', saveAs: 'Save as', open: 'Open map', new: 'New map'
};
const settings = $('settings');
const shortcutButtons = new Map();
let preferences = {};
let draft = {};
let recording = null;
let savingPreferences = false;
let savingAppearance = false;
let activeSettingsTab = 'keyboard';

function buildShortcuts(overrides) {
  const bindings = structuredClone(keymap);
  for (const [action, binding] of Object.entries(overrides)) bindings[action] = [binding];
  return bindings;
}
function bindingConflict(bindings) {
  const used = new Map();
  for (const [action, keys] of Object.entries(bindings)) {
    // These bindings are used in search or while choosing a connector destination.
    if (['nextMatch', 'previousMatch', 'confirmConnector', 'confirmReattach'].includes(action)) continue;
    for (const key of keys) {
      const normalized = normalizedBinding(key);
      if (used.has(normalized)) return [used.get(normalized), action];
      used.set(normalized, action);
    }
  }
  return null;
}
function displayBinding(binding) {
  return binding.replace('Mod', modifier).replace('Meta', '⌘');
}
function refreshRecording() {
  for (const [action, button] of shortcutButtons) {
    button.textContent = recording === action ? 'Press shortcut…' : displayBinding(draft[action] ?? keymap[action][0]);
    button.setAttribute('aria-label', shortcutNames[action] + ': ' + button.textContent);
  }
}
const settingsTabs = ['keyboard', 'appearance', 'ai-settings'];
function selectSettingsTab(tab) {
  for (const name of settingsTabs) {
    $(name + '-tab').setAttribute('aria-selected', name === tab);
    $(name + '-tab').tabIndex = name === tab ? 0 : -1;
    $(name + '-panel').hidden = name !== tab;
  }
  activeSettingsTab = tab;
  $('reset-shortcuts').hidden = $('save-settings').hidden = tab !== 'keyboard';
  $('close-settings').textContent = tab === 'keyboard' ? 'Cancel' : 'Done';
  $('settings-message').textContent = '';
  recording = null;
  refreshRecording();
}
for (const [index, tab] of settingsTabs.entries()) {
  const button = $(tab + '-tab');
  button.onclick = () => selectSettingsTab(tab);
  button.onkeydown = (event) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    const other = settingsTabs[(index + (event.key === 'ArrowRight' ? 1 : -1) + settingsTabs.length) % settingsTabs.length];
    selectSettingsTab(other);
    $(other + '-tab').focus();
  };
}
for (const [action, name] of Object.entries(shortcutNames)) {
  const row = document.createElement('div');
  row.className = 'shortcut-row';
  const label = document.createElement('span');
  label.textContent = name;
  const button = document.createElement('button');
  button.type = 'button';
  shortcutButtons.set(action, button);
  button.onclick = () => {
    recording = action;
    $('settings-message').textContent = '';
    refreshRecording();
  };
  button.onblur = () => {
    if (recording === action) {
      recording = null;
      refreshRecording();
    }
  };
  button.onkeydown = (event) => {
    if (recording !== action || event.isComposing) return;
    if (event.key === 'Tab') return;
    event.preventDefault();
    if (['Control', 'Meta', 'Alt', 'Shift', 'Dead', 'Unidentified'].includes(event.key)) return;
    if (event.key !== 'Escape') {
      const binding = eventBinding(event);
      if (binding === keymap[action][0] || normalizedBinding(binding) === normalizedBinding(keymap[action][0])) {
        delete draft[action];
      } else draft[action] = binding;
      $('settings-message').textContent = '';
    }
    recording = null;
    refreshRecording();
  };
  row.append(label, button);
  $('shortcut-list').append(row);
}
$('open-settings').onclick = async () => {
  await Promise.all([keyboardReady, appearanceReady]);
  if (settings.open) return;
  draft = { ...preferences };
  $('ai-key').value = '';
  refreshKeySettings();
  $('settings-message').textContent = '';
  selectSettingsTab('keyboard');
  settings.showModal();
  $('keyboard-tab').focus();
};
$('reset-shortcuts').onclick = () => {
  draft = {};
  recording = null;
  refreshRecording();
  $('settings-message').textContent = 'Default shortcuts selected. Save settings to apply.';
};
$('close-settings').onclick = () => settings.close();
settings.oncancel = (event) => { if (savingPreferences) event.preventDefault(); };
$('save-settings').onclick = async () => {
  const updated = buildShortcuts(draft);
  const conflict = bindingConflict(updated);
  if (conflict) {
    const [a, b] = conflict.map((action) => shortcutNames[action] ?? action);
    selectSettingsTab('keyboard');
    $('settings-message').textContent = a + ' and ' + b + ' use the same shortcut. Choose a different key.';
    return;
  }
  savingPreferences = true;
  $('save-settings').disabled = $('close-settings').disabled = $('reset-shortcuts').disabled = true;
  const snapshot = { ...draft };
  try {
    await window.branch.saveKeyboard(snapshot);
    preferences = snapshot;
    shortcuts = updated;
    updateShortcutLabels();
    settings.close();
    reveal();
  } catch {
    $('settings-message').textContent = 'Could not save keyboard preferences.';
  } finally {
    savingPreferences = false;
    $('save-settings').disabled = $('close-settings').disabled = $('reset-shortcuts').disabled = false;
  }
};

const keyboardReady = (async () => {
  try {
    const saved = await window.branch.loadKeyboard();
    const valid = Object.fromEntries(Object.entries(saved ?? {}).filter(([action, binding]) =>
      Object.hasOwn(shortcutNames, action) && typeof binding === 'string' && binding.length > 0 && binding.length <= 64
    ));
    const loaded = buildShortcuts(valid);
    if (!bindingConflict(loaded)) {
      preferences = valid;
      shortcuts = loaded;
      updateShortcutLabels();
    }
  } catch {
    status('Could not load keyboard preferences.');
  }
})();

const nightMode = $('night-mode');
function applyNightMode(enabled) {
  document.documentElement.classList.toggle('night', enabled);
  nightMode.checked = enabled;
}
const appearanceReady = (async () => {
  try {
    const appearance = await window.branch.loadAppearance();
    applyNightMode(appearance?.nightMode === true);
  } catch {
    status('Could not load appearance preferences.');
  }
})();
nightMode.onchange = async () => {
  if (savingAppearance) return;
  const enabled = nightMode.checked;
  savingAppearance = true;
  nightMode.disabled = true;
  applyNightMode(enabled);
  try {
    await window.branch.saveAppearance({ nightMode: enabled });
  } catch {
    applyNightMode(!enabled);
    if (settings.open && activeSettingsTab === 'appearance') {
      $('settings-message').textContent = 'Could not save Night mode.';
    } else status('Could not save Night mode.');
  } finally {
    savingAppearance = false;
    nightMode.disabled = false;
  }
};

function refreshKeySettings() {
  $('ai-key-status').textContent = aiConfigured ? 'API key configured.' : 'No API key configured.';
  $('remove-ai-key').disabled = !aiConfigured;
}
async function changeAIKey(key) {
  $('ai-key').disabled = $('save-ai-key').disabled = $('remove-ai-key').disabled = true;
  try {
    aiConfigured = await window.branch.saveAIKey(key);
    $('ai-key').value = '';
    updateAIControls();
    refreshKeySettings();
  } catch {
    $('ai-key-status').textContent = 'Could not update the key. Check that secure credential storage is available.';
  } finally {
    $('ai-key').disabled = $('save-ai-key').disabled = false;
    $('remove-ai-key').disabled = !aiConfigured;
  }
}
$('save-ai-key').onclick = () => {
  const key = $('ai-key').value.trim();
  if (key) return changeAIKey(key);
  $('ai-key-status').textContent = 'Enter your OpenAI API key first.';
};
$('remove-ai-key').onclick = () => changeAIKey('');
