// ==========================================
// シノビガミ キャラシ作成サイト - メインスクリプト
// ==========================================
// マギロギと共通の処理(テーマ、トースト、タグ、立ち絵、ログイン、キャラ一覧、保存・共有リンクなど)は
// ../common/sheet-common.js にあり、このファイルより先に読み込まれる。

// ==========================================
// PC表示モード：忍法/背景&関係/奥義&忍具の切り替え
// ==========================================
(() => {
  const CENTER_PAGES = [
    { key: 'ninpo', label: '忍法' },
    { key: 'haikei-relation', label: '背景・関係' },
    { key: 'ougi-ningu', label: '奥義・忍具' },
  ];
  const btn = document.getElementById('center_switch_btn');
  if (!btn) return;
  let currentCenterPage = 'ninpo';

  const PAGE_ROOT_SELECTORS = {
    'ninpo': ['#ninpo_section'],
    'haikei-relation': ['#haikei_section', '.relation-panel'],
    'ougi-ningu': ['#ougi_section'],
  };

  // 非表示中に高さ0で固定されたテキストエリアを、表示された時点で再計算させる
  const resyncTextareaHeights = (key) => {
    (PAGE_ROOT_SELECTORS[key] || []).forEach(sel => {
      const root = document.querySelector(sel);
      if (!root) return;
      root.querySelectorAll('textarea[data-resize-bound]').forEach(ta => {
        ta.dispatchEvent(new Event('input', { bubbles: true }));
      });
    });
  };

  const applyPage = (key) => {
    currentCenterPage = key;
    document.documentElement.setAttribute('data-center-page', key);
    const page = CENTER_PAGES.find(p => p.key === key) || CENTER_PAGES[0];
    btn.textContent = page.label;
    resyncTextareaHeights(key);
  };

  applyPage('ninpo');

  btn.addEventListener('click', () => {
    const idx = CENTER_PAGES.findIndex(p => p.key === currentCenterPage);
    const next = CENTER_PAGES[(idx + 1) % CENTER_PAGES.length].key;
    applyPage(next);
  });
})();

// --- シノビガミ用のヘルパー ---

/** 忍具欄の入力値を数値にする。半角/全角数字のみで構成されていればその数、それ以外(空欄・文字混じり等)は0 */
const parseNinguCount = (value = '') => {
  const halfWidth = String(value).trim().replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));
  return /^\d+$/.test(halfWidth) ? Number(halfWidth) : 0;
};

/**
 * キャラの区分(基本情報の「区分」)。lifeLabel は生命力の欄の見出し。区分を増やすときはここに足す。
 * 値の無い古いデータや不明な値はシノビとして扱う(APIの一覧の要約も同じ)。
 */
const CHARACTER_KINDS = {
  shinobi: { label: 'シノビ', lifeLabel: '追加生命力' },
  enemy: { label: 'エネミー', lifeLabel: '生命力' },
};
const DEFAULT_CHARACTER_KIND = 'shinobi';
const getCharacterKind = () => {
  const kind = getFieldValue('char_kind', DEFAULT_CHARACTER_KIND);
  return CHARACTER_KINDS[kind] ? kind : DEFAULT_CHARACTER_KIND;
};

/** 区分に合わせて、生命力の欄の見出しを変える */
const applyCharacterKindUI = () => {
  const label = document.getElementById('life_extra_label');
  if (label) label.textContent = CHARACTER_KINDS[getCharacterKind()].lifeLabel;
};
document.getElementById('char_kind')?.addEventListener('change', applyCharacterKindUI);

/** name属性から値を読むフィールドgetterを作る */
const textField = (name) => (i) => {
  const el = document.querySelector(`[name="${name}_${i}"]`);
  return el ? (el.value || '') : '';
};

/** id属性からチェック状態を読むフィールドgetterを作る */
const checkboxField = (name) => (i) => {
  const el = document.getElementById(`${name}_${i}`);
  return el ? el.checked : false;
};

/** existsSelector(i)が見つかる限りi=1,2,...と行を収集し、fieldGettersで各行のオブジェクトを組み立てる */
const collectRows = (existsSelector, fieldGetters) => {
  const rows = [];
  let i = 1;
  while (document.querySelector(existsSelector(i))) {
    const row = {};
    Object.entries(fieldGetters).forEach(([key, getter]) => { row[key] = getter(i); });
    rows.push(row);
    i++;
  }
  return rows;
};

/** 奥義データを収集 */
const collectOugi = () => collectRows(i => `[name="ougi_name_${i}"]`, {
  name: textField('ougi_name'),
  skill: textField('ougi_skill'),
  kaizou: textField('ougi_kaizou'),
  effect: textField('ougi_effect'),
});

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

/** 事前にsplit済みの行配列からラベル付き値を1つ取り出す（呼び出しごとの再split/正規表現生成を避けるため行配列を受け取る） */
const getNinpoFieldValue = (lines, label) => {
  const pattern = new RegExp(`^${label}(?:[：:]|[\\s\\u3000]+)\\s*(.*)$`);
  for (const line of lines) {
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

  const type = getNinpoFieldValue(restLines, 'タイプ');
  const range = getNinpoFieldValue(restLines, '間合');
  const cost = getNinpoFieldValue(restLines, 'コスト');
  const skill = getNinpoFieldValue(restLines, '指定特技');
  const ref = getNinpoFieldValue(restLines, '参照p');

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

/** 表形式の忍法の i 行目が無効化(✕)されているか */
const isNinpoGridRowDisabled = (i) => !!document.querySelector(`.btn-ninpo-disable[data-ninpo-row="${i}"]`)?.classList.contains('is-disabled');

const collectNinpoFromGrid = ({ includeDisabled = true } = {}) => {
  const ninpo = [];
  let i = 1;
  let nameEl;
  while ((nameEl = document.querySelector(`[name="ninpo_name_${i}"]`))) {
    if (!includeDisabled && isNinpoGridRowDisabled(i)) { i++; continue; }
    ninpo.push({
      name: normalizeNinpoName(nameEl.value || ''),
      type: textField('ninpo_type')(i),
      skill: textField('ninpo_skill')(i),
      range: textField('ninpo_range')(i),
      cost: textField('ninpo_cost')(i),
      effect: textField('ninpo_effect')(i),
      ref: textField('ninpo_ref')(i),
    });
    i++;
  }
  return ninpo;
};

/**
 * テキスト入力の忍法を、行ごとの無効化の状態と一緒に集める(空の行は除く)。
 * 無効化は表形式の ✕ をテキスト入力へ切り替えても保つためのもので、行の data-ninpo-disabled に持つ(保存データには入れない)
 */
const collectNinpoTextEntries = () => {
  const ninpoTextList = document.getElementById('ninpo_text_list');
  if (!ninpoTextList) return [];
  return Array.from(ninpoTextList.querySelectorAll('.ninpo-text-row'))
    .map(rowEl => ({
      row: parseNinpoBlock(rowEl.querySelector('.ninpo-text-block')?.value || ''),
      disabled: rowEl.dataset.ninpoDisabled === 'true',
    }))
    .filter(entry => !isEmptyNinpoRow(entry.row));
};

const collectNinpoFromText = ({ includeDisabled = true } = {}) => collectNinpoTextEntries()
  .filter(entry => includeDisabled || !entry.disabled)
  .map(entry => entry.row);

/** 指定フィールドが全てfalsyな行を「空行」とみなす判定関数を作る */
const makeEmptyRowChecker = (fields) => (row = {}) => fields.every(field => !row[field]);
const isEmptyNinpoRow = makeEmptyRowChecker(['name', 'type', 'skill', 'range', 'cost', 'effect', 'ref']);
const isEmptyOugiRow = makeEmptyRowChecker(['name', 'skill', 'kaizou', 'effect']);
const isEmptyHaikeiRow = makeEmptyRowChecker(['name', 'merit', 'cost', 'effect', 'ref']);
const isEmptyRelationRow = makeEmptyRowChecker(['name', 'location', 'secret', 'ougi', 'emotion_sign', 'emotion']);
const isEmptyNinguRow = makeEmptyRowChecker(['name', 'count']);

/** 忍法データを収集 (disabled行を除外するかどうか選択可能) */
const collectNinpo = ({ includeDisabled = true } = {}) => {
  if (ninpoInputMode === 'text') {
    return collectNinpoFromText({ includeDisabled });
  }
  return collectNinpoFromGrid({ includeDisabled });
};

/** 背景データを収集 */
const collectHaikei = () => collectRows(i => `[name="haikei_name_${i}"]`, {
  name: textField('haikei_name'),
  merit: textField('haikei_merit'),
  cost: textField('haikei_cost'),
  effect: textField('haikei_effect'),
  ref: textField('haikei_ref'),
});

/** 関係データを収集 */
const collectRelations = () => collectRows(i => `[name="relation_name_${i}"]`, {
  name: textField('relation_name'),
  location: checkboxField('relation_location'),
  secret: checkboxField('relation_secret'),
  ougi: checkboxField('relation_ougi'),
  emotion_sign: checkboxField('relation_emotion_sign'),
  emotion: textField('relation_emotion'),
});

/** 忍具の自由記述の行(兵糧丸・神通丸・遁甲符以外)を収集 */
const collectNingu = () => collectRows(i => `[name="ningu_item_name_${i}"]`, {
  name: textField('ningu_item_name'),
  count: textField('ningu_item_count'),
});

/** 忍具の個数の合計(兵糧丸・神通丸・遁甲符と、自由記述の行) */
const getNinguTotal = () =>
  ['ningu_hyorogan', 'ningu_jintsumaru', 'ningu_tonkofu'].reduce((sum, key) => sum + parseNinguCount(getFieldValue(key)), 0)
  + collectNingu().reduce((sum, row) => sum + parseNinguCount(row.count), 0);

/**
 * 以前の「その他」欄(ningu_other)の値を、自由記述の1行にする。
 * 数字だけなら個数として「その他」の名前を付け、文字が混じっていれば名前欄にそのまま入れる
 */
const legacyNinguOtherRow = (value = '') => {
  const text = String(value).trim();
  if (!text) return null;
  return /^[\d０-９]+$/.test(text) ? { name: 'その他', count: text } : { name: text, count: '' };
};

/** 習得済み特技IDリストを返す */
const getAcquiredSkillIds = () => {
  const ids = [];
  document.querySelectorAll('.skill-check:checked').forEach(cb => ids.push(cb.id));
  return ids;
};

/** リストの末尾からrowSize個の子要素を削除する（ヘッダー行数以下にはしない） */
const removeLastRow = (list, headerCount, rowSize) => {
  if (!list || list.children.length <= headerCount) return false;
  for (let i = 0; i < rowSize; i++) {
    if (list.lastElementChild) list.removeChild(list.lastElementChild);
  }
  return true;
};

/** 指定コンテナ・セレクタに対する行単位の自動リサイズbinderを作る（二重バインド防止付き） */
const bindAutoResize = (container, selector) => (textarea) => {
  if (textarea.dataset.resizeBound) return;
  textarea.dataset.resizeBound = 'true';
  textarea.addEventListener('input', () => resizeTextareaRow(container, selector, textarea.dataset.row));
  resizeTextareaRow(container, selector, textarea.dataset.row);
};

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

  const bindOugiTextarea = bindAutoResize(ougiList, '.ougi-textarea');

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
    if (ougiCount === 0) return;
    if (removeLastRow(ougiList, OUGI_HEADER_COUNT, OUGI_ROW_SIZE)) ougiCount = Math.max(0, ougiCount - 1);
  };

  if (ougiList) {
    addOugiRow();
    ougiList.querySelectorAll('.ougi-textarea').forEach(bindOugiTextarea);
  }
  if (addOugiBtn) addOugiBtn.addEventListener('click', addOugiRow);
  if (removeOugiBtn) removeOugiBtn.addEventListener('click', removeOugiRow);

  // ──────────────────────────────
  // 1a'. 忍具セクション(自由記述の行)
  // ──────────────────────────────
  const ninguList = document.getElementById('ningu_list');
  const addNinguBtn = document.getElementById('add_ningu_btn');
  const removeNinguBtn = document.getElementById('remove_ningu_btn');
  let ninguCount = 0;
  // 兵糧丸・神通丸・遁甲符の3行(ラベル+入力欄)は消さない
  const NINGU_FIXED_COUNT = 6;
  const NINGU_ROW_SIZE = 2;

  const addNinguRow = (row = {}) => {
    if (!ninguList) return;
    ninguCount++;
    const n = ninguCount;
    ninguList.insertAdjacentHTML('beforeend', `
      <input name="ningu_item_name_${n}" type="text" class="ningu-input ningu-name-input" placeholder="忍具名" aria-label="忍具名" />
      <input name="ningu_item_count_${n}" type="text" class="ningu-input" aria-label="個数" />`);
    ninguList.querySelector(`[name="ningu_item_name_${n}"]`).value = row.name || '';
    ninguList.querySelector(`[name="ningu_item_count_${n}"]`).value = row.count || '';
  };

  const removeNinguRow = () => {
    if (ninguCount === 0) return;
    if (removeLastRow(ninguList, NINGU_FIXED_COUNT, NINGU_ROW_SIZE)) ninguCount = Math.max(0, ninguCount - 1);
  };

  const clearNinguRows = () => { while (ninguCount > 0) removeNinguRow(); };

  if (addNinguBtn) addNinguBtn.addEventListener('click', () => addNinguRow());
  if (removeNinguBtn) removeNinguBtn.addEventListener('click', removeNinguRow);

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

  const bindNinpoTextarea = bindAutoResize(ninpoList, '.ninpo-textarea');

  const resizeNinpoGridRows = () => {
    if (!ninpoList) return;
    ninpoList.querySelectorAll('.ninpo-textarea').forEach(textarea => {
      resizeTextareaRow(ninpoList, '.ninpo-textarea', textarea.dataset.row);
    });
  };

  const bindNinpoTextBlock = bindAutoResize(ninpoTextList, '.ninpo-text-block');

  const countNinpoTextRows = () => ninpoTextList ? ninpoTextList.querySelectorAll('.ninpo-text-row').length : 0;

  /** テキスト入力の行の見出し。表形式で無効化(✕)した忍法には「（無効）」を付ける */
  const ninpoTextRowHeadLabel = (n, disabled) => `忍法 ${n}${disabled ? '（無効）' : ''}`;

  const addNinpoTextRow = (row = {}, { disabled = false } = {}) => {
    if (!ninpoTextList) return;
    const n = countNinpoTextRows() + 1;
    const rowHTML = `
      <div class="ninpo-text-row" data-ninpo-disabled="${disabled}">
        <div class="ninpo-text-row-head">${ninpoTextRowHeadLabel(n, disabled)}</div>
        <textarea name="ninpo_text_${n}" class="ninpo-text-block${disabled ? ' ninpo-cell-disabled' : ''}" rows="8" data-row="${n}" placeholder="${n}件目の忍法を入力"></textarea>
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
      if (head) head.textContent = ninpoTextRowHeadLabel(rowNumber, row.dataset.ninpoDisabled === 'true');
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
    renderRows.forEach((row, index) => addNinpoTextRow(row, { disabled: isNinpoGridRowDisabled(index + 1) }));
    renumberNinpoTextRows();
  };

  const syncNinpoGridFromText = () => {
    if (!ninpoList) return;
    const entries = collectNinpoTextEntries();
    clearNinpoGridRows();
    const renderEntries = entries.length ? entries : [{ row: {}, disabled: false }];
    renderEntries.forEach(({ row, disabled }) => {
      addNinpoRow(row);
      if (disabled) toggleNinpoDisable(ninpoCount);
    });
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

  const bindHaikeiTextarea = bindAutoResize(haikeiList, '.haikei-textarea');

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
    if (haikeiCount === 0) return;
    if (removeLastRow(haikeiList, HAIKEI_HEADER_COUNT, HAIKEI_ROW_SIZE)) haikeiCount = Math.max(0, haikeiCount - 1);
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

  const bindRelationTextarea = bindAutoResize(relationList, '.relation-textarea');

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
    if (relationCount === 0) return;
    if (removeLastRow(relationList, RELATION_HEADER_COUNT, RELATION_ROW_SIZE)) relationCount = Math.max(0, relationCount - 1);
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
  // 3. 保存データの組み立てと反映(JSONファイル・サーバーへの保存・共有リンクは sheet-common.js)
  // ──────────────────────────────
  /** 現在の入力内容からセーブデータ(JSON化可能なオブジェクト)を構築 */
  const buildSaveData = () => {
    const data = { inputs: {}, checkboxes: {}, ougi: [], ninpo: [], relations: [], image: savedImageBase64 };

    document.querySelectorAll('input[type="text"], input[type="number"], select, textarea').forEach(el => {
      // 一覧パネル(ログイン・検索)の入力と、タグの入力欄(タグは tags に入れる)は保存しない
      if (el.closest('#history_panel') || el.id === 'tag_input') return;
      if (el.id === 'reveal_password' || el.id === 'reveal_password_prompt_input') return;
      // 行を増減できる欄(奥義・忍法・背景・関係・忍具)は、下でそれぞれの配列に入れるので、inputs には入れない
      if (/^(ougi_|ninpo_|haikei_|relation_|ningu_item_)/.test(el.name || '')) return;
      data.inputs[el.id || el.name] = el.value;
    });
    data.tags = [...characterTags];
    document.querySelectorAll('input[type="checkbox"]').forEach(el => {
      if (!el.id.startsWith('relation_secret_') && !el.id.startsWith('relation_ougi_') && !el.id.startsWith('relation_location_') && !el.id.startsWith('relation_emotion_sign_')) {
        data.checkboxes[el.id] = el.checked;
      }
    });
    data.ougi = collectOugi().filter(row => !isEmptyOugiRow(row));
    data.ninpo = collectNinpo().filter(row => !isEmptyNinpoRow(row));
    data.haikei = collectHaikei().filter(row => !isEmptyHaikeiRow(row));
    data.relations = collectRelations().filter(row => !isEmptyRelationRow(row));
    data.ningu = collectNingu().filter(row => !isEmptyNinguRow(row));
    const revealPasswordInput = document.getElementById('reveal_password');
    data.revealPassword = revealPasswordInput ? revealPasswordInput.value : '';
    return data;
  };

  /** フォームの入力欄(隠す欄のパスワードを含む)・チェック状態・画像・タグを初期状態にクリアする(applyLoadedData/resetCharacterFormで共有) */
  const clearCharacterForm = () => {
    document.querySelectorAll('input[type="text"], input[type="number"], select, textarea').forEach(el => {
      if (el.closest('#history_panel') || el.id === 'reveal_password_prompt_input') return;
      if (/^(ougi_|ninpo_|haikei_|relation_|ningu_item_)/.test(el.name || '')) return;
      if (el.tagName === 'SELECT') el.selectedIndex = 0;
      else el.value = '';
    });
    document.querySelectorAll('.skill-check, .gap-check').forEach(cb => { cb.checked = false; });
    document.querySelectorAll('.damage-check').forEach(el => { el.dataset.state = '0'; });
    clearCharacterImage();
    characterTags = [];
    renderTagChips();
  };

  /** セーブデータ(JSON)を現在のフォームへ反映(前のキャラの残留を防ぐため、まず全体をクリアしてから適用) */
  const applyLoadedData = (data) => {
    clearCharacterForm();

    applyInputsAndCheckboxes(data);
    characterTags = normalizeTags(data.tags);
    renderTagChips();
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
      // 奥義が1件も無いデータを読み込むと行が0件になり欄ごと消えて見えるため、
      // 新規作成時と同様に空の行を1つ残す
      if (document.querySelectorAll('.ougi-textarea[name^="ougi_name_"]').length === 0) addOugiRow();
    }
    // 忍法はテキスト入力中でも表に入れる(テキスト入力の欄は、この関数の最後に表から作り直す)
    if (data.ninpo) {
      clearNinpoGridRows();
      data.ninpo.filter(row => !isEmptyNinpoRow(row)).forEach(row => addNinpoRow(row, { skipResize: true }));
      resizeNinpoGridRows();
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
      // 背景が1件も無いデータを読み込むと行が0件になり欄ごと消えて見えるため、
      // 新規作成時と同様に空の行を1つ残す
      if (document.querySelectorAll('.haikei-textarea[name^="haikei_name_"]').length === 0) addHaikeiRow();
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
      // 関係が1件も無いデータを読み込むと行が0件になり欄ごと消えて見えるため、
      // 新規作成時と同様に空の行を1つ残す
      if (document.querySelectorAll('.relation-textarea[name^="relation_name_"]').length === 0) addRelationRow();
    }
    // 忍具の自由記述の行。前のキャラの行を残さないよう、データに無くても必ず作り直す。
    // 以前の「その他」欄に値があるデータは、その内容を1行目にする
    clearNinguRows();
    const legacyNingu = legacyNinguOtherRow(data.inputs?.ningu_other);
    [...(legacyNingu ? [legacyNingu] : []), ...(Array.isArray(data.ningu) ? data.ningu : [])]
      .filter(row => !isEmptyNinguRow(row))
      .forEach(row => addNinguRow(row));
    if (data.image) showLoadedImage(data.image);
    const revealPasswordInput = document.getElementById('reveal_password');
    if (revealPasswordInput) revealPasswordInput.value = data.revealPassword || '';
    if (ninpoInputMode === 'text') syncNinpoTextFromGrid();
    applyCharacterKindUI();
    syncTabTitle();
    refreshOwnerPasswordUI();
  };

  // ──────────────────────────────
  // 3b. 共有用の圧縮データ形式(キー名を持たない位置配列化・短縮キー化)
  // ──────────────────────────────
  const NINPO_ORDER = ['name', 'type', 'skill', 'range', 'cost', 'effect', 'ref'];
  const OUGI_ORDER = ['name', 'skill', 'kaizou', 'effect'];
  const HAIKEI_ORDER = ['name', 'merit', 'cost', 'effect', 'ref'];
  const NINGU_ORDER = ['name', 'count'];
  // ningu_other(no)は以前の「その他」欄。今は保存しないが、古いデータを読むために残している
  const INPUT_KEY_MAP = {
    name: 'n', furigana: 'fu', age: 'a', gender: 'g', school: 'sc', sub_school: 'ss', rank: 'rk',
    join_condition: 'jc', manner: 'mn', nemesis: 'nm', face: 'fc', belief: 'bl', points: 'pt', life_extra: 'le', char_kind: 'kd',
    setting: 'st', ningu_hyorogan: 'nh', ningu_jintsumaru: 'nj',
    ningu_tonkofu: 'nt', ningu_other: 'no', special_skill: 'sp',
  };
  const INPUT_KEY_MAP_REV = Object.fromEntries(Object.entries(INPUT_KEY_MAP).map(([k, v]) => [v, k]));
  const rowsToArrays = (rows, order) => rows.map(row => trimTrailingEmpty(order.map(k => row[k] || '')));
  const arraysToRows = (arrs, order) => arrs.map(arr => {
    const row = {};
    order.forEach((k, i) => { row[k] = arr[i] || ''; });
    return row;
  });

  /** 共有用にキー名を持たない最小構造へ変換 */
  const compactifyForShare = (data) => {
    const compact = compactInputsAndChecks(data, INPUT_KEY_MAP);
    if (data.ougi && data.ougi.length) compact.og = rowsToArrays(data.ougi, OUGI_ORDER);
    if (data.ninpo && data.ninpo.length) compact.np = rowsToArrays(data.ninpo, NINPO_ORDER);
    if (data.haikei && data.haikei.length) compact.hk = rowsToArrays(data.haikei, HAIKEI_ORDER);
    if (data.relations && data.relations.length) {
      compact.rl = data.relations.map(r => {
        const mask = (r.location ? 1 : 0) | (r.secret ? 2 : 0) | (r.ougi ? 4 : 0) | (r.emotion_sign ? 8 : 0);
        return trimTrailingEmpty([r.name || '', mask, r.emotion || '']);
      });
    }
    if (data.ningu && data.ningu.length) compact.ng = rowsToArrays(data.ningu, NINGU_ORDER);
    if (data.revealPassword) compact.pw = data.revealPassword;
    if (data.tags && data.tags.length) compact.tg = data.tags;
    return compact;
  };

  /** compactifyForShareの逆変換(applyLoadedDataが読める形へ復元) */
  const expandFromShare = (compact = {}) => {
    const data = { ...expandInputsAndChecks(compact, INPUT_KEY_MAP_REV), ougi: [], ninpo: [], haikei: [], relations: [] };
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
    if (Array.isArray(compact.ng)) data.ningu = arraysToRows(compact.ng, NINGU_ORDER);
    if (compact.pw) data.revealPassword = compact.pw;
    if (Array.isArray(compact.tg)) data.tags = compact.tg;
    return data;
  };

  /** キャラクターシートを新規作成用に初期状態へリセットする */
  const resetCharacterForm = () => {
    clearCharacterForm();
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

    clearNinguRows();

    currentCharacterId = null;
    history.replaceState(null, '', window.location.pathname + window.location.search);
    applyCharacterKindUI();
    syncTabTitle();
    refreshOwnerPasswordUI();
  };

  // ──────────────────────────────
  // 4. ココフォリア用コピー
  // ──────────────────────────────
  const copyNameBtn = document.getElementById('copy_name_btn');
  const nameInput = document.getElementById('name');

  if (copyNameBtn && nameInput) {
    copyNameBtn.addEventListener('click', () => {
      const nameValue = nameInput.value;
      if (!nameValue) { showToast('名前が入力されていません。'); return; }
      const furiganaValue = getFieldValue('furigana');
      const ccfoliaName = furiganaValue ? `${nameValue}(${furiganaValue})` : nameValue;

      let commands = 'ーーー特技ーーー\n';
      getCheckedSkillsByColumn().forEach(cb => {
        commands += `SG>=5 《${cb.value}》\n`;
      });
      const specialSkill = getFieldValue('special_skill');
      if (specialSkill) commands += `\n特記: ${specialSkill}\n`;

      commands += '\nーーー忍法ーーー\n';
      collectNinpo({ includeDisabled: false }).forEach(np => {
        const effectOneLine = np.effect.replace(/\r?\n/g, '');
        if (np.name) commands += `【${np.name}】(${np.type}/指定特技:${np.skill}/間合:${np.range}/コスト:${np.cost}/参照p:${np.ref})　効果:${effectOneLine}\n`;
      });

      commands += `\nーーー表ーーー
ST　通常シーン表
FT　ファンブル表
RTT　ランダム特技決定表
ET　感情表
WT　変調表
GWT　戦国変調表`;

      // 忍具の各欄(兵糧丸・神通丸・遁甲符・自由記述の行)の数字の合計
      const ninguTotal = getNinguTotal();

      // シノビガミ用ステータス配列(エネミーは分野ごとの生命力を持たないので、生命力と忍具だけ)
      const life = Number(getFieldValue('life_extra', '0'));
      const statusArr = getCharacterKind() === 'enemy' ? [
        { label: '生命力', value: life, max: life },
        { label: '忍具', value: ninguTotal, max: 6 }
      ] : [
        { label: '器術', value: Number(getFieldValue('kijutsu', '1')), max: Number(getFieldValue('kijutsu', '1')) },
        { label: '体術', value: Number(getFieldValue('taijutsu', '1')), max: Number(getFieldValue('taijutsu', '1')) },
        { label: '忍術', value: Number(getFieldValue('ninjutsu', '1')), max: Number(getFieldValue('ninjutsu', '1')) },
        { label: '謀術', value: Number(getFieldValue('boujutsu', '1')), max: Number(getFieldValue('boujutsu', '1')) },
        { label: '戦術', value: Number(getFieldValue('senjutsu', '1')), max: Number(getFieldValue('senjutsu', '1')) },
        { label: '妖術', value: Number(getFieldValue('youjutsu', '1')), max: Number(getFieldValue('youjutsu', '1')) },
        { label: '追加', value: Number(getFieldValue('life_extra', '0')), max: Number(getFieldValue('life_extra', '0')) },
        { label: '忍具', value: ninguTotal, max: 6 }
      ];

      const paramsArr = [
        // { label: '功績点', value: String(getFieldValue('points', '0')) }
      ];

      const ccfoliaData = {
        kind: 'character',
        data: { name: ccfoliaName, initiative: 0, commands, status: statusArr, params: paramsArr, externalUrl: copyShareLink() || '' }
      };

      navigator.clipboard.writeText(JSON.stringify(ccfoliaData))
        .then(() => showToast('ココフォリア用のキャラクターデータをクリップボードにコピーしました！\nそのままココフォリアの盤面で Ctrl+V してください。'))
        .catch(err => { console.error('コピーに失敗しました', err); showToast('コピーに失敗しました。'); });
    });
  }

  // ──────────────────────────────
  // 4b. 隠すトグル
  // ──────────────────────────────
  const hideToggleBtn = document.getElementById('hide_toggle_btn');
  const ougiSection = document.getElementById('ougi_section');
  const ninguSection = document.getElementById('ningu_section');
  const revealPasswordOwnerRow = document.getElementById('reveal_password_owner_row');
  const copyRevealPasswordBtn = document.getElementById('copy_reveal_password_btn');
  const revealPasswordModal = document.getElementById('reveal_password_modal');
  const revealPasswordPromptInput = document.getElementById('reveal_password_prompt_input');
  const revealPasswordSubmitBtn = document.getElementById('reveal_password_submit_btn');
  const revealPasswordCancelBtn = document.getElementById('reveal_password_cancel_btn');

  const ICON_ATTRS = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
  const ICON_EYE = `<svg ${ICON_ATTRS}><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"/><circle cx="12" cy="12" r="3"/></svg>`;
  const ICON_EYE_SLASH = `<svg ${ICON_ATTRS}><path d="M3 3l18 18"/><path d="M10.6 5.2C11.05 5.07 11.52 5 12 5c7 0 11 7 11 7a19.7 19.7 0 0 1-3.22 4.06M6.5 6.6C3.6 8.4 1 12 1 12s4 7 11 7c1.3 0 2.5-.22 3.6-.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>`;

  /** ログイン中ユーザーが現在のキャラの所有者かどうか(マイキャラ一覧に含まれるかで判定) */
  const isOwnerOfCurrentCharacter = () =>
    !!getAuthToken() && myCharactersCache.some(c => c.id === currentCharacterId);

  /** 所有者向けのパスワード設定/コピー欄の表示・非表示を更新する */
  const refreshOwnerPasswordUI = () => {
    if (!revealPasswordOwnerRow) return;
    const canEdit = !currentCharacterId || isOwnerOfCurrentCharacter();
    revealPasswordOwnerRow.style.display = canEdit ? '' : 'none';
  };

  let isHidden = true;
  const setRevealState = (hidden) => {
    isHidden = hidden;
    document.body.classList.toggle('hidden-mode', isHidden);
    // 隠している間は黒塗りの下の入力欄にTabで入れないよう inert にする
    if (ougiSection) { ougiSection.classList.toggle('hideable-section', isHidden); ougiSection.dataset.hideLabel = '奥義'; ougiSection.inert = isHidden; }
    if (ninguSection) { ninguSection.classList.toggle('hideable-section', isHidden); ninguSection.dataset.hideLabel = '忍具'; ninguSection.inert = isHidden; }
    if (hideToggleBtn) hideToggleBtn.innerHTML = isHidden ? `${ICON_EYE}表示する` : `${ICON_EYE_SLASH}隠す`;
  };

  const openRevealPasswordModal = () => {
    if (!revealPasswordModal) return;
    if (revealPasswordPromptInput) revealPasswordPromptInput.value = '';
    revealPasswordModal.classList.add('is-open');
    revealPasswordModal.setAttribute('aria-hidden', 'false');
    if (revealPasswordPromptInput) revealPasswordPromptInput.focus();
  };
  const closeRevealPasswordModal = () => {
    if (!revealPasswordModal) return;
    revealPasswordModal.classList.remove('is-open');
    revealPasswordModal.setAttribute('aria-hidden', 'true');
  };

  const trySubmitRevealPassword = () => {
    const revealPasswordInput = document.getElementById('reveal_password');
    const correctPassword = revealPasswordInput ? revealPasswordInput.value : '';
    const entered = revealPasswordPromptInput ? revealPasswordPromptInput.value : '';
    if (entered !== correctPassword) {
      showToast('パスワードが違います。');
      return;
    }
    if (currentCharacterId) localStorage.setItem(`sinobigami_unlocked_${currentCharacterId}`, '1');
    closeRevealPasswordModal();
    setRevealState(false);
  };

  if (revealPasswordSubmitBtn) revealPasswordSubmitBtn.addEventListener('click', trySubmitRevealPassword);
  if (revealPasswordPromptInput) {
    revealPasswordPromptInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); trySubmitRevealPassword(); }
    });
  }
  if (revealPasswordCancelBtn) revealPasswordCancelBtn.addEventListener('click', closeRevealPasswordModal);
  if (revealPasswordModal) {
    revealPasswordModal.addEventListener('click', (e) => { if (e.target === revealPasswordModal) closeRevealPasswordModal(); });
  }

  if (copyRevealPasswordBtn) {
    copyRevealPasswordBtn.addEventListener('click', async () => {
      const revealPasswordInput = document.getElementById('reveal_password');
      const password = revealPasswordInput ? revealPasswordInput.value : '';
      if (!password) { showToast('パスワードが設定されていません。'); return; }
      try {
        if (!navigator.clipboard || !navigator.clipboard.writeText) {
          throw new Error('Clipboard API is not available');
        }
        await navigator.clipboard.writeText(password);
        showToast('パスワードをクリップボードにコピーしました！');
      } catch (err) {
        console.error('クリップボードへのコピーに失敗しました', err);
        prompt('クリップボードへのコピーに失敗しました。以下のパスワードを手動でコピーしてください:', password);
      }
    });
  }

  if (hideToggleBtn) {
    // 初期状態で隠す(所有者・記憶済みでも自動表示はしない)
    setRevealState(true);

    hideToggleBtn.addEventListener('click', () => {
      if (!isHidden) {
        setRevealState(true);
        return;
      }
      const revealPasswordInput = document.getElementById('reveal_password');
      const password = revealPasswordInput ? revealPasswordInput.value : '';
      const unlocked = currentCharacterId && localStorage.getItem(`sinobigami_unlocked_${currentCharacterId}`) === '1';
      if (!password || isOwnerOfCurrentCharacter() || unlocked) {
        setRevealState(false);
        return;
      }
      openRevealPasswordModal();
    });
  }

  // 共通の処理(キャラ一覧・保存・共有リンク)に、シノビガミの保存データの扱いを登録し、共有リンクなら読み込む
  initSheetCommon({
    buildSaveData,
    applyLoadedData,
    compactifyForShare,
    expandFromShare,
    resetCharacterForm,
    jsonFileLabel: 'シノビガミCS',
    // 自分のキャラかどうかで、隠す欄のパスワード設定の表示が変わる
    onMyCharactersLoaded: refreshOwnerPasswordUI,
  });
  refreshOwnerPasswordUI();
  if (getAuthToken()) renderMyCharacters();

  // ──────────────────────────────
  // 5. キャラシ画像の中身(生成とコピーは sheet-common.js の initSheetImageOutput)
  // ──────────────────────────────
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
    const lifeLabel = CHARACTER_KINDS[getCharacterKind()].lifeLabel;
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
      items: collectNingu().filter(row => !isEmptyNinguRow(row))
    };
    const hasNingu = ninguData.hyorogan || ninguData.jintsumaru || ninguData.tonkofu || ninguData.items.length;
    let ninguHTML = '';
    if (hasNingu) {
      ninguHTML = '<table class="pv-table"><thead><tr><th>忍具</th><th>個数</th></tr></thead><tbody>';
      if (ninguData.hyorogan) ninguHTML += `<tr><td>兵糧丸</td><td>${ninguData.hyorogan}</td></tr>`;
      if (ninguData.jintsumaru) ninguHTML += `<tr><td>神通丸</td><td>${ninguData.jintsumaru}</td></tr>`;
      if (ninguData.tonkofu) ninguHTML += `<tr><td>遁甲符</td><td>${ninguData.tonkofu}</td></tr>`;
      ninguData.items.forEach(row => {
        ninguHTML += `<tr><td>${escapeHTML(row.name || 'その他')}</td><td>${escapeHTML(row.count)}</td></tr>`;
      });
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
              <dt>ふりがな</dt><dd>${v('furigana')}</dd>
              <dt>上位流派</dt><dd>${v('school')}</dd>
              <dt>流派</dt><dd>${v('sub_school')}</dd>
              <dt>階級</dt><dd>${v('rank')}</dd>
              <dt>信念</dt><dd>${v('belief')}</dd>
              <dt>性別</dt><dd>${v('gender')}</dd>
              <dt>年齢</dt><dd>${v('age')}</dd>
              <dt>表の顔</dt><dd>${v('face')}</dd>
              <dt>加入条件</dt><dd>${v('join_condition')}</dd>
              <dt>流儀</dt><dd>${v('manner')}</dd>
              <dt>仇敵</dt><dd>${v('nemesis')}</dd>
              <dt>功績点</dt><dd>${v('points')}</dd>
            </dl>
          </div>
          <div class="pv-section">
            <h2>${lifeLabel}</h2>
            <dl class="pv-dl">
              <dt>${lifeLabel}</dt><dd>${v('life_extra')}</dd>
            </dl>
          </div>
        </div>
        <div class="pv-col">
          <div class="pv-section">
            <h2>背景</h2>
            ${imageSrc ? `<div class="pv-image-wrap"><img src="${escapeHTML(imageSrc)}" class="pv-image" alt="背景画像" /></div>` : ''}
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

  initSheetImageOutput({ buildPreviewHTML, busyHTML: `${ICON_SPINNER}生成中...`, fallbackBackground: '#f4ede0' });
}); // end DOMContentLoaded