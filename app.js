const $ = (id) => document.getElementById(id);
const mac = navigator.platform.includes('Mac');
const modifier = mac ? '⌘' : 'Ctrl';
function shortcutLabel(action) {
  return keymap[action][0].replace('Mod', modifier);
}
for (const button of document.querySelectorAll('[data-action]')) {
  button.querySelector('kbd').textContent = shortcutLabel(button.dataset.action);
}
for (const action of ['undo', 'find', 'fit']) {
  $(action + '-key').textContent = shortcutLabel(action);
}
function matchesShortcut(event, action) {
  const keys = [
    event.ctrlKey && 'Ctrl', event.metaKey && 'Meta',
    event.altKey && 'Alt', event.shiftKey && 'Shift', event.key
  ].filter(Boolean).join('+').toLowerCase();
  return keymap[action].some((binding) =>
    binding.replace('Mod', mac ? 'Meta' : 'Ctrl').toLowerCase() === keys
  );
}

const palettes = [
  ['#e2efdf', '#a6c0a3'], ['#f8e8cd', '#d4b485'],
  ['#e5e8f7', '#aeb9d9'], ['#f7e3e3', '#d2a7ac']
];
const tags = {
  default: ['Automatic branch color', '#fffefa', '#b9c0b5'],
  green: ['Sage', '#dcebd9', '#76a075'],
  amber: ['Amber', '#fae8c9', '#c38c43'],
  blue: ['Blue', '#dce9fa', '#7197c8'],
  rose: ['Rose', '#f8dfe4', '#bd7e8a'],
  violet: ['Violet', '#eae2f6', '#a086bf'],
  teal: ['Teal', '#d5efea', '#69a99b'],
  gray: ['Slate', '#e6ebee', '#8898a2']
};
const fonts = {
  default: ['App default', 'inherit'],
  arial: ['Arial', 'Arial, sans-serif'],
  georgia: ['Georgia', 'Georgia, serif'],
  verdana: ['Verdana', 'Verdana, sans-serif'],
  times: ['Times New Roman', '"Times New Roman", serif'],
  courier: ['Courier New', '"Courier New", monospace']
};
const minFont = 12;
const maxFont = 32;
const richLimit = 3000;
const allowedMarkup = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'BR', 'DIV', 'P', 'UL', 'OL', 'LI']);
function sanitizeRich(markup) {
  const input = document.createElement('template');
  input.innerHTML = markup;
  const output = document.createElement('div');
  function copy(source, target) {
    for (const child of source.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        target.append(document.createTextNode(child.textContent));
      } else if (child.nodeType === Node.ELEMENT_NODE && !['SCRIPT', 'STYLE', 'TEMPLATE'].includes(child.tagName)) {
        if (allowedMarkup.has(child.tagName)) {
          const element = document.createElement(child.tagName);
          copy(child, element);
          target.append(element);
        } else copy(child, target);
      }
    }
  }
  copy(input.content, output);
  return output.innerHTML;
}
function plainText(markup) {
  const text = document.createElement('template');
  text.innerHTML = markup.replace(/<\/?(?:br|div|p|ul|ol|li)>/gi, ' ');
  return text.content.textContent.replace(/\s+/g, ' ').trim();
}
const layouts = ['balanced', 'right', 'down'];
const node = (id, parent, label) => ({ id, parent, label, dx: 0, dy: 0 });
let map = {
  layout: 'balanced',
  nodes: [
    node('root', null, 'Studio project'), node('ideas', 'root', 'Explore'),
    node('plan', 'root', 'Plan'), node('build', 'root', 'Make'),
    node('review', 'root', 'Review'), node('references', 'ideas', 'Collect references'),
    node('questions', 'ideas', 'List open questions'), node('scope', 'plan', 'Set the scope'),
    node('milestones', 'plan', 'Pick milestones'), node('draft', 'build', 'First draft'),
    node('feedback', 'review', 'Gather feedback')
  ]
};
let selected = 'root';
let pending = null;
let connectorSource = null;
let file = null;
let clean = JSON.stringify(map);
let undo = [];
let redo = [];
let scale = 1;
let width, height;
let positions = new Map();
let matches = [];
let matchIndex = -1;
let busy = false;

const current = () => map.nodes.find(({ id }) => id === selected);
const dirty = () => JSON.stringify(map) !== clean;
const status = (message) => { $('status').textContent = message; };
const children = (id) => map.nodes.filter((item) => item.parent === id);
function descendants(id) {
  const result = new Set([id]);
  for (const parent of result) {
    for (const child of children(parent)) result.add(child.id);
  }
  return result;
}
function commit(change) {
  undo.push({ map: structuredClone(map), selected });
  if (undo.length > 100) undo.shift();
  redo = [];
  change();
  render();
}
function restore(from, to) {
  if (!from.length) return;
  to.push({ map, selected });
  ({ map, selected } = from.pop());
  pending = null;
  connectorSource = null;
  render();
  reveal();
}

function nodeElement(item, color) {
  const [fill, border] = item.tag ? tags[item.tag].slice(1) : palettes[Math.max(0, color)];
  const element = document.createElement('div');
  element.className = 'node';
  element.classList.toggle('root', item.parent === null);
  element.classList.toggle('tagged', Boolean(item.tag));
  element.classList.toggle('rich', item.rich !== undefined);
  element.setAttribute('role', 'button');
  element.setAttribute('aria-label', item.label);
  element.dataset.node = item.id;
  element.style.setProperty('--fill', fill);
  element.style.setProperty('--border', border);
  element.style.setProperty('--node-font', fonts[item.font ?? 'default'][1]);
  element.style.setProperty('--node-size', (item.fontSize ?? 14) + 'px');
  if (item.rich === undefined) element.textContent = item.label;
  else {
    const title = document.createElement('span');
    title.className = 'node-title';
    title.textContent = item.label;
    const body = document.createElement('div');
    body.className = 'rich-content';
    body.innerHTML = item.rich;
    element.append(title, body);
  }
  const childCount = item.collapsed ? children(item.id).length : 0;
  if (childCount) {
    const dots = document.createElement('span');
    dots.className = 'collapsed-dots';
    dots.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < childCount; i++) dots.append(document.createElement('span'));
    element.append(dots);
    element.setAttribute('aria-label', item.label + ', ' + childCount + ' collapsed children');
  }
  return element;
}
function geometry() {
  const vertical = map.layout === 'down';
  const root = map.nodes[0];
  const visible = [root];
  const visibleChildren = (item) => item.collapsed ? [] : children(item.id);
  for (const item of visible) visible.push(...visibleChildren(item));
  const elements = visible.map((item) => {
    const element = nodeElement(item, 0);
    const w = item.rich !== undefined ? 260 : item.parent === null ? 180 : 156;
    element.classList.add('node-measure');
    element.style.width = w + 'px';
    return { item, element, w };
  });
  const measure = document.createElement('div');
  measure.append(...elements.map(({ element }) => element));
  document.body.append(measure);
  const sizes = new Map(elements.map(({ item, element, w }) => [item.id, { w, h: Math.max(48, Math.ceil(element.getBoundingClientRect().height)) }]));
  measure.remove();
  const horizontalGap = Math.max(...elements.map(({ w }) => w)) + 48;
  const levelHeights = [];
  function measureLevels(item, depth) {
    levelHeights[depth] = Math.max(levelHeights[depth] ?? 0, sizes.get(item.id).h);
    for (const child of visibleChildren(item)) measureLevels(child, depth + 1);
  }
  measureLevels(root, 0);
  const levelCenters = [0];
  for (let depth = 1; depth < levelHeights.length; depth++) {
    levelCenters.push(levelCenters[depth - 1] + (levelHeights[depth - 1] + levelHeights[depth]) / 2 + 55);
  }
  const placed = [{ item: root, x: root.dx, y: root.dy, color: -1, ...sizes.get(root.id) }];
  const spans = new Map();
  function span(item) {
    if (!spans.has(item.id)) {
      const { w, h } = sizes.get(item.id);
      spans.set(item.id, Math.max((vertical ? w : h) + 24, visibleChildren(item).reduce((sum, child) => sum + span(child), 0)));
    }
    return spans.get(item.id);
  }
  function place(item, depth, center, side, color, ox, oy) {
    const x = ox + item.dx;
    const y = oy + item.dy;
    placed.push({ item, x: x + (vertical ? center : side * depth * horizontalGap),
      y: y + (vertical ? levelCenters[depth] : center), color, ...sizes.get(item.id) });
    placeGroup(visibleChildren(item), depth + 1, center, side, color, x, y);
  }
  const first = visibleChildren(root);
  function placeGroup(group, depth, center, side, color, ox, oy) {
    let cursor = center - group.reduce((sum, item) => sum + span(item), 0) / 2;
    for (const item of group) {
      const extent = span(item);
      place(item, depth, cursor + extent / 2, side, color ?? first.indexOf(item) % palettes.length, ox, oy);
      cursor += extent;
    }
  }
  const left = map.layout === 'balanced' ? first.filter((_, i) => i % 2) : [];
  placeGroup(first.filter((item) => !left.includes(item)), 1, 0, 1, null, root.dx, root.dy);
  placeGroup(left, 1, 0, -1, null, root.dx, root.dy);
  const minX = Math.min(...placed.map(({ x, w }) => x - w / 2));
  const minY = Math.min(...placed.map(({ y, h }) => y - h / 2));
  width = Math.ceil(Math.max(...placed.map(({ x, w }) => x + w / 2)) - minX + 40);
  height = Math.ceil(Math.max(...placed.map(({ y, h }) => y + h / 2)) - minY + 40);
  return new Map(placed.map((entry) => [entry.item.id, { ...entry, x: entry.x - minX + 20, y: entry.y - minY + 20 }]));
}
function sizeDiagram() {
  const diagram = $('diagram');
  const viewport = $('viewport');
  const spaceWidth = viewport.clientWidth + width * scale;
  const spaceHeight = viewport.clientHeight + height * scale;
  Object.assign($('space').style, { width: spaceWidth + 'px', height: spaceHeight + 'px' });
  Object.assign(diagram.style, { left: (spaceWidth - width * scale) / 2 + 'px',
    top: (spaceHeight - height * scale) / 2 + 'px', transform: 'scale(' + scale + ')' });
  $('zoom').textContent = Math.round(scale * 100) + '%';
}
function render() {
  positions = geometry();
  if (pending && !positions.has(pending)) pending = null;
  if (connectorSource && !positions.has(connectorSource)) connectorSource = null;
  const diagram = $('diagram');
  const edges = $('edges');
  diagram.replaceChildren(edges);
  edges.replaceChildren();
  edges.setAttribute('width', width);
  edges.setAttribute('height', height);
  const printScale = Math.min(1.8, 1040 / width, 710 / height);
  diagram.style.setProperty('--print-scale', printScale);
  diagram.style.setProperty('--print-x', (1040 - width * printScale) / 2 + 'px');
  diagram.style.setProperty('--print-y', (710 - height * printScale) / 2 + 'px');
  for (const [id, entry] of positions) {
    const { x, y, w, h, item, color } = entry;
    const border = item.tag ? tags[item.tag][2] : palettes[Math.max(0, color)][1];
    if (item.parent !== null) {
      const parent = positions.get(item.parent);
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const d = map.layout === 'down'
        ? `M ${parent.x} ${parent.y} C ${parent.x} ${(parent.y + y) / 2} ${x} ${(parent.y + y) / 2} ${x} ${y}`
        : `M ${parent.x} ${parent.y} C ${(parent.x + x) / 2} ${parent.y} ${(parent.x + x) / 2} ${y} ${x} ${y}`;
      path.setAttribute('d', d);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', border);
      path.setAttribute('stroke-width', '2');
      edges.append(path);
    }
    const button = nodeElement(item, color);
    Object.assign(button.style, {
      left: x - w / 2 + 'px', top: y - h / 2 + 'px',
      width: w + 'px', height: h + 'px'
    });
    diagram.append(button);
  }
  for (const [source, destination, caption] of map.connectors ?? []) {
    const a = positions.get(source);
    const b = positions.get(destination);
    if (!a || !b) continue;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length = Math.hypot(dx, dy) || 1;
    const bend = Math.min(90, Math.max(36, length / 3));
    const cx = Math.max(8, Math.min(width - 8, (a.x + b.x) / 2 - dy / length * bend));
    const cy = Math.max(8, Math.min(height - 8, (a.y + b.y) / 2 + dx / length * bend));
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', `M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`);
    path.setAttribute('class', 'connector');
    edges.append(path);
    if (caption) {
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.textContent = caption;
      const textWidth = Math.min(270, width - 16);
      const midpoint = (a.x + 2 * cx + b.x) / 4;
      const labelX = Math.max(textWidth / 2 + 4, Math.min(width - textWidth / 2 - 4, midpoint));
      label.setAttribute('x', labelX);
      label.setAttribute('y', Math.max(14, (a.y + 2 * cy + b.y) / 4 - 7));
      label.setAttribute('class', 'connector-caption');
      edges.append(label);
      if (label.getComputedTextLength() > textWidth) {
        label.setAttribute('textLength', textWidth);
        label.setAttribute('lengthAdjust', 'spacingAndGlyphs');
      }
    }
  }
  $('document').textContent = map.nodes[0].label + (dirty() ? ' •' : '');
  $('count').textContent = map.nodes.length + (map.nodes.length === 1 ? ' node' : ' nodes');
  $('layout').value = map.layout;
  updateSearch();
  sizeDiagram();
}
function updateProperties() {
  const item = current();
  for (const button of $('tags').children) {
    button.setAttribute('aria-pressed', button.dataset.tag === (item.tag ?? 'default'));
  }
  $('font').value = item.font ?? 'default';
  const size = item.fontSize ?? 14;
  $('font-size').value = size + ' px';
  $('smaller').disabled = size <= minFont;
  $('larger').disabled = size >= maxFont;
}
function setProperty(key, value) {
  const item = current();
  const fallback = key === 'fontSize' ? 14 : 'default';
  if ((item[key] ?? fallback) === value) return reveal();
  commit(() => {
    if (value === 'default' || (key === 'fontSize' && value === 14)) delete item[key];
    else item[key] = value;
  });
  reveal();
}
for (const [key, [name, fill, border]] of Object.entries(tags)) {
  const button = document.createElement('button');
  button.dataset.tag = key;
  button.title = name;
  button.setAttribute('aria-label', name);
  button.style.setProperty('--swatch', fill);
  button.style.setProperty('--swatch-border', border);
  button.onclick = () => setProperty('tag', key);
  $('tags').append(button);
}
for (const [key, [name]] of Object.entries(fonts)) $('font').add(new Option(name, key));
$('font').onchange = () => setProperty('font', $('font').value);
$('smaller').onclick = () => setProperty('fontSize', Math.max(minFont, (current().fontSize ?? 14) - 2));
$('larger').onclick = () => setProperty('fontSize', Math.min(maxFont, (current().fontSize ?? 14) + 2));
function highlight() {
  updateProperties();
  $('connect').setAttribute('aria-pressed', connectorSource !== null);
  for (const button of $('diagram').querySelectorAll('.node')) {
    const id = button.dataset.node;
    button.classList.toggle('selected', id === selected);
    button.classList.toggle('pending', id === pending || id === connectorSource);
    button.classList.toggle('match', matches.includes(id));
    button.tabIndex = id === selected ? 0 : -1;
    button.setAttribute('aria-pressed', id === selected);
  }
}
function updateSearch(reset = false) {
  const query = $('search').value.trim().toLocaleLowerCase();
  matches = query ? map.nodes.filter(({ id }) => positions.has(id)).filter(({ label, rich }) => (label + (rich === undefined ? '' : ' ' + plainText(rich))).toLocaleLowerCase().includes(query)).map(({ id }) => id) : [];
  if (reset) matchIndex = -1;
  else matchIndex = matches.indexOf(selected);
  $('matches').textContent = !query ? '' : matchIndex < 0 ? String(matches.length) : `${matchIndex + 1}/${matches.length}`;
  $('prev').disabled = $('next').disabled = !matches.length;
  highlight();
}
function reveal(focus = true) {
  const button = $('diagram').querySelector('[data-node="' + CSS.escape(selected) + '"]');
  button.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  if (focus) button.focus({ preventScroll: true });
}
function select(id, focus = true) {
  selected = id;
  updateSearch();
  reveal(focus);
}
function findNext(step) {
  if (!matches.length) return;
  const index = matchIndex < 0 ? (step > 0 ? 0 : matches.length - 1) : (matchIndex + step + matches.length) % matches.length;
  select(matches[index], false);
}
function fit() {
  scale = Math.min(1.2, Math.max(0.01, Math.min(($('viewport').clientWidth - 38) / width, ($('viewport').clientHeight - 112) / height)));
  sizeDiagram();
  $('viewport').scrollTo(width * scale / 2, height * scale / 2);
}
function edit(kind) {
  const dialog = $('editor');
  const existing = current();
  if (kind !== 'edit' && map.nodes.length >= 500) return status('This map has reached the 500-node limit.');
  const rich = kind === 'rich' || (kind === 'edit' && existing.rich !== undefined);
  $('rich-fields').hidden = !rich;
  dialog.classList.toggle('rich-editor', rich);
  $('editor-title').textContent = rich ? 'Rich-text node' : 'Node label';
  $('rich-body').innerHTML = kind === 'edit' ? existing.rich ?? '' : '';
  $('rich-error').textContent = '';
  $('label').value = kind === 'edit' ? existing.label : '';
  dialog.onclose = () => { if (!dialog.open) reveal(); };
  dialog.querySelector('form').onsubmit = (event) => {
    event.preventDefault();
    const label = $('label').value.trim();
    if (!label) { $('label').focus(); return; }
    const body = rich ? sanitizeRich($('rich-body').innerHTML) : undefined;
    if (body?.length > richLimit) {
      $('rich-error').textContent = 'This note is too long. Shorten the text or split it into two nodes.';
      $('rich-body').focus();
      return;
    }
    dialog.close();
    if (kind !== 'edit' || label !== existing.label || body !== existing.rich) {
      commit(() => {
        if (kind === 'edit') {
          existing.label = label;
          if (rich) existing.rich = body;
        } else {
          selected = crypto.randomUUID();
          const item = node(selected, kind === 'sibling' ? existing.parent ?? existing.id : existing.id, label);
          const parent = map.nodes.find(({ id }) => id === item.parent);
          delete parent.collapsed;
          if (rich) item.rich = body;
          map.nodes.push(item);
        }
      });
    }
    reveal();
  };
  dialog.showModal();
  $('label').focus();
  $('label').select();
}
$('cancel-edit').onclick = () => $('editor').close();
const richBody = $('rich-body');
richBody.addEventListener('paste', (event) => {
  event.preventDefault();
  document.execCommand('insertText', false, event.clipboardData.getData('text/plain'));
});
richBody.addEventListener('drop', (event) => event.preventDefault());
const formatting = $('formatting');
formatting.addEventListener('mousedown', (event) => {
  if (event.target.closest('[data-format]')) event.preventDefault();
});
formatting.addEventListener('click', (event) => {
  const button = event.target.closest('[data-format]');
  if (!button) return;
  richBody.focus();
  document.execCommand(button.dataset.format);
});
function sameConnector(pair, a, b) {
  return (pair[0] === a && pair[1] === b) || (pair[0] === b && pair[1] === a);
}
function finishConnector() {
  if (connectorSource === selected) return status('Choose a different destination node. Esc cancels.');
  const existing = (map.connectors ?? []).findIndex((pair) => sameConnector(pair, connectorSource, selected));
  if (existing >= 0) {
    commit(() => {
      map.connectors.splice(existing, 1);
      if (!map.connectors.length) delete map.connectors;
      connectorSource = null;
    });
    status('Nodes disconnected. ' + modifier + '+Z to undo.');
    reveal();
    return;
  }
  const source = connectorSource;
  const destination = selected;
  const dialog = $('connector-editor');
  const input = $('connector-caption');
  input.value = '';
  connectorSource = null;
  highlight();
  dialog.querySelector('form').onsubmit = (event) => {
    event.preventDefault();
    const caption = input.value.trim();
    dialog.close();
    commit(() => {
      const pair = [source, destination];
      if (caption) pair.push(caption);
      (map.connectors ??= []).push(pair);
    });
    status('Nodes connected. ' + modifier + '+Z to undo.');
    reveal();
  };
  dialog.oncancel = () => status('Connector canceled.');
  dialog.onclose = () => { if (!dialog.open) reveal(); };
  dialog.showModal();
  input.focus();
}
$('cancel-connector').onclick = () => {
  $('connector-editor').close();
  status('Connector canceled.');
};
function act(action) {
  if (action === 'collapse') {
    const item = current();
    if (!children(item.id).length && !item.collapsed) return status('This node has no children.');
    commit(() => {
      if (item.collapsed) delete item.collapsed;
      else item.collapsed = true;
    });
    reveal();
    status(item.collapsed ? 'Children collapsed.' : 'Children expanded.');
    return;
  }
  if (action === 'connect') {
    pending = null;
    connectorSource = selected;
    highlight();
    reveal();
    status('Select a destination, then press Enter. Esc cancels.');
    return;
  }
  if (['child', 'sibling', 'edit', 'rich'].includes(action)) return edit(action);
  if (action === 'delete') {
    if (current().parent === null) return status('The central node stays in the map.');
    const removed = descendants(selected);
    commit(() => {
      selected = current().parent;
      map.nodes = map.nodes.filter(({ id }) => !removed.has(id));
      if (map.connectors) {
        map.connectors = map.connectors.filter(([a, b]) => !removed.has(a) && !removed.has(b));
        if (!map.connectors.length) delete map.connectors;
      }
      pending = null;
      connectorSource = null;
    });
    status('Branch deleted. ' + modifier + '+Z to undo.');
    reveal();
  }
  if (action === 'attach') {
    if (!pending) {
      if (current().parent === null) return status('Select a branch to reattach.');
      connectorSource = null;
      pending = selected;
      highlight();
      status('Select a new parent, then press R or click Reattach. Esc cancels.');
      return;
    }
    if (descendants(pending).has(selected)) return status('Choose a parent outside the moving branch. Esc cancels.');
    commit(() => {
      const item = map.nodes.find(({ id }) => id === pending);
      item.parent = selected;
      delete current().collapsed;
      item.dx = item.dy = 0;
      selected = pending;
      pending = null;
      connectorSource = null;
    });
    status('Branch reattached.');
    reveal();
  }
}
function navigate(key, move) {
  const directions = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  const [dx, dy] = directions[key];
  if (move) {
    commit(() => {
      current().dx = Math.max(-10000, Math.min(10000, current().dx + dx * 20));
      current().dy = Math.max(-10000, Math.min(10000, current().dy + dy * 20));
    });
    reveal();
    return;
  }
  const origin = positions.get(selected);
  let nearest, best = Infinity;
  for (const [id, point] of positions) {
    const forward = (point.x - origin.x) * dx + (point.y - origin.y) * dy;
    const across = (point.x - origin.x) * dy - (point.y - origin.y) * dx;
    if (forward > 0 && forward + Math.abs(across) * 2.5 < best) {
      nearest = id;
      best = forward + Math.abs(across) * 2.5;
    }
  }
  if (nearest) select(nearest);
}
function parse(content) {
  const data = JSON.parse(content);
  const validNode = (item) => item && typeof item.id === 'string' && item.id.length > 0 && item.id.length <= 120 &&
    typeof item.label === 'string' && item.label.trim() && item.label.length <= 120 &&
    [item.dx, item.dy].every((offset) => Number.isFinite(offset) && Math.abs(offset) <= 10000) &&
    (item.collapsed === undefined || typeof item.collapsed === 'boolean') &&
    (item.tag === undefined || Object.hasOwn(tags, item.tag)) &&
    (item.font === undefined || Object.hasOwn(fonts, item.font)) &&
    (item.fontSize === undefined || (Number.isInteger(item.fontSize) && item.fontSize >= minFont && item.fontSize <= maxFont)) &&
    (item.rich === undefined || (typeof item.rich === 'string' && item.rich.length <= richLimit));
  if (data?.version !== 1 || !layouts.includes(data.layout) || !Array.isArray(data.nodes) ||
      !data.nodes.length || data.nodes.length > 500 || !data.nodes.every(validNode) || data.nodes[0].parent !== null) {
    throw new Error('This file is not a supported Branch map.');
  }
  const nodes = data.nodes.map(({ id, parent, label, dx, dy, tag, font, fontSize, rich, collapsed }) => ({
    id, parent, label, dx, dy, tag, font, fontSize, collapsed: collapsed || undefined, rich: rich === undefined ? undefined : sanitizeRich(rich)
  }));
  if (nodes.some(({ rich }) => rich?.length > richLimit)) throw new Error('A rich-text node exceeds the size limit.');
  const byId = new Map(nodes.map((item) => [item.id, item]));
  if (byId.size !== nodes.length) throw new Error('The map contains duplicate node IDs.');
  for (const item of nodes.slice(1)) {
    const seen = new Set();
    let cursor = item;
    while (cursor && cursor !== nodes[0] && !seen.has(cursor.id)) {
      seen.add(cursor.id);
      cursor = byId.get(cursor.parent);
    }
    if (cursor !== nodes[0]) throw new Error('The map contains a disconnected branch or a loop.');
  }
  const result = { layout: data.layout, nodes };
  if (data.connectors !== undefined) {
    if (!Array.isArray(data.connectors)) throw new Error('The map has invalid connectors.');
    const seen = new Set();
    for (const pair of data.connectors) {
      if (!Array.isArray(pair) || (pair.length !== 2 && pair.length !== 3) ||
          (pair.length === 3 && (typeof pair[2] !== 'string' || pair[2].length > 120)) || pair[0] === pair[1] ||
          !byId.has(pair[0]) || !byId.has(pair[1])) throw new Error('The map has an invalid connector.');
      const key = JSON.stringify(pair.slice(0, 2).sort());
      if (seen.has(key)) throw new Error('The map has duplicate connectors.');
      seen.add(key);
    }
    if (data.connectors.length) result.connectors = data.connectors;
  }
  return result;
}
function discardOkay() {
  return !dirty() || window.confirm('Discard unsaved changes to this map?');
}
function replace(next, nextFile) {
  map = next;
  file = nextFile;
  clean = JSON.stringify(map);
  selected = map.nodes[0].id;
  pending = null;
  connectorSource = null;
  undo = [];
  redo = [];
  $('search').value = '';
  render();
  fit();
  reveal();
}
let saveToastTimer;
function showSaveToast() {
  const toast = $('save-toast');
  clearTimeout(saveToastTimer);
  toast.textContent = 'File saved.';
  toast.classList.add('visible');
  saveToastTimer = setTimeout(() => {
    toast.classList.remove('visible');
    toast.textContent = '';
  }, 3000);
}
async function fileAction(action) {
  if (busy) return;
  busy = true;
  try {
    if (action === 'new' && discardOkay()) {
      replace({ layout: 'balanced', nodes: [node('root', null, 'Untitled map')] }, null);
      edit('edit');
      status('New map.');
    }
    if (action === 'open' && discardOkay()) {
      const opened = await window.branch.open();
      if (opened) {
        replace(parse(opened.content), opened.file);
        status('Map opened.');
        await window.branch.rememberOpened(opened.file);
      }
    }
    if (action === 'save' || action === 'save-as') {
      const snapshot = JSON.stringify(map);
      const saved = await window.branch.save(JSON.stringify({ version: 1, ...map }, null, 2), action === 'save-as' ? null : file);
      if (saved) {
        file = saved;
        clean = snapshot;
        $('document').textContent = map.nodes[0].label + (dirty() ? ' •' : '');
        status('Map saved.');
        showSaveToast();
      }
    }
    if (action === 'pdf' && await window.branch.pdf(map.nodes[0].label)) status('PDF exported.');
  } catch (error) {
    status(error.message);
  } finally {
    busy = false;
  }
}
for (const action of ['new', 'open', 'save', 'pdf']) $(action).onclick = () => fileAction(action);
document.querySelectorAll('[data-action]').forEach((button) => {
  button.onclick = () => act(button.dataset.action);
});
$('diagram').onclick = (event) => {
  const button = event.target.closest('[data-node]');
  if (button) select(button.dataset.node);
};
$('diagram').ondblclick = (event) => {
  if (event.target.closest('[data-node]')) edit('edit');
};
function relayout() {
  commit(() => {
    map.layout = $('layout').value;
    for (const item of map.nodes) item.dx = item.dy = 0;
  });
  fit();
  status('Layout applied.');
}
$('layout').onchange = relayout;
$('relayout').onclick = relayout;
$('fit').onclick = () => { fit(); reveal(); };
$('search').oninput = () => updateSearch(true);
$('prev').onclick = () => findNext(-1);
$('next').onclick = () => findNext(1);
function zoom(factor) {
  scale = Math.min(2, Math.max(0.01, scale * factor));
  sizeDiagram();
  reveal(false);
}
$('minus').onclick = () => zoom(1 / 1.2);
$('plus').onclick = () => zoom(1.2);
const viewport = $('viewport');
let pan = null;
viewport.addEventListener('pointerdown', (event) => {
  if (event.button !== 0 || event.target.closest('.node')) return;
  event.preventDefault();
  viewport.setPointerCapture(event.pointerId);
  pan = { id: event.pointerId, x: event.clientX, y: event.clientY,
    left: viewport.scrollLeft, top: viewport.scrollTop };
  viewport.classList.add('panning');
  $('diagram').querySelector('.selected')?.focus({ preventScroll: true });
});
viewport.addEventListener('pointermove', (event) => {
  if (pan?.id !== event.pointerId) return;
  viewport.scrollTo(pan.left + pan.x - event.clientX, pan.top + pan.y - event.clientY);
});
viewport.addEventListener('lostpointercapture', (event) => {
  if (pan?.id !== event.pointerId) return;
  pan = null;
  viewport.classList.remove('panning');
});
let lastViewportSize;
new ResizeObserver(() => {
  const size = { width: viewport.clientWidth, height: viewport.clientHeight };
  if (!lastViewportSize || size.width !== lastViewportSize.width || size.height !== lastViewportSize.height) {
    lastViewportSize = size;
    sizeDiagram();
  }
}).observe(viewport);
window.addEventListener('beforeunload', (event) => {
  if (dirty()) {
    event.preventDefault();
    event.returnValue = false;
  }
});
document.addEventListener('keydown', (event) => {
  if ($('editor').open || $('connector-editor').open || event.isComposing) return;
  const is = (action) => matchesShortcut(event, action);
  const globalActions = {
    find: () => { $('search').focus(); $('search').select(); },
    undo: () => restore(undo, redo),
    redo: () => restore(redo, undo),
    save: () => fileAction('save'),
    saveAs: () => fileAction('save-as'),
    open: () => fileAction('open'),
    new: () => fileAction('new')
  };
  const globalAction = Object.keys(globalActions).find(is);
  if (globalAction) {
    event.preventDefault();
    globalActions[globalAction]();
    return;
  }
  if (event.target === $('search')) {
    if (is('nextMatch') || is('previousMatch')) {
      event.preventDefault();
      findNext(is('previousMatch') ? -1 : 1);
    }
    if (is('cancel')) { $('search').value = ''; updateSearch(); reveal(); }
    return;
  }
  if (is('cancel') && (pending || connectorSource)) {
    const wasConnecting = connectorSource !== null;
    pending = null;
    connectorSource = null;
    highlight();
    status(wasConnecting ? 'Connector canceled.' : 'Reattach canceled.');
    return;
  }
  if (event.target.matches('input, select, textarea, [contenteditable]')) return;
  if (event.target.matches('button:not(.node)') &&
      event.key === 'Enter' && !event.ctrlKey && !event.metaKey && !event.altKey) return;
  if (connectorSource && is('confirmConnector')) {
    event.preventDefault();
    if (!event.repeat) finishConnector();
    return;
  }
  const action = ['child', 'sibling', 'rich', 'edit', 'delete', 'attach', 'connect', 'collapse'].find(is);
  if (action) {
    event.preventDefault();
    if (!event.repeat) act(action);
  } else if (is('navigate') || is('move')) {
    event.preventDefault();
    navigate(event.key, is('move'));
  } else if (is('fit')) fit();
});
render();
fit();
reveal();

async function restoreLastMap() {
  busy = true;
  try {
    const opened = await window.branch.restore();
    if (opened && !dirty()) {
      replace(parse(opened.content), opened.file);
      status('Last map reopened.');
    }
  } catch {
    status('Last map could not be reopened.');
  } finally {
    busy = false;
  }
}
restoreLastMap();
