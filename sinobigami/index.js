// ==========================================
// シノビガミ キャラシ作成サイト - メインスクリプト
// ==========================================

// ==========================================
// テーマ切り替え（和紙 / 黒背景 / 黒背景+朱を抑える）
// ==========================================
(() => {
  const THEMES = [
    { key: 'light', label: 'デフォルトテーマ' },
    { key: 'dark', label: 'ダークモード1' },
    { key: 'dark-muted', label: 'ダークモード2' },
    { key: 'dark-full', label: 'ダークモード3' },
  ];
  const STORAGE_KEY = 'sinobigami_theme';
  const btn = document.getElementById('theme_toggle_btn');
  if (!btn) return;

  const ICON_THEME = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"/></svg>';

  const applyTheme = (key) => {
    if (key === 'light') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', key);
    }
    const theme = THEMES.find(t => t.key === key) || THEMES[0];
    btn.innerHTML = `${ICON_THEME}${theme.label}`;
  };

  const saved = localStorage.getItem(STORAGE_KEY) || 'light';
  applyTheme(saved);

  btn.addEventListener('click', () => {
    const current = localStorage.getItem(STORAGE_KEY) || 'light';
    const idx = THEMES.findIndex(t => t.key === current);
    const next = THEMES[(idx + 1) % THEMES.length].key;
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  });
})();

// --- 共通ヘルパー ---

/** ID または name で要素を探し、値を返す */
const getFieldValue = (key, fallback = '') => {
  const el = document.getElementById(key) || document.querySelector(`[name="${key}"]`);
  return el ? (el.value || fallback) : fallback;
};

/** 複数のキー候補から最初に値が見つかったものを返す */
const getFirstValue = (keys, fallback = '0') => {
  for (const key of keys) {
    const v = getFieldValue(key);
    if (v) return v;
  }
  return fallback;
};

/** 奥義データを収集 */
const collectOugi = () => {
  const ougi = [];
  let i = 1;
  while (document.querySelector(`[name="ougi_name_${i}"]`)) {
    ougi.push({
      name: document.querySelector(`[name="ougi_name_${i}"]`).value || '',
      skill: document.querySelector(`[name="ougi_skill_${i}"]`).value || '',
      kaizou: document.querySelector(`[name="ougi_kaizou_${i}"]`).value || '',
      effect: document.querySelector(`[name="ougi_effect_${i}"]`).value || '',
    });
    i++;
  }
  return ougi;
};

const NINPO_FIELD_ORDER = ['name', 'type', 'skill', 'range', 'cost', 'effect', 'ref'];
const NINPO_TEXT_FIELD_ORDER = ['type', 'range', 'cost', 'skill', 'ref'];
const NINPO_LABEL_MAP = {
  type: 'タイプ',
  range: '間合',
  cost: 'コスト',
  skill: '指定特技',
  ref: '参照p',
};
let ninpoInputMode = 'grid';

const normalizeNinpoText = (value = '') => String(value).replace(/\r\n/g, '\n');

const NINPO_TYPE_LABEL_MAP = {
  '攻撃': '攻撃忍法',
  'サポート': 'サポート忍法',
  '装備': '装備忍法',
};

const normalizeNinpoType = (value = '') => {
  const trimmed = String(value).trim();
  if (!trimmed) return '';
  if (trimmed.endsWith('忍法')) {
    const base = trimmed.replace(/忍法$/, '');
    if (NINPO_TYPE_LABEL_MAP[base]) return base;
  }
  if (Object.values(NINPO_TYPE_LABEL_MAP).includes(trimmed)) {
    return Object.entries(NINPO_TYPE_LABEL_MAP).find(([, label]) => label === trimmed)?.[0] || trimmed;
  }
  return trimmed;
};

const escapeNinpoText = (value = '') => normalizeNinpoText(value).trimEnd();

const normalizeNinpoName = (value = '') => String(value).trim().split(/\s+/)[0] || '';

const getNinpoFieldValue = (text, label) => {
  const normalized = normalizeNinpoText(text);
  const pattern = new RegExp(`^${label}(?:[：:]|[\\s\\u3000]+)\\s*(.*)$`);
  for (const line of normalized.split('\n')) {
    const match = line.match(pattern);
    if (match) return match[1].trim();
  }
  return '';
};

const parseNinpoBlock = (block = '') => {
  const normalized = normalizeNinpoText(block).split('\n');
  const trimmedLines = normalized.map(line => line.replace(/\s+$/, ''));
  const firstContentIndex = trimmedLines.findIndex(line => line.trim() !== '');
  if (firstContentIndex < 0) {
    return { name: '', type: '', skill: '', range: '', cost: '', effect: '', ref: '' };
  }

  const name = normalizeNinpoName(trimmedLines[firstContentIndex]);
  const restLines = trimmedLines.slice(firstContentIndex + 1);
  const remainingLines = [];
  let inEffect = false;

  const labelSource = restLines.join('\n');
  const type = getNinpoFieldValue(labelSource, 'タイプ');
  const range = getNinpoFieldValue(labelSource, '間合');
  const cost = getNinpoFieldValue(labelSource, 'コスト');
  const skill = getNinpoFieldValue(labelSource, '指定特技');
  const ref = getNinpoFieldValue(labelSource, '参照p');

  for (let i = 0; i < restLines.length; i++) {
    const line = restLines[i];
    const trimmed = line.trim();
    if (!inEffect) {
      if (!trimmed) continue;
      if (/^(タイプ|間合|コスト|指定特技|参照p)(?:[：:]|[\s\u3000]+)/.test(trimmed)) continue;
      inEffect = true;
      remainingLines.push(line);
      continue;
    }
    if (!trimmed) break;
    remainingLines.push(line);
  }

  return {
    name,
    type: normalizeNinpoType(type),
    skill,
    range,
    cost,
    effect: remainingLines.join('\n').trimEnd(),
    ref,
  };
};

const serializeNinpoBlock = (row = {}) => {
  const lines = [];
  const name = escapeNinpoText(row.name || '');
  if (!name) return '';
  lines.push(name);
  NINPO_TEXT_FIELD_ORDER.forEach(field => {
    const label = NINPO_LABEL_MAP[field];
    const value = escapeNinpoText(field === 'type'
      ? (NINPO_TYPE_LABEL_MAP[row[field]] || (row[field] ? `${row[field]}忍法` : ''))
      : (row[field] || ''));
    lines.push(`${label}：${value}`);
  });
  const effect = escapeNinpoText(row.effect || '');
  if (effect) lines.push(effect);
  return lines.join('\n');
};

const parseNinpoText = (text = '') => normalizeNinpoText(text)
  .split(/\n{2,}/)
  .map(block => block.trim())
  .filter(block => block)
  .map(parseNinpoBlock);

const serializeNinpoText = (rows = []) => rows.map(serializeNinpoBlock).filter(Boolean).join('\n\n');

const collectNinpoFromGrid = ({ includeDisabled = true } = {}) => {
  const ninpo = [];
  let i = 1;
  while (document.querySelector(`[name="ninpo_name_${i}"]`)) {
    const isDisabled = document.querySelector(`[name="ninpo_name_${i}"]`)?.closest('.ninpo-grid, .ninpo-row')?.querySelector(`.btn-ninpo-disable[data-ninpo-row="${i}"]`)?.classList.contains('is-disabled')
      || document.querySelector(`.btn-ninpo-disable[data-ninpo-row="${i}"]`)?.classList.contains('is-disabled');
    if (!includeDisabled && isDisabled) { i++; continue; }
    ninpo.push({
      name: normalizeNinpoName(document.querySelector(`[name="ninpo_name_${i}"]`).value || ''),
      type: document.querySelector(`[name="ninpo_type_${i}"]`).value || '',
      skill: document.querySelector(`[name="ninpo_skill_${i}"]`).value || '',
      range: document.querySelector(`[name="ninpo_range_${i}"]`).value || '',
      cost: document.querySelector(`[name="ninpo_cost_${i}"]`).value || '',
      effect: document.querySelector(`[name="ninpo_effect_${i}"]`).value || '',
      ref: document.querySelector(`[name="ninpo_ref_${i}"]`).value || '',
    });
    i++;
  }
  return ninpo;
};

const collectNinpoFromText = () => {
  const ninpoTextList = document.getElementById('ninpo_text_list');
  if (!ninpoTextList) return [];
  return Array.from(ninpoTextList.querySelectorAll('.ninpo-text-block'))
    .map(textarea => parseNinpoBlock(textarea.value || ''))
    .filter(row => !isEmptyNinpoRow(row));
};

const isEmptyNinpoRow = (row = {}) => !row.name && !row.type && !row.skill && !row.range && !row.cost && !row.effect && !row.ref;
const isEmptyOugiRow = (row = {}) => !row.name && !row.skill && !row.kaizou && !row.effect;
const isEmptyHaikeiRow = (row = {}) => !row.name && !row.merit && !row.cost && !row.effect && !row.ref;
const isEmptyRelationRow = (row = {}) => !row.name && !row.location && !row.secret && !row.ougi && !row.emotion_sign && !row.emotion;

/** 忍法データを収集 (disabled行を除外するかどうか選択可能) */
const collectNinpo = ({ includeDisabled = true } = {}) => {
  if (ninpoInputMode === 'text') {
    return collectNinpoFromText();
  }
  return collectNinpoFromGrid({ includeDisabled });
};

/** 背景データを収集 */
const collectHaikei = () => {
  const haikei = [];
  let i = 1;
  while (document.querySelector(`[name="haikei_name_${i}"]`)) {
    haikei.push({
      name: document.querySelector(`[name="haikei_name_${i}"]`).value || '',
      merit: document.querySelector(`[name="haikei_merit_${i}"]`).value || '',
      cost: document.querySelector(`[name="haikei_cost_${i}"]`).value || '',
      effect: document.querySelector(`[name="haikei_effect_${i}"]`).value || '',
      ref: document.querySelector(`[name="haikei_ref_${i}"]`).value || '',
    });
    i++;
  }
  return haikei;
};

/** 関係データを収集 */
const collectRelations = () => {
  const relations = [];
  let j = 1;
  while (document.querySelector(`[name="relation_name_${j}"]`)) {
    relations.push({
      name: document.querySelector(`[name="relation_name_${j}"]`).value || '',
      location: document.getElementById(`relation_location_${j}`) ? document.getElementById(`relation_location_${j}`).checked : false,
      secret: document.getElementById(`relation_secret_${j}`) ? document.getElementById(`relation_secret_${j}`).checked : false,
      ougi: document.getElementById(`relation_ougi_${j}`) ? document.getElementById(`relation_ougi_${j}`).checked : false,
      emotion_sign: document.getElementById(`relation_emotion_sign_${j}`) ? document.getElementById(`relation_emotion_sign_${j}`).checked : false,
      emotion: document.querySelector(`[name="relation_emotion_${j}"]`).value || '',
    });
    j++;
  }
  return relations;
};

/** 習得済み特技IDリストを返す */
const getAcquiredSkillIds = () => {
  const ids = [];
  document.querySelectorAll('.skill-check:checked').forEach(cb => ids.push(cb.id));
  return ids;
};

/** 習得済み特技名リストを返す（CCFOLIA用） */
const getAcquiredSkillNames = () => {
  const skills = [];
  document.querySelectorAll('.skill-check:checked').forEach(cb => skills.push(cb.value));
  return skills;
};

/** テキストエリア行の高さ同期 */
const resizeTextareaRow = (container, selector, rowId) => {
  const rowTextareas = container.querySelectorAll(`${selector}[data-row="${rowId}"]`);
  if (!rowTextareas.length) return;
  rowTextareas.forEach(ta => { ta.style.height = 'auto'; });
  let maxHeight = 0;
  rowTextareas.forEach(ta => { maxHeight = Math.max(maxHeight, ta.scrollHeight); });
  rowTextareas.forEach(ta => { ta.style.height = `${maxHeight}px`; });
};

/** HTML エスケープ */
const escapeHTML = (str) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ==========================================
// 画像プレビュー
// ==========================================
const imageInput = document.getElementById('setting_image');
const imagePreview = document.getElementById('setting_image_preview');
const imageEmpty = document.getElementById('setting_image_empty');
let previewUrl = null;

const clearPreview = () => {
  if (previewUrl) { URL.revokeObjectURL(previewUrl); previewUrl = null; }
  imagePreview.removeAttribute('src');
  imagePreview.classList.remove('is-visible');
  imageEmpty.hidden = false;
};

imageInput.addEventListener('change', () => {
  const file = imageInput.files && imageInput.files[0];
  if (!file) { clearPreview(); return; }
  if (!file.type.startsWith('image/')) {
    clearPreview();
    imageEmpty.textContent = '画像ファイルを選択してください';
    return;
  }
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = URL.createObjectURL(file);
  imagePreview.src = previewUrl;
  imagePreview.classList.add('is-visible');
  imageEmpty.hidden = true;
});

clearPreview();

// ==========================================
// DOMContentLoaded — すべての初期化を集約
// ==========================================
document.addEventListener('DOMContentLoaded', () => {

  // ──────────────────────────────
  // ダメージチェック 三状態サイクル (空→✕→黒→空)
  // ──────────────────────────────
  document.querySelectorAll('.damage-check').forEach(el => {
    el.addEventListener('click', () => {
      const current = parseInt(el.dataset.state || '0', 10);
      el.dataset.state = String((current + 1) % 3);
    });
  });

  /** 奥義の情報をクリップボードにコピー */
  const copyOugiToClipboard = (n) => {
    const name = (document.querySelector(`[name="ougi_name_${n}"]`)?.value || '').trim();
    const skill = (document.querySelector(`[name="ougi_skill_${n}"]`)?.value || '').trim();
    const kaizou = (document.querySelector(`[name="ougi_kaizou_${n}"]`)?.value || '').trim();
    const effect = (document.querySelector(`[name="ougi_effect_${n}"]`)?.value || '').trim();
    const lines = [];
    if (name) lines.push(`奥義名: ${name}`);
    if (skill) lines.push(`指定特技: ${skill}`);
    if (kaizou) lines.push(`効果/改造: ${kaizou}`);
    if (effect) lines.push(`エフェクト: ${effect}`);
    const text = lines.join('\n');
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      const btn = document.querySelector(`.ougi-copy-btn[data-ougi-index="${n}"]`);
      if (btn) {
        const orig = btn.textContent;
        btn.textContent = '✔';
        setTimeout(() => { btn.textContent = orig; }, 1000);
      }
    });
  };

  // ──────────────────────────────
  // 1a. 奥義セクション
  // ──────────────────────────────
  const ougiList = document.getElementById('ougi_list');
  const addOugiBtn = document.getElementById('add_ougi_btn');
  const removeOugiBtn = document.getElementById('remove_ougi_btn');
  let ougiCount = 0;
  const OUGI_HEADER_COUNT = 5;
  const OUGI_ROW_SIZE = 5;

  const bindOugiTextarea = (textarea) => {
    if (textarea.dataset.resizeBound) return;
    textarea.dataset.resizeBound = 'true';
    textarea.addEventListener('input', () => resizeTextareaRow(ougiList, '.ougi-textarea', textarea.dataset.row));
    resizeTextareaRow(ougiList, '.ougi-textarea', textarea.dataset.row);
  };

  const addOugiRow = () => {
    ougiCount++;
    const n = ougiCount;
    const rowHTML = `
      <textarea name="ougi_name_${n}" class="ougi-textarea" rows="1" data-row="o${n}"></textarea>
      <textarea name="ougi_skill_${n}" class="ougi-textarea" rows="1" data-row="o${n}"></textarea>
      <textarea name="ougi_kaizou_${n}" class="ougi-textarea" rows="1" data-row="o${n}"></textarea>
      <textarea name="ougi_effect_${n}" class="ougi-textarea" rows="1" data-row="o${n}"></textarea>
      <div class="ougi-copy-cell"><button type="button" class="btn ougi-copy-btn" data-ougi-index="${n}" title="奥義情報をコピー">コピー</button></div>`;
    ougiList.insertAdjacentHTML('beforeend', rowHTML);
    ougiList.querySelectorAll(`.ougi-textarea[data-row="o${n}"]`).forEach(bindOugiTextarea);
    ougiList.querySelector(`.ougi-copy-btn[data-ougi-index="${n}"]`).addEventListener('click', () => copyOugiToClipboard(n));
  };

  const removeOugiRow = () => {
    if (!ougiList || ougiList.children.length <= OUGI_HEADER_COUNT || ougiCount === 0) return;
    for (let i = 0; i < OUGI_ROW_SIZE; i++) {
      if (ougiList.lastElementChild) ougiList.removeChild(ougiList.lastElementChild);
    }
    ougiCount = Math.max(0, ougiCount - 1);
  };

  if (ougiList) {
    addOugiRow();
    ougiList.querySelectorAll('.ougi-textarea').forEach(bindOugiTextarea);
  }
  if (addOugiBtn) addOugiBtn.addEventListener('click', addOugiRow);
  if (removeOugiBtn) removeOugiBtn.addEventListener('click', removeOugiRow);

  // ──────────────────────────────
  // 1b. 忍法セクション
  // ──────────────────────────────
  const ninpoSection = document.getElementById('ninpo_section');
  const ninpoList = document.getElementById('ninpo_list');
  const ninpoTextWrap = document.getElementById('ninpo_text_wrap');
  const ninpoTextList = document.getElementById('ninpo_text_list');
  const ninpoModeToggleBtn = document.getElementById('ninpo_mode_toggle_btn');
  const addNinpoBtn = document.getElementById('add_ninpo_btn');
  const removeNinpoBtn = document.getElementById('remove_ninpo_btn');
  let ninpoCount = 0;
  const NINPO_HEADER_COUNT = 8;
  const NINPO_ROW_SIZE = 8;

  const bindNinpoTextarea = (textarea) => {
    if (textarea.dataset.resizeBound) return;
    textarea.dataset.resizeBound = 'true';
    textarea.addEventListener('input', () => resizeTextareaRow(ninpoList, '.ninpo-textarea', textarea.dataset.row));
    resizeTextareaRow(ninpoList, '.ninpo-textarea', textarea.dataset.row);
  };

  const resizeNinpoGridRows = () => {
    if (!ninpoList) return;
    ninpoList.querySelectorAll('.ninpo-textarea').forEach(textarea => {
      resizeTextareaRow(ninpoList, '.ninpo-textarea', textarea.dataset.row);
    });
  };

  const bindNinpoTextBlock = (textarea) => {
    if (textarea.dataset.resizeBound) return;
    textarea.dataset.resizeBound = 'true';
    textarea.addEventListener('input', () => resizeTextareaRow(ninpoTextList, '.ninpo-text-block', textarea.dataset.row));
    resizeTextareaRow(ninpoTextList, '.ninpo-text-block', textarea.dataset.row);
  };

  const countNinpoTextRows = () => ninpoTextList ? ninpoTextList.querySelectorAll('.ninpo-text-row').length : 0;

  const addNinpoTextRow = (row = {}) => {
    if (!ninpoTextList) return;
    const n = countNinpoTextRows() + 1;
    const rowHTML = `
      <div class="ninpo-text-row">
        <div class="ninpo-text-row-head">忍法 ${n}</div>
        <textarea name="ninpo_text_${n}" class="ninpo-text-block" rows="8" data-row="${n}" placeholder="${n}件目の忍法を入力"></textarea>
      </div>`;
    ninpoTextList.insertAdjacentHTML('beforeend', rowHTML);
    const textarea = ninpoTextList.querySelector(`textarea[name="ninpo_text_${n}"]`);
    if (textarea) {
      textarea.value = row.name ? serializeNinpoBlock(row) : '';
      bindNinpoTextBlock(textarea);
    }
  };

  const renumberNinpoTextRows = () => {
    if (!ninpoTextList) return;
    ninpoTextList.querySelectorAll('.ninpo-text-row').forEach((row, index) => {
      const rowNumber = index + 1;
      const head = row.querySelector('.ninpo-text-row-head');
      const textarea = row.querySelector('.ninpo-text-block');
      if (head) head.textContent = `忍法 ${rowNumber}`;
      if (textarea) {
        textarea.name = `ninpo_text_${rowNumber}`;
        textarea.dataset.row = String(rowNumber);
      }
    });
  };

  const removeNinpoTextRow = () => {
    if (!ninpoTextList) return;
    const rows = ninpoTextList.querySelectorAll('.ninpo-text-row');
    if (rows.length <= 1) return;
    rows[rows.length - 1].remove();
    renumberNinpoTextRows();
  };

  const clearNinpoGridRows = () => {
    if (!ninpoList) return;
    while (ninpoList.children.length > NINPO_HEADER_COUNT) {
      ninpoList.removeChild(ninpoList.lastElementChild);
    }
    ninpoCount = 0;
  };

  const clearNinpoTextRows = () => {
    if (!ninpoTextList) return;
    ninpoTextList.innerHTML = '';
  };

  const syncNinpoTextFromGrid = () => {
    if (!ninpoTextList) return;
    clearNinpoTextRows();
    const rows = collectNinpoFromGrid({ includeDisabled: true });
    const renderRows = rows.length ? rows : [{}];
    renderRows.forEach(row => addNinpoTextRow(row));
    renumberNinpoTextRows();
  };

  const syncNinpoGridFromText = () => {
    if (!ninpoList) return;
    const rows = collectNinpoFromText();
    clearNinpoGridRows();
    const renderRows = rows.length ? rows : [{}];
    renderRows.forEach(row => addNinpoRow(row));
  };

  const updateNinpoModeUI = () => {
    if (!ninpoSection) return;
    const isText = ninpoInputMode === 'text';
    ninpoSection.classList.toggle('ninpo-mode-text', isText);
    ninpoSection.classList.toggle('ninpo-mode-grid', !isText);
    if (ninpoModeToggleBtn) ninpoModeToggleBtn.textContent = '切り替え';
    if (ninpoTextWrap) ninpoTextWrap.setAttribute('aria-hidden', String(!isText));
    if (ninpoList) ninpoList.setAttribute('aria-hidden', String(isText));
  };

  const setNinpoMode = (mode) => {
    if (mode === ninpoInputMode) return;
    if (mode === 'text') {
      syncNinpoTextFromGrid();
      ninpoInputMode = 'text';
      updateNinpoModeUI();
      if (ninpoSection) void ninpoSection.offsetHeight;
      if (ninpoTextList) {
        ninpoTextList.querySelectorAll('.ninpo-text-block').forEach(textarea => {
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
        });
      }
      return;
    }
    syncNinpoGridFromText();
    ninpoInputMode = 'grid';
    updateNinpoModeUI();
    if (ninpoSection) void ninpoSection.offsetHeight;
    if (ninpoList) {
      ninpoList.querySelectorAll('.ninpo-textarea').forEach(textarea => {
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
      });
    }
  };

  /** 忍法の行を入れ替える */
  const swapNinpoRows = (rowA, rowB) => {
    if (rowA < 1 || rowB < 1 || rowA > ninpoCount || rowB > ninpoCount || rowA === rowB) return;
    const fields = ['name', 'type', 'skill', 'range', 'cost', 'effect', 'ref'];
    fields.forEach(f => {
      const elA = document.querySelector(`[name="ninpo_${f}_${rowA}"]`);
      const elB = document.querySelector(`[name="ninpo_${f}_${rowB}"]`);
      if (elA && elB) {
        const tmp = elA.value;
        elA.value = elB.value;
        elB.value = tmp;
      }
    });
    const btnA = document.querySelector(`.btn-ninpo-disable[data-ninpo-row="${rowA}"]`);
    const btnB = document.querySelector(`.btn-ninpo-disable[data-ninpo-row="${rowB}"]`);
    if (btnA && btnB) {
      const disA = btnA.classList.contains('is-disabled');
      const disB = btnB.classList.contains('is-disabled');
      if (disA !== disB) {
        if (disA) { toggleNinpoDisable(rowA); toggleNinpoDisable(rowB); }
        else { toggleNinpoDisable(rowB); toggleNinpoDisable(rowA); }
      }
    }
    [rowA, rowB].forEach(r => resizeTextareaRow(ninpoList, '.ninpo-textarea', String(r)));
  };

  const addNinpoRow = (row = {}, { skipResize = false } = {}) => {
    ninpoCount++;
    const n = ninpoCount;
    const rowHTML = `
      <textarea name="ninpo_name_${n}" class="ninpo-textarea" rows="1" data-row="${n}"></textarea>
      <select name="ninpo_type_${n}">
        <option value="攻撃">攻撃</option>
        <option value="サポート">サポート</option>
        <option value="装備">装備</option>
      </select>
      <textarea name="ninpo_skill_${n}" class="ninpo-textarea" rows="1" data-row="${n}"></textarea>
      <textarea name="ninpo_range_${n}" class="ninpo-textarea" rows="1" data-row="${n}"></textarea>
      <textarea name="ninpo_cost_${n}" class="ninpo-textarea" rows="1" data-row="${n}"></textarea>
      <textarea name="ninpo_effect_${n}" class="ninpo-textarea" rows="1" data-row="${n}"></textarea>
      <input type="text" name="ninpo_ref_${n}" />
      <div class="ninpo-move-btns">
        <button type="button" class="btn-move btn-move-up" data-ninpo-row="${n}" title="上へ移動">▲</button>
        <button type="button" class="btn-move btn-ninpo-disable" data-ninpo-row="${n}" title="無効化切替">✕</button>
        <button type="button" class="btn-move btn-move-down" data-ninpo-row="${n}" title="下へ移動">▼</button>
      </div>`;
    ninpoList.insertAdjacentHTML('beforeend', rowHTML);
    const setValue = (name, value) => {
      const el = document.querySelector(`[name="ninpo_${name}_${n}"]`);
      if (el) el.value = value || '';
    };
    setValue('name', row.name);
    setValue('type', row.type || '攻撃');
    setValue('skill', row.skill);
    setValue('range', row.range);
    setValue('cost', row.cost);
    setValue('effect', row.effect);
    setValue('ref', row.ref);
    ninpoList.querySelectorAll(`.ninpo-textarea[data-row="${n}"]`).forEach(bindNinpoTextarea);
    if (!skipResize) resizeTextareaRow(ninpoList, '.ninpo-textarea', String(n));
  };

  /** 忍法行の無効化状態を切り替え */
  const toggleNinpoDisable = (row) => {
    const btn = document.querySelector(`.btn-ninpo-disable[data-ninpo-row="${row}"]`);
    if (!btn) return;
    const isDisabled = btn.classList.toggle('is-disabled');
    const fields = ['name', 'type', 'skill', 'range', 'cost', 'effect', 'ref'];
    fields.forEach(f => {
      const el = document.querySelector(`[name="ninpo_${f}_${row}"]`);
      if (el) el.classList.toggle('ninpo-cell-disabled', isDisabled);
    });
    const moveContainer = btn.closest('.ninpo-move-btns');
    if (moveContainer) moveContainer.classList.toggle('ninpo-cell-disabled', isDisabled);
  };

  if (ninpoList) {
    ninpoList.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-move');
      if (!btn) return;
      const row = parseInt(btn.dataset.ninpoRow, 10);
      if (btn.classList.contains('btn-move-up')) {
        swapNinpoRows(row, row - 1);
      } else if (btn.classList.contains('btn-move-down')) {
        swapNinpoRows(row, row + 1);
      } else if (btn.classList.contains('btn-ninpo-disable')) {
        toggleNinpoDisable(row);
      }
    });
  }

  const removeNinpoRow = () => {
    if (ninpoInputMode === 'text') {
      removeNinpoTextRow();
      return;
    }
    if (!ninpoList || ninpoCount <= 1) return;
    for (let i = 0; i < NINPO_ROW_SIZE; i++) {
      if (ninpoList.lastElementChild) ninpoList.removeChild(ninpoList.lastElementChild);
    }
    ninpoCount = Math.max(0, ninpoCount - 1);
  };

  if (ninpoList) {
    addNinpoRow();
    const setVal = (name, val) => { const el = document.querySelector(`[name="${name}"]`); if (el) el.value = val; };
    setVal('ninpo_name_1', '接近戦攻撃');
    setVal('ninpo_type_1', '攻撃');
    setVal('ninpo_range_1', '1');
    setVal('ninpo_cost_1', '0');
    setVal('ninpo_effect_1', '接近戦ダメージを1点与える。');
    setVal('ninpo_ref_1', '基78');
    addNinpoRow();
    ninpoList.querySelectorAll('.ninpo-textarea').forEach(bindNinpoTextarea);
    resizeNinpoGridRows();
  }
  if (addNinpoBtn) addNinpoBtn.addEventListener('click', () => {
    if (ninpoInputMode === 'text') addNinpoTextRow();
    else addNinpoRow();
  });
  if (removeNinpoBtn) removeNinpoBtn.addEventListener('click', removeNinpoRow);
  if (ninpoModeToggleBtn) ninpoModeToggleBtn.addEventListener('click', () => setNinpoMode(ninpoInputMode === 'grid' ? 'text' : 'grid'));

  updateNinpoModeUI();

  // ──────────────────────────────
  // 1c. 背景セクション
  // ──────────────────────────────
  const haikeiList = document.getElementById('haikei_list');
  const addHaikeiBtn = document.getElementById('add_haikei_btn');
  const removeHaikeiBtn = document.getElementById('remove_haikei_btn');
  let haikeiCount = 0;
  const HAIKEI_HEADER_COUNT = 5;
  const HAIKEI_ROW_SIZE = 5;

  const bindHaikeiTextarea = (textarea) => {
    if (textarea.dataset.resizeBound) return;
    textarea.dataset.resizeBound = 'true';
    textarea.addEventListener('input', () => resizeTextareaRow(haikeiList, '.haikei-textarea', textarea.dataset.row));
    resizeTextareaRow(haikeiList, '.haikei-textarea', textarea.dataset.row);
  };

  const addHaikeiRow = () => {
    haikeiCount++;
    const n = haikeiCount;
    const rowHTML = `
      <textarea name="haikei_name_${n}" class="haikei-textarea" rows="1" data-row="h${n}"></textarea>
      <select name="haikei_merit_${n}">
        <option value="長所">長所</option>
        <option value="短所">短所</option>
      </select>
      <input type="text" name="haikei_cost_${n}" />
      <textarea name="haikei_effect_${n}" class="haikei-textarea" rows="1" data-row="h${n}"></textarea>
      <input type="text" name="haikei_ref_${n}" />`;
    haikeiList.insertAdjacentHTML('beforeend', rowHTML);
    haikeiList.querySelectorAll(`.haikei-textarea[data-row="h${n}"]`).forEach(bindHaikeiTextarea);
  };

  const removeHaikeiRow = () => {
    if (!haikeiList || haikeiList.children.length <= HAIKEI_HEADER_COUNT || haikeiCount === 0) return;
    for (let i = 0; i < HAIKEI_ROW_SIZE; i++) {
      if (haikeiList.lastElementChild) haikeiList.removeChild(haikeiList.lastElementChild);
    }
    haikeiCount = Math.max(0, haikeiCount - 1);
  };

  if (haikeiList) {
    addHaikeiRow();
    haikeiList.querySelectorAll('.haikei-textarea').forEach(bindHaikeiTextarea);
  }
  if (addHaikeiBtn) addHaikeiBtn.addEventListener('click', addHaikeiRow);
  if (removeHaikeiBtn) removeHaikeiBtn.addEventListener('click', removeHaikeiRow);

  // ──────────────────────────────
  // 2. 関係セクション
  // ──────────────────────────────
  const relationList = document.getElementById('relation_list');
  const addRelationBtn = document.getElementById('add_relation_btn');
  const removeRelationBtn = document.getElementById('remove_relation_btn');
  let relationCount = 0;
  const RELATION_HEADER_COUNT = 5;
  const RELATION_ROW_SIZE = 5;

  const bindRelationTextarea = (textarea) => {
    textarea.addEventListener('input', () => resizeTextareaRow(relationList, '.relation-textarea', textarea.dataset.row));
    resizeTextareaRow(relationList, '.relation-textarea', textarea.dataset.row);
  };

  const addRelationRow = () => {
    relationCount++;
    const n = relationCount;
    relationList.insertAdjacentHTML('beforeend', `
      <textarea name="relation_name_${n}" class="relation-textarea" rows="1" data-row="${n}"></textarea>
      <div class="relation-checkbox-cell">
        <div class="box-container">
          <input type="checkbox" id="relation_location_${n}" class="box-check" />
          <label for="relation_location_${n}" class="box-label"></label>
        </div>
      </div>
      <div class="relation-checkbox-cell">
        <div class="box-container">
          <input type="checkbox" id="relation_secret_${n}" class="box-check" />
          <label for="relation_secret_${n}" class="box-label"></label>
        </div>
      </div>
      <div class="relation-checkbox-cell">
        <div class="box-container">
          <input type="checkbox" id="relation_ougi_${n}" class="box-check" />
          <label for="relation_ougi_${n}" class="box-label"></label>
        </div>
      </div>
      <div class="emotion-cell">
        <input type="checkbox" id="relation_emotion_sign_${n}" class="emotion-sign-toggle" title="＋/－切り替え" />
        <textarea name="relation_emotion_${n}" class="relation-textarea" rows="1" data-row="${n}"></textarea>
      </div>`);
    relationList.querySelectorAll(`.relation-textarea[data-row="${n}"]`).forEach(bindRelationTextarea);
  };

  const removeRelationRow = () => {
    if (!relationList || relationList.children.length <= RELATION_HEADER_COUNT || relationCount === 0) return;
    for (let i = 0; i < RELATION_ROW_SIZE; i++) {
      if (relationList.lastElementChild) relationList.removeChild(relationList.lastElementChild);
    }
    relationCount = Math.max(0, relationCount - 1);
  };

  if (relationList) addRelationRow();
  if (addRelationBtn) addRelationBtn.addEventListener('click', addRelationRow);
  if (removeRelationBtn) removeRelationBtn.addEventListener('click', removeRelationRow);

  // ──────────────────────────────
  // 2b. 上位流派 → ギャップ自動設定
  // ──────────────────────────────
  const schoolSelect = document.getElementById('school');
  const SCHOOL_GAP_MAP = {
    '斜歯忍軍':     ['gap6', 'gap1'],  // 妖術↔器術, 器術↔体術
    '鞍馬神流':     ['gap1', 'gap2'],  // 器術↔体術, 体術↔忍術
    'ハグレモノ':   ['gap2', 'gap3'],  // 体術↔忍術, 忍術↔謀術
    '比良坂機関':   ['gap3', 'gap4'],  // 忍術↔謀術, 謀術↔戦術
    '私立御斎学園': ['gap4', 'gap5'],  // 謀術↔戦術, 戦術↔妖術
    '隠忍の血統':   ['gap5', 'gap6'],  // 戦術↔妖術, 妖術↔器術
  };
  const ALL_GAPS = ['gap1', 'gap2', 'gap3', 'gap4', 'gap5', 'gap6'];

  const applySchoolGaps = () => {
    const school = schoolSelect ? schoolSelect.value : '';
    const activeGaps = SCHOOL_GAP_MAP[school] || [];
    ALL_GAPS.forEach(id => {
      const cb = document.getElementById(id);
      if (cb) cb.checked = activeGaps.includes(id);
    });
  };

  if (schoolSelect) schoolSelect.addEventListener('change', applySchoolGaps);

  // ──────────────────────────────
  // 3. セーブ・ロード・共有リンク
  // ──────────────────────────────
  const saveBtn = document.getElementById('save_data_btn');
  const loadFile = document.getElementById('load_data_file');
  const shareBtn = document.getElementById('share_link_btn');
  let savedImageBase64 = null;

  imageInput.addEventListener('change', () => {
    const file = imageInput.files && imageInput.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => { savedImageBase64 = e.target.result; };
      reader.readAsDataURL(file);
    } else {
      savedImageBase64 = null;
    }
  });

  /** 現在の入力内容からセーブデータ(JSON化可能なオブジェクト)を構築 */
  const buildSaveData = () => {
    const data = { inputs: {}, checkboxes: {}, ougi: [], ninpo: [], relations: [], image: savedImageBase64 };

    document.querySelectorAll('input[type="text"], input[type="number"], select, textarea').forEach(el => {
      if (!el.name.startsWith('ougi_') && !el.name.startsWith('ninpo_') && !el.name.startsWith('relation_')) {
        data.inputs[el.id || el.name] = el.value;
      }
    });
    document.querySelectorAll('input[type="checkbox"]').forEach(el => {
      if (!el.id.startsWith('relation_secret_') && !el.id.startsWith('relation_ougi_')) {
        data.checkboxes[el.id] = el.checked;
      }
    });
    data.ougi = collectOugi().filter(row => !isEmptyOugiRow(row));
    data.ninpo = collectNinpo().filter(row => !isEmptyNinpoRow(row));
    data.haikei = collectHaikei().filter(row => !isEmptyHaikeiRow(row));
    data.relations = collectRelations().filter(row => !isEmptyRelationRow(row));
    return data;
  };

  /** セーブデータ(JSON)を現在のフォームへ反映 */
  const applyLoadedData = (data) => {
    if (data.inputs) {
      for (const [key, value] of Object.entries(data.inputs)) {
        const el = document.getElementById(key) || document.querySelector(`[name="${key}"]`);
        if (el) el.value = value;
      }
    }
    if (data.checkboxes) {
      for (const [key, checked] of Object.entries(data.checkboxes)) {
        const el = document.getElementById(key);
        if (el) el.checked = checked;
      }
    }
    if (data.ougi) {
      while (document.querySelectorAll('.ougi-textarea[name^="ougi_name_"]').length > 0) removeOugiRow();
      data.ougi.filter(row => !isEmptyOugiRow(row)).forEach((og, idx) => {
        addOugiRow();
        const i = idx + 1;
        const q = (s) => document.querySelector(s);
        q(`[name="ougi_name_${i}"]`).value = og.name || '';
        q(`[name="ougi_skill_${i}"]`).value = og.skill || '';
        q(`[name="ougi_kaizou_${i}"]`).value = og.kaizou || '';
        q(`[name="ougi_effect_${i}"]`).value = og.effect || '';
        q(`[name="ougi_effect_${i}"]`).dispatchEvent(new Event('input'));
      });
    }
    if (data.ninpo) {
      if (ninpoInputMode === 'text') {
        clearNinpoTextRows();
        data.ninpo.filter(row => !isEmptyNinpoRow(row)).forEach(row => addNinpoTextRow(row));
        renumberNinpoTextRows();
      } else {
        clearNinpoGridRows();
        data.ninpo.filter(row => !isEmptyNinpoRow(row)).forEach(row => addNinpoRow(row, { skipResize: true }));
        resizeNinpoGridRows();
      }
    }
    if (data.haikei) {
      while (document.querySelectorAll('.haikei-textarea[name^="haikei_name_"]').length > 0) removeHaikeiRow();
      data.haikei.filter(row => !isEmptyHaikeiRow(row)).forEach((hk, idx) => {
        addHaikeiRow();
        const i = idx + 1;
        const q = (s) => document.querySelector(s);
        q(`[name="haikei_name_${i}"]`).value = hk.name || '';
        q(`[name="haikei_merit_${i}"]`).value = hk.merit || '長所';
        q(`[name="haikei_cost_${i}"]`).value = hk.cost || '';
        q(`[name="haikei_effect_${i}"]`).value = hk.effect || '';
        q(`[name="haikei_ref_${i}"]`).value = hk.ref || '';
        q(`[name="haikei_effect_${i}"]`).dispatchEvent(new Event('input'));
      });
    }
    if (data.relations) {
      while (document.querySelectorAll('.relation-textarea[name^="relation_name_"]').length > 0) removeRelationRow();
      data.relations.filter(row => !isEmptyRelationRow(row)).forEach((rel, idx) => {
        addRelationRow();
        const j = idx + 1;
        document.querySelector(`[name="relation_name_${j}"]`).value = rel.name || '';
        if (document.getElementById(`relation_location_${j}`)) document.getElementById(`relation_location_${j}`).checked = rel.location || false;
        if (document.getElementById(`relation_secret_${j}`)) document.getElementById(`relation_secret_${j}`).checked = rel.secret || false;
        if (document.getElementById(`relation_ougi_${j}`)) document.getElementById(`relation_ougi_${j}`).checked = rel.ougi || false;
        if (document.getElementById(`relation_emotion_sign_${j}`)) document.getElementById(`relation_emotion_sign_${j}`).checked = rel.emotion_sign || false;
        document.querySelector(`[name="relation_emotion_${j}"]`).value = rel.emotion || '';
        document.querySelector(`[name="relation_name_${j}"]`).dispatchEvent(new Event('input'));
      });
    }
    if (data.image) {
      savedImageBase64 = data.image;
      imagePreview.src = data.image;
      imagePreview.classList.add('is-visible');
      imageEmpty.hidden = true;
    }
    if (ninpoInputMode === 'text') syncNinpoTextFromGrid();
  };

  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const data = buildSaveData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${getFieldValue('name', 'character')}_シノビガミCS.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  if (loadFile) {
    loadFile.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          applyLoadedData(data);
          alert('データの読み込みが完了しました！');
        } catch (error) {
          console.error(error);
          alert('データの読み込みに失敗しました。');
        }
        e.target.value = '';
      };
      reader.readAsText(file);
    });
  }

  // --- 共有リンク ---
  // 画像はURLが非常に長くなるため現時点では対象外(テキストデータのみ共有)。
  // 将来的に画像を含める場合は、ここで圧縮・解像度制限をかけた上でdata.imageを付与する。
  const SHARE_HASH_KEY = 'share';

  const toBase64Url = (bytes) => {
    let binary = '';
    bytes.forEach(b => { binary += String.fromCharCode(b); });
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };
  const fromBase64Url = (b64url) => {
    let base64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  };

  /** 文字列を圧縮してURL埋め込み用文字列にする。CompressionStream対応ブラウザではdeflateを、非対応ブラウザではLZ-Stringを使用 */
  const compressForURL = async (str) => {
    if (typeof CompressionStream !== 'undefined') {
      const stream = new Blob([str]).stream().pipeThrough(new CompressionStream('deflate-raw'));
      const buffer = await new Response(stream).arrayBuffer();
      return `d1${toBase64Url(new Uint8Array(buffer))}`;
    }
    if (typeof LZString !== 'undefined') {
      return `l1${LZString.compressToEncodedURIComponent(str)}`;
    }
    return null;
  };

  /** compressForURLで生成した文字列を復元する */
  const decompressFromURL = async (encoded) => {
    const method = encoded.slice(0, 2);
    const body = encoded.slice(2);
    if (method === 'd1') {
      if (typeof DecompressionStream === 'undefined') throw new Error('DecompressionStream unsupported');
      const stream = new Blob([fromBase64Url(body)]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      const buffer = await new Response(stream).arrayBuffer();
      return new TextDecoder().decode(buffer);
    }
    if (method === 'l1') {
      if (typeof LZString === 'undefined') throw new Error('LZString unsupported');
      return LZString.decompressFromEncodedURIComponent(body);
    }
    throw new Error('unknown compression method');
  };

  // 初期状態で自動追加される忍法プリセット(addNinpoRow内で設定される既定値)。
  // 未編集ならリンクに含める意味がないため共有時のみ除外する。
  const DEFAULT_NINPO_PRESET = {
    name: '接近戦攻撃', type: '攻撃', skill: '', range: '1', cost: '0',
    effect: '接近戦ダメージを1点与える。', ref: '基78',
  };
  const isDefaultNinpoPreset = (row = {}) =>
    Object.entries(DEFAULT_NINPO_PRESET).every(([k, v]) => (row[k] || '') === v);

  // --- 共有リンク用のデータ圧縮(キー名を持たない位置配列化・短縮キー化) ---
  const NINPO_ORDER = ['name', 'type', 'skill', 'range', 'cost', 'effect', 'ref'];
  const OUGI_ORDER = ['name', 'skill', 'kaizou', 'effect'];
  const HAIKEI_ORDER = ['name', 'merit', 'cost', 'effect', 'ref'];
  const INPUT_KEY_MAP = {
    name: 'n', age: 'a', gender: 'g', school: 'sc', sub_school: 'ss', rank: 'rk',
    manner: 'mn', face: 'fc', belief: 'bl', points: 'pt', life_extra: 'le',
    setting: 'st', ningu_hyorogan: 'nh', ningu_jintsumaru: 'nj',
    ningu_tonkofu: 'nt', ningu_other: 'no', special_skill: 'sp',
  };
  const INPUT_KEY_MAP_REV = Object.fromEntries(Object.entries(INPUT_KEY_MAP).map(([k, v]) => [v, k]));
  const SKILL_ID_RE = /^skill_r(\d+)_c(\d+)$/;
  const packSkillIndex = (row, col) => (row - 2) * 6 + (col - 1);
  const unpackSkillIndex = (idx) => ({ row: Math.floor(idx / 6) + 2, col: (idx % 6) + 1 });

  const trimTrailingEmpty = (arr) => {
    const a = arr.slice();
    while (a.length && !a[a.length - 1]) a.pop();
    return a;
  };
  const rowsToArrays = (rows, order) => rows.map(row => trimTrailingEmpty(order.map(k => row[k] || '')));
  const arraysToRows = (arrs, order) => arrs.map(arr => {
    const row = {};
    order.forEach((k, i) => { row[k] = arr[i] || ''; });
    return row;
  });

  /** 共有用にキー名を持たない最小構造へ変換 */
  const compactifyForShare = (data) => {
    const compact = {};
    if (data.inputs) {
      const inputs = {};
      Object.entries(data.inputs).forEach(([k, v]) => {
        if (!v) return;
        inputs[INPUT_KEY_MAP[k] || k] = v;
      });
      if (Object.keys(inputs).length) compact.i = inputs;
    }
    if (data.checkboxes) {
      const skills = [];
      const others = [];
      Object.entries(data.checkboxes).forEach(([id, checked]) => {
        if (!checked) return;
        const m = id.match(SKILL_ID_RE);
        if (m) skills.push(packSkillIndex(Number(m[1]), Number(m[2])));
        else others.push(id);
      });
      if (skills.length) compact.sk = skills;
      if (others.length) compact.cb = others;
    }
    if (data.ougi && data.ougi.length) compact.og = rowsToArrays(data.ougi, OUGI_ORDER);
    if (data.ninpo && data.ninpo.length) compact.np = rowsToArrays(data.ninpo, NINPO_ORDER);
    if (data.haikei && data.haikei.length) compact.hk = rowsToArrays(data.haikei, HAIKEI_ORDER);
    if (data.relations && data.relations.length) {
      compact.rl = data.relations.map(r => {
        const mask = (r.location ? 1 : 0) | (r.secret ? 2 : 0) | (r.ougi ? 4 : 0) | (r.emotion_sign ? 8 : 0);
        return trimTrailingEmpty([r.name || '', mask, r.emotion || '']);
      });
    }
    return compact;
  };

  /** compactifyForShareの逆変換(applyLoadedDataが読める形へ復元) */
  const expandFromShare = (compact = {}) => {
    const data = { inputs: {}, checkboxes: {}, ougi: [], ninpo: [], haikei: [], relations: [] };
    if (compact.i) {
      Object.entries(compact.i).forEach(([k, v]) => { data.inputs[INPUT_KEY_MAP_REV[k] || k] = v; });
    }
    if (compact.sk) {
      compact.sk.forEach(idx => {
        const { row, col } = unpackSkillIndex(idx);
        data.checkboxes[`skill_r${row}_c${col}`] = true;
      });
    }
    if (compact.cb) compact.cb.forEach(id => { data.checkboxes[id] = true; });
    if (compact.og) data.ougi = arraysToRows(compact.og, OUGI_ORDER);
    if (compact.np) data.ninpo = arraysToRows(compact.np, NINPO_ORDER);
    if (compact.hk) data.haikei = arraysToRows(compact.hk, HAIKEI_ORDER);
    if (compact.rl) {
      data.relations = compact.rl.map(([name, mask, emotion]) => ({
        name: name || '',
        location: !!((mask || 0) & 1),
        secret: !!((mask || 0) & 2),
        ougi: !!((mask || 0) & 4),
        emotion_sign: !!((mask || 0) & 8),
        emotion: emotion || '',
      }));
    }
    return data;
  };
  
const API_BASE = 'https://sinobigami-api.kasu-kasu.workers.dev';
let currentCharacterId = null;

/** 保存履歴(localStorage)に記録する */
const addToHistory = (id, name) => {
  const historyJson = localStorage.getItem('sinobigami_history') || '[]';
  const history = JSON.parse(historyJson);
  const existing = history.find(h => h.id === id);
  if (existing) {
    existing.name = name || '(名前未設定)';
    existing.updatedAt = new Date().toISOString();
  } else {
    history.unshift({ id, name: name || '(名前未設定)', updatedAt: new Date().toISOString() });
  }
  localStorage.setItem('sinobigami_history', JSON.stringify(history));
};

const AUTH_API_BASE = API_BASE;
const AUTH_TOKEN_KEY = 'sinobigami_auth_token';
const AUTH_USER_KEY = 'sinobigami_auth_username';

const getAuthToken = () => localStorage.getItem(AUTH_TOKEN_KEY);
const getAuthUsername = () => localStorage.getItem(AUTH_USER_KEY);
const setAuth = (token, username) => {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(AUTH_USER_KEY, username);
};
const clearAuth = () => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
};

/** 履歴一覧(ゲスト用ローカル保存)を取得する */
const getHistory = () => {
  try {
    return JSON.parse(localStorage.getItem('sinobigami_history') || '[]');
  } catch {
    return [];
  }
};

/** 履歴を1件削除する(ゲスト用) */
const removeFromHistory = (id) => {
  const history = getHistory().filter(h => h.id !== id);
  localStorage.setItem('sinobigami_history', JSON.stringify(history));
};

/** 一覧を描画する共通処理 */
const renderListItems = (items) => {
  const listEl = document.getElementById('history_list');
  if (!listEl) return;
  if (items.length === 0) {
    listEl.innerHTML = '<p class="history-empty">データがありません</p>';
    return;
  }
  listEl.innerHTML = items.map(h => {
    const date = new Date(h.updatedAt);
    const dateStr = isNaN(date) ? '' : date.toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    return `
      <div class="history-item" data-id="${h.id}">
        <div class="history-item-info">
          <div class="history-item-name">${escapeHTML(h.name || '(名前未設定)')}</div>
          <div class="history-item-date">${dateStr}</div>
        </div>
        ${h.deletable ? `<button type="button" class="history-item-delete" data-delete-id="${h.id}" title="削除">✕</button>` : ''}
      </div>`;
  }).join('');
};

/** ゲスト履歴を描画する */
const renderGuestHistory = () => {
  const title = document.getElementById('history_list_title');
  if (title) title.textContent = 'ゲスト履歴';
  const items = getHistory()
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .map(h => ({ ...h, deletable: true }));
  renderListItems(items);
};

/** ログイン中ユーザーのキャラ一覧をサーバーから取得して描画する */
const renderMyCharacters = async () => {
  const title = document.getElementById('history_list_title');
  if (title) title.textContent = 'あなたのキャラクター';
  const listEl = document.getElementById('history_list');
  if (listEl) listEl.innerHTML = '<p class="history-empty">読み込み中...</p>';

  try {
    const res = await fetch(`${AUTH_API_BASE}/api/my-characters`, {
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    });
    if (!res.ok) throw new Error('取得に失敗しました');
    const list = await res.json();
    renderListItems(list.map(c => ({ ...c, deletable: false })));
  } catch (err) {
    console.error(err);
    if (listEl) listEl.innerHTML = '<p class="history-empty">読み込みに失敗しました</p>';
  }
};

/** ログイン/未ログインに応じて表示を切り替える */
const updateAuthUI = () => {
  const token = getAuthToken();
  const guestSection = document.getElementById('auth_section_guest');
  const userSection = document.getElementById('auth_section_user');
  const usernameDisplay = document.getElementById('auth_username_display');

  if (token) {
    if (guestSection) guestSection.style.display = 'none';
    if (userSection) userSection.style.display = '';
    if (usernameDisplay) usernameDisplay.textContent = getAuthUsername() || '';
    renderMyCharacters();
  } else {
    if (guestSection) guestSection.style.display = '';
    if (userSection) userSection.style.display = 'none';
    renderGuestHistory();
  }
};

// タブ切替
const authTabLogin = document.getElementById('auth_tab_login');
const authTabRegister = document.getElementById('auth_tab_register');
const loginForm = document.getElementById('login_form');
const registerForm = document.getElementById('register_form');

if (authTabLogin && authTabRegister) {
  authTabLogin.addEventListener('click', () => {
    authTabLogin.classList.add('is-active');
    authTabRegister.classList.remove('is-active');
    loginForm.style.display = '';
    registerForm.style.display = 'none';
  });
  authTabRegister.addEventListener('click', () => {
    authTabRegister.classList.add('is-active');
    authTabLogin.classList.remove('is-active');
    registerForm.style.display = '';
    loginForm.style.display = 'none';
  });
}

// ログイン処理
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('login_error');
    errorEl.textContent = '';
    const username = document.getElementById('login_username').value;
    const password = document.getElementById('login_password').value;

    try {
      const res = await fetch(`${AUTH_API_BASE}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const json = await res.json();
      if (!res.ok) { errorEl.textContent = json.error || 'ログインに失敗しました'; return; }
      setAuth(json.token, json.username);
      loginForm.reset();
      updateAuthUI();
    } catch (err) {
      console.error(err);
      errorEl.textContent = '通信エラーが発生しました';
    }
  });
}

// 新規登録処理
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('register_error');
    errorEl.textContent = '';
    const username = document.getElementById('register_username').value;
    const password = document.getElementById('register_password').value;

    try {
      const res = await fetch(`${AUTH_API_BASE}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const json = await res.json();
      if (!res.ok) { errorEl.textContent = json.error || '登録に失敗しました'; return; }
      // 登録後、自動的にログイン
      const loginRes = await fetch(`${AUTH_API_BASE}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const loginJson = await loginRes.json();
      if (loginRes.ok) {
        setAuth(loginJson.token, loginJson.username);
        registerForm.reset();
        updateAuthUI();
      }
    } catch (err) {
      console.error(err);
      errorEl.textContent = '通信エラーが発生しました';
    }
  });
}

// ログアウト処理
const logoutBtn = document.getElementById('logout_btn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    try {
      await fetch(`${AUTH_API_BASE}/api/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
    } catch (err) {
      console.error(err);
    }
    clearAuth();
    updateAuthUI();
  });
}

const historyToggleBtn = document.getElementById('history_toggle_btn');
const historyPanel = document.getElementById('history_panel');
const historyCloseBtn = document.getElementById('history_close_btn');
const historyListEl = document.getElementById('history_list');

const openHistoryPanel = () => {
  if (!historyPanel) return;
  updateAuthUI();
  historyPanel.classList.add('is-open');
  historyPanel.setAttribute('aria-hidden', 'false');
  if (historyToggleBtn) historyToggleBtn.setAttribute('aria-expanded', 'true');
};

const closeHistoryPanel = () => {
  if (!historyPanel) return;
  historyPanel.classList.remove('is-open');
  historyPanel.setAttribute('aria-hidden', 'true');
  if (historyToggleBtn) historyToggleBtn.setAttribute('aria-expanded', 'false');
};

if (historyToggleBtn) {
  historyToggleBtn.addEventListener('click', () => {
    historyPanel.classList.contains('is-open') ? closeHistoryPanel() : openHistoryPanel();
  });
}
if (historyCloseBtn) historyCloseBtn.addEventListener('click', closeHistoryPanel);

if (historyListEl) {
  historyListEl.addEventListener('click', (e) => {
    const delBtn = e.target.closest('.history-item-delete');
    if (delBtn) {
      removeFromHistory(delBtn.dataset.deleteId);
      renderGuestHistory();
      return;
    }
    const item = e.target.closest('.history-item');
    if (item) {
      window.location.hash = `id=${item.dataset.id}`;
      window.location.reload();
    }
  });
}

/** キャラクターシートを新規作成用に初期状態へリセットする */
const resetCharacterForm = () => {
  document.querySelectorAll('input[type="text"], input[type="number"], select, textarea').forEach(el => {
    if (el.closest('#history_panel')) return;
    if (/^(ougi_|ninpo_|haikei_|relation_)/.test(el.name || '')) return;
    if (el.tagName === 'SELECT') el.selectedIndex = 0;
    else el.value = '';
  });

  document.querySelectorAll('.skill-check').forEach(cb => { cb.checked = false; });
  document.querySelectorAll('.gap-check').forEach(cb => { cb.checked = false; });
  document.querySelectorAll('.damage-check').forEach(el => { el.dataset.state = '0'; });

  savedImageBase64 = null;
  clearPreview();
  if (imageInput) imageInput.value = '';

  while (document.querySelectorAll('.ougi-textarea[name^="ougi_name_"]').length > 0) removeOugiRow();
  addOugiRow();

  clearNinpoGridRows();
  clearNinpoTextRows();
  addNinpoRow({ name: '接近戦攻撃', type: '攻撃', range: '1', cost: '0', effect: '接近戦ダメージを1点与える。', ref: '基78' }, { skipResize: true });
  addNinpoRow({}, { skipResize: true });
  resizeNinpoGridRows();
  ninpoInputMode = 'grid';
  updateNinpoModeUI();

  while (document.querySelectorAll('.haikei-textarea[name^="haikei_name_"]').length > 0) removeHaikeiRow();
  addHaikeiRow();

  while (document.querySelectorAll('.relation-textarea[name^="relation_name_"]').length > 0) removeRelationRow();
  addRelationRow();

  currentCharacterId = null;
  history.replaceState(null, '', window.location.pathname + window.location.search);
};

const newCharacterBtn = document.getElementById('new_character_btn');
if (newCharacterBtn) {
  newCharacterBtn.addEventListener('click', () => {
    if (!confirm('現在の入力内容を破棄して新規作成しますか？')) return;
    resetCharacterForm();
    closeHistoryPanel();
  });
}


/** キャラクターを保存する(currentCharacterIdの有無で新規/更新を自動判定) */
const saveCharacter = async () => {
  const data = buildSaveData();
  const imageBase64 = data.image;
  delete data.image;
  if (data.ninpo) {
    data.ninpo = data.ninpo.filter(row => !isDefaultNinpoPreset(row));
  }
  const compact = compactifyForShare(data);

  const authHeaders = getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {};

  let id;
  if (currentCharacterId) {
    // 既にIDがある → 更新
    const res = await fetch(`${API_BASE}/api/update/${currentCharacterId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify(compact),
    });
    if (!res.ok) throw new Error('更新に失敗しました');
    id = currentCharacterId;
  } else {
    // IDがない → 新規作成
    const res = await fetch(`${API_BASE}/api/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify(compact),
    });
    if (!res.ok) throw new Error('保存に失敗しました');
    const json = await res.json();
    id = json.id;
    currentCharacterId = id;
  }

  // 画像があれば、そのIDに紐づけてアップロード(新規・更新どちらも同じ処理でOK)
  if (imageBase64) {
    const imageBlob = await (await fetch(imageBase64)).blob();
    const imgRes = await fetch(`${API_BASE}/api/upload-image/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': imageBlob.type },
      body: imageBlob,
    });
    if (!imgRes.ok) throw new Error('画像のアップロードに失敗しました');
  }

  addToHistory(id, getFieldValue('name'));
  return id;
};

/** 現在のcurrentCharacterIdから共有URLを組み立てる(保存はしない) */
const copyShareLink = () => {
  if (!currentCharacterId) return null;
  const url = new URL(window.location.href);
  url.hash = `id=${currentCharacterId}`;
  return url.toString();
};

const saveCharacterBtn = document.getElementById('save_character_btn');
if (saveCharacterBtn) {
  saveCharacterBtn.addEventListener('click', async () => {
    saveCharacterBtn.disabled = true;
    const originalHTML = saveCharacterBtn.innerHTML;
    saveCharacterBtn.innerHTML = '保存中...';
    try {
      await saveCharacter();
      if (getAuthToken()) renderMyCharacters(); // 追加：ログイン中なら一覧を再取得
      alert('保存しました！');
    } catch (err) {
      console.error('保存に失敗しました', err);
      alert(`保存中にエラーが発生しました。\n${err && err.message ? err.message : err}`);
    } finally {
      saveCharacterBtn.disabled = false;
      saveCharacterBtn.innerHTML = originalHTML;
    }
  });
}

  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
      const url = copyShareLink();
      if (!url) {
        alert('まだ保存されていません。先に「保存」ボタンを押してください。');
        return;
      }
      try {
        if (!navigator.clipboard || !navigator.clipboard.writeText) {
          throw new Error('Clipboard API is not available');
        }
        await navigator.clipboard.writeText(url);
        alert(`共有リンクをクリップボードにコピーしました！（${url.length}文字）`);
      } catch (err) {
        console.error('クリップボードへのコピーに失敗しました', err);
        prompt('クリップボードへのコピーに失敗しました。以下のリンクを手動でコピーしてください:', url);
      }
    });
  }

  // ページ読み込み時、DBに共有データが含まれていれば自動反映
(async () => {
  const hash = window.location.hash || '';
  const match = hash.match(/^#id=(.+)$/);
  if (!match) return;

  try {
    const res = await fetch(`${API_BASE}/api/load/${match[1]}`);
    if (!res.ok) throw new Error('データが見つかりません');
    const compact = await res.json();
    const data = expandFromShare(compact);

    // 画像がある場合はURLを組み立てて反映
    if (compact.img) {
      data.image = `${API_BASE}/api/image/${match[1]}`;
    }

    applyLoadedData(data);
    currentCharacterId = match[1];
    history.replaceState(null, '', window.location.pathname + window.location.search);
    alert('共有リンクからキャラクターデータを読み込みました！');
  } catch (err) {
    console.error('共有データの読み込みに失敗しました', err);
    alert('共有リンクの読み込みに失敗しました。');
  }
})();

  // ──────────────────────────────
  // 4. ココフォリア用コピー
  // ──────────────────────────────
  const copyNameBtn = document.getElementById('copy_name_btn');
  const nameInput = document.getElementById('name');

  if (copyNameBtn && nameInput) {
    copyNameBtn.addEventListener('click', () => {
      const nameValue = nameInput.value;
      if (!nameValue) { alert('名前が入力されていません。'); return; }

      let commands = 'ーーー特技ーーー\n';
      document.querySelectorAll('.skill-check:checked').forEach(cb => {
        commands += `SG>=5 《${cb.value}》\n`;
      });
      const specialSkill = getFieldValue('special_skill');
      if (specialSkill) commands += `\n特記: ${specialSkill}\n`;

      // commands += '\nーーー奥義ーーー\n';
      // collectOugi().forEach(og => {
      //   if (og.name) commands += `「${og.name}」/指定特技=${og.skill}/効果・改造=${og.kaizou}/${og.ref}エフェクト：${og.effect}\n`;
      // });

      commands += '\nーーー忍法ーーー\n';
      collectNinpo({ includeDisabled: false }).forEach(np => {
        if (np.name) commands += `【${np.name}】(${np.type}/指定特技:${np.skill}/間合:${np.range}/コスト:${np.cost})　効果:${np.effect}\n`;
      });

      commands += `\nーーー表ーーー
ST　通常シーン表
FT　ファンブル表
RTT　ランダム特技決定表
ET　感情表
WT　変調表
GWT　戦国変調表`;

      // シノビガミ用ステータス配列
      const statusArr = [
        { label: '器術', value: Number(getFieldValue('kijutsu', '1')), max: Number(getFieldValue('kijutsu', '1')) },
        { label: '体術', value: Number(getFieldValue('taijutsu', '1')), max: Number(getFieldValue('taijutsu', '1')) },
        { label: '忍術', value: Number(getFieldValue('ninjutsu', '1')), max: Number(getFieldValue('ninjutsu', '1')) },
        { label: '謀術', value: Number(getFieldValue('boujutsu', '1')), max: Number(getFieldValue('boujutsu', '1')) },
        { label: '戦術', value: Number(getFieldValue('senjutsu', '1')), max: Number(getFieldValue('senjutsu', '1')) },
        { label: '妖術', value: Number(getFieldValue('youjutsu', '1')), max: Number(getFieldValue('youjutsu', '1')) },
        { label: '頑健', value: Number(getFieldValue('life_extra', '0')), max: Number(getFieldValue('life_extra', '0')) },
        { label: '忍具', value: Number(getFieldValue('ningu_total', '0')), max: Number(getFieldValue('ningu_total', '0')) }
      ];

      const paramsArr = [
        // { label: '功績点', value: String(getFieldValue('points', '0')) }
      ];

      const ccfoliaData = {
        kind: 'character',
        data: { name: nameValue, initiative: 0, commands, status: statusArr, params: paramsArr }
      };

      navigator.clipboard.writeText(JSON.stringify(ccfoliaData))
        .then(() => alert('ココフォリア用のキャラクターデータをクリップボードにコピーしました！\nそのままココフォリアの盤面で Ctrl+V してください。'))
        .catch(err => { console.error('コピーに失敗しました', err); alert('コピーに失敗しました。'); });
    });
  }

  // ──────────────────────────────
  // 4b. 隠すトグル
  // ──────────────────────────────
  const hideToggleBtn = document.getElementById('hide_toggle_btn');
  const ougiSection = document.getElementById('ougi_section');
  const ninguSection = document.getElementById('ningu_section');

  const ICON_ATTRS = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
  const ICON_EYE = `<svg ${ICON_ATTRS}><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"/><circle cx="12" cy="12" r="3"/></svg>`;
  const ICON_EYE_SLASH = `<svg ${ICON_ATTRS}><path d="M3 3l18 18"/><path d="M10.6 5.2C11.05 5.07 11.52 5 12 5c7 0 11 7 11 7a19.7 19.7 0 0 1-3.22 4.06M6.5 6.6C3.6 8.4 1 12 1 12s4 7 11 7c1.3 0 2.5-.22 3.6-.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>`;

  let isHidden = true;
  if (hideToggleBtn) {
    // 初期状態で隠す
    document.body.classList.add('hidden-mode');
    if (ougiSection) { ougiSection.classList.add('hideable-section'); ougiSection.dataset.hideLabel = '奥義'; }
    if (ninguSection) { ninguSection.classList.add('hideable-section'); ninguSection.dataset.hideLabel = '忍具'; }
    hideToggleBtn.innerHTML = `${ICON_EYE}表示する`;

    hideToggleBtn.addEventListener('click', () => {
      isHidden = !isHidden;
      document.body.classList.toggle('hidden-mode', isHidden);
      if (ougiSection) { ougiSection.classList.toggle('hideable-section', isHidden); ougiSection.dataset.hideLabel = '奥義'; }
      if (ninguSection) { ninguSection.classList.toggle('hideable-section', isHidden); ninguSection.dataset.hideLabel = '忍具'; }
      hideToggleBtn.innerHTML = isHidden ? `${ICON_EYE}表示する` : `${ICON_EYE_SLASH}隠す`;
    });
  }

  // ──────────────────────────────
  // 5. キャラシ画像生成 & コピー
  // ──────────────────────────────
  const screenshotBtn = document.getElementById('screenshot_btn');
  if (!screenshotBtn) return;

  const renderPreviewToCanvas = async () => {
    const container = document.createElement('div');
    container.id = 'preview-render-container';
    container.innerHTML = buildPreviewHTML();

    // 現在のテーマのCSS変数値を明示的に取得してインライン指定する。
    // html2canvasは [data-theme="..."] のような属性セレクタ経由のCSS変数を
    // 正しく解決できずデフォルト(:root)値にフォールバックすることがあるため、
    // 生成前に実際の計算値をコンテナへ直接焼き込んで確実に反映させる。
    const THEME_VAR_NAMES = [
      '--ink', '--muted', '--panel', '--panel-shadow', '--border', '--highlight',
      '--bg-top', '--bg-bottom', '--accent', '--accent-strong', '--accent-rgb',
      '--accent-hover', '--h1-color', '--footer-color', '--texture-color',
      '--corner-glow', '--accent-glow', '--surface', '--surface-alt', '--text',
      '--selected-bg', '--selected-color',
    ];
    const rootStyle = getComputedStyle(document.documentElement);
    THEME_VAR_NAMES.forEach(name => {
      const value = rootStyle.getPropertyValue(name).trim();
      if (value) container.style.setProperty(name, value);
    });

    document.body.appendChild(container);

    const sheet = container.querySelector('.pv-sheet');
    if (!sheet) {
      container.remove();
      throw new Error('プレビュー要素が見つかりません');
    }

    const width = Math.ceil(sheet.scrollWidth || 960);
    const height = Math.ceil(sheet.scrollHeight || 1400);
    container.style.width = `${width}px`;
    container.style.height = `${height}px`;

    await document.fonts.ready;
    await Promise.all(
      Array.from(container.querySelectorAll('img')).map(img =>
        img.decode ? img.decode().catch(() => undefined) : Promise.resolve()
      )
    );

    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    const themeBgColor = getComputedStyle(document.documentElement).getPropertyValue('--bg-top').trim() || '#f4ede0';

    const canvas = await html2canvas(sheet, {
      backgroundColor: themeBgColor,
      scale: 2,
      useCORS: true,
      width,
      height,
      scrollX: 0,
      scrollY: 0,
      windowWidth: width,
      windowHeight: height,
      logging: false,
      imageTimeout: 15000,
      letterRendering: true,
    });

    container.remove();
    return canvas;
  };

  const AREA_NAMES = ['器術', '体術', '忍術', '謀術', '戦術', '妖術'];
  const SKILL_TABLE = [
    ['絡繰術','騎乗術','生存術','医術','兵糧術','異形化'],
    ['火術','砲術','潜伏術','毒術','鳥獣術','召喚術'],
    ['水術','手裏剣術','遁走術','罠術','野戦術','死霊術'],
    ['針術','手練','盗聴術','調査術','地の利','結界術'],
    ['仕込み','身体操術','腹話術','詐術','意気','封術'],
    ['衣装術','歩法','隠形術','対人術','用兵術','言霊術'],
    ['縄術','走法','変装術','遊芸','記憶術','幻術'],
    ['登術','飛術','香術','九ノ一術','見敵術','瞳術'],
    ['拷問術','骨法術','分身の術','傀儡の術','暗号術','千里眼の術'],
    ['壊器術','刀術','隠蔽術','流言の術','伝達術','憑依術'],
    ['掘削術','怪力','第六感','経済力','人脈','呪術']
  ];

  const buildPreviewHTML = () => {
    const v = (id) => escapeHTML(getFieldValue(id));
    const setting = getFieldValue('setting');
    const specialSkill = getFieldValue('special_skill');
    const skillIds = getAcquiredSkillIds();
    const ougi = collectOugi().filter(og => og.name);
    const ninpo = collectNinpo().filter(np => np.name);
    const relations = collectRelations().filter(r => r.name);

    const imgEl = document.getElementById('setting_image_preview');
    const imageSrc = (imgEl && imgEl.classList.contains('is-visible') && imgEl.src) ? imgEl.src : '';

    // ギャップ（分野間の塗りつぶし）状態を取得
    const gaps = [];
    for (let g = 1; g <= 5; g++) {
      const cb = document.getElementById(`gap${g}`);
      gaps.push(cb ? cb.checked : false);
    }

    let skillHTML = '<table class="pv-skill-table"><colgroup><col class="pv-skill-col-num">';
    AREA_NAMES.forEach(() => {
      skillHTML += '<col class="pv-skill-col-area"><col class="pv-skill-col-gap">';
    });
    skillHTML += '</colgroup><thead><tr><th></th>';
    AREA_NAMES.forEach((a, ai) => {
      skillHTML += `<th>${a}</th>`;
      if (ai < 5) skillHTML += `<th class="pv-gap-head ${gaps[ai] ? 'pv-gap-on' : ''}"></th>`;
    });
    skillHTML += '</tr></thead><tbody>';
    SKILL_TABLE.forEach((row, ri) => {
      skillHTML += `<tr><td class="pv-num">${ri + 2}</td>`;
      row.forEach((s, ci) => {
        const id = `skill_r${ri + 2}_c${ci + 1}`;
        skillHTML += `<td class="${skillIds.includes(id) ? 'pv-skill-on' : ''}">${s}</td>`;
        if (ci < 5) skillHTML += `<td class="pv-gap-cell ${gaps[ci] ? 'pv-gap-on' : ''}"></td>`;
      });
      skillHTML += '</tr>';
    });
    skillHTML += '</tbody></table>';

    let ougiHTML = '';
    if (ougi.length) {
      ougiHTML = '<table class="pv-table"><thead><tr><th>奥義名</th><th>指定特技</th><th>改造</th><th>エフェクト</th></tr></thead><tbody>';
      ougi.forEach(og => {
        ougiHTML += `<tr><td>${escapeHTML(og.name)}</td><td>${escapeHTML(og.skill)}</td><td>${escapeHTML(og.kaizou)}</td><td class="pv-effect">${escapeHTML(og.effect)}</td></tr>`;
      });
      ougiHTML += '</tbody></table>';
    }

    let ninpoHTML = '';
    const ninpoForPreview = collectNinpo({ includeDisabled: false }).filter(np => np.name);
    if (ninpoForPreview.length) {
      ninpoHTML = '<table class="pv-table"><thead><tr><th>忍法名</th><th>タイプ</th><th>指定特技</th><th>間合い</th><th>コスト</th><th>効果</th><th>参照p</th></tr></thead><tbody>';
      ninpoForPreview.forEach(np => {
        ninpoHTML += `<tr><td>${escapeHTML(np.name)}</td><td>${escapeHTML(np.type)}</td><td>${escapeHTML(np.skill)}</td><td>${escapeHTML(np.range)}</td><td>${escapeHTML(np.cost)}</td><td class="pv-effect">${escapeHTML(np.effect)}</td><td>${escapeHTML(np.ref)}</td></tr>`;
      });
      ninpoHTML += '</tbody></table>';
    }

    const haikei = collectHaikei().filter(hk => hk.name);
    let haikeiHTML = '';
    if (haikei.length) {
      haikeiHTML = '<table class="pv-table"><thead><tr><th>背景名</th><th>長所/短所</th><th>必要功績点</th><th>効果</th><th>参照p</th></tr></thead><tbody>';
      haikei.forEach(hk => {
        haikeiHTML += `<tr><td>${escapeHTML(hk.name)}</td><td>${escapeHTML(hk.merit)}</td><td>${escapeHTML(hk.cost)}</td><td class="pv-effect">${escapeHTML(hk.effect)}</td><td>${escapeHTML(hk.ref)}</td></tr>`;
      });
      haikeiHTML += '</tbody></table>';
    }

    let relHTML = '';
    if (relations.length) {
      relHTML = '<table class="pv-table"><thead><tr><th>人物名</th><th>居所</th><th>秘密</th><th>奥義</th><th>感情</th></tr></thead><tbody>';
      relations.forEach(r => {
        const sign = r.emotion_sign ? '－' : '＋';
        relHTML += `<tr><td>${escapeHTML(r.name)}</td><td>${r.location ? '■' : '□'}</td><td>${r.secret ? '■' : '□'}</td><td>${r.ougi ? '■' : '□'}</td><td>${sign}${escapeHTML(r.emotion)}</td></tr>`;
      });
      relHTML += '</tbody></table>';
    }

    // 忍具データ収集
    const ninguData = {
      hyorogan: escapeHTML(getFieldValue('ningu_hyorogan')),
      jintsumaru: escapeHTML(getFieldValue('ningu_jintsumaru')),
      tonkofu: escapeHTML(getFieldValue('ningu_tonkofu')),
      other: escapeHTML(getFieldValue('ningu_other'))
    };
    const hasNingu = ninguData.hyorogan || ninguData.jintsumaru || ninguData.tonkofu || ninguData.other;
    let ninguHTML = '';
    if (hasNingu) {
      ninguHTML = '<table class="pv-table"><thead><tr><th>忍具</th><th>個数</th></tr></thead><tbody>';
      if (ninguData.hyorogan) ninguHTML += `<tr><td>兵糧丸</td><td>${ninguData.hyorogan}</td></tr>`;
      if (ninguData.jintsumaru) ninguHTML += `<tr><td>神通丸</td><td>${ninguData.jintsumaru}</td></tr>`;
      if (ninguData.tonkofu) ninguHTML += `<tr><td>遁甲符</td><td>${ninguData.tonkofu}</td></tr>`;
      if (ninguData.other) ninguHTML += `<tr><td>その他</td><td>${ninguData.other}</td></tr>`;
      ninguHTML += '</tbody></table>';
    }

    // 隠すモード時は奥義・忍具を黒塗りにする
    const ougiBlock = isHidden
      ? '<div class="pv-hidden-block">奥義</div>'
      : (ougiHTML || '<p class="pv-empty">なし</p>');
    const ninguBlock = isHidden
      ? '<div class="pv-hidden-block">忍具</div>'
      : (ninguHTML || '<p class="pv-empty">なし</p>');

    return `
    <div class="pv-sheet">
      <h1 class="pv-title">シノビガミ キャラクターシート</h1>
      <div class="pv-columns">
        <div class="pv-col">
          <div class="pv-section">
            <h2>基本情報</h2>
            <dl class="pv-dl">
              <dt>名前</dt><dd>${v('name')}</dd>
              <dt>上位流派</dt><dd>${v('school')}</dd>
              <dt>流派</dt><dd>${v('sub_school')}</dd>
              <dt>階級</dt><dd>${v('rank')}</dd>
              <dt>信念</dt><dd>${v('belief')}</dd>
              <dt>性別</dt><dd>${v('gender')}</dd>
              <dt>年齢</dt><dd>${v('age')}</dd>
              <dt>表の顔</dt><dd>${v('face')}</dd>
              <dt>流儀</dt><dd>${v('manner')}</dd>
              <dt>功績点</dt><dd>${v('points')}</dd>
            </dl>
          </div>
          <div class="pv-section">
            <h2>追加生命力</h2>
            <dl class="pv-dl">
              <dt>追加生命力</dt><dd>${v('life_extra')}</dd>
            </dl>
          </div>
        </div>
        <div class="pv-col">
          <div class="pv-section">
            <h2>背景</h2>
            ${imageSrc ? `<div class="pv-image-wrap"><img src="${imageSrc}" class="pv-image" alt="背景画像" /></div>` : ''}
            <p class="pv-text">${escapeHTML(setting).replace(/\n/g, '<br>')}</p>
          </div>
        </div>
      </div>
      <div class="pv-section pv-full">
        <h2>特技</h2>
        ${skillHTML}
        ${specialSkill ? `<p class="pv-soul">特記事項：<strong>${escapeHTML(specialSkill)}</strong></p>` : ''}
      </div>
      <div class="pv-section pv-full">
        <h2>奥義</h2>
        ${ougiBlock}
      </div>
      <div class="pv-section pv-full">
        <h2>忍法</h2>
        ${ninpoHTML || '<p class="pv-empty">なし</p>'}
      </div>
      <div class="pv-section pv-full">
        <h2>背景</h2>
        ${haikeiHTML || '<p class="pv-empty">なし</p>'}
      </div>
      <div class="pv-section pv-full">
        <h2>関係</h2>
        ${relHTML || '<p class="pv-empty">なし</p>'}
      </div>
      <div class="pv-section pv-full">
        <h2>忍具</h2>
        ${ninguBlock}
      </div>
    </div>`;
  };

  const ICON_SPINNER = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true" class="btn-spinner"><path d="M12 3a9 9 0 1 0 9 9"/></svg>`;

  screenshotBtn.addEventListener('click', async () => {
    const originalHTML = screenshotBtn.innerHTML;
    screenshotBtn.innerHTML = `${ICON_SPINNER}生成中...`;
    screenshotBtn.disabled = true;

    try {
      const canvas = await renderPreviewToCanvas();

      canvas.toBlob(async (blob) => {
        if (!blob) { alert('画像の生成に失敗しました。'); return; }
        try {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          alert('キャラクターシートの画像をクリップボードにコピーしました！\nCtrl+V で貼り付けできます。');
        } catch (err) {
          console.error('クリップボードへのコピーに失敗:', err);
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${getFieldValue('name', 'character')}_キャラシ.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          alert('クリップボードへのコピーに失敗したため、画像をダウンロードしました。');
        }
      }, 'image/png');
    } catch (err) {
      console.error('画像生成に失敗:', err);
      alert('画像の生成に失敗しました。');
    } finally {
      screenshotBtn.innerHTML = originalHTML;
      screenshotBtn.disabled = false;
    }
  });

}); // end DOMContentLoaded