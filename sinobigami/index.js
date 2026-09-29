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

// ==========================================
// PC表示モード切り替え（特技/忍法を中央に、その他を左右に配置）
// ==========================================
(() => {
  const LAYOUT_STORAGE_KEY = 'sinobigami_layout';
  const btn = document.getElementById('layout_toggle_btn');
  if (!btn) return;

  const ICON_LAYOUT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="9" y1="4" x2="9" y2="20"/><line x1="15" y1="4" x2="15" y2="20"/></svg>';

  const applyLayout = (mode) => {
    if (mode === 'pc') {
      document.documentElement.setAttribute('data-layout', 'pc');
      btn.innerHTML = `${ICON_LAYOUT}通常表示に戻す`;
    } else {
      document.documentElement.removeAttribute('data-layout');
      btn.innerHTML = `${ICON_LAYOUT}PC表示に切替`;
    }
  };

  const saved = localStorage.getItem(LAYOUT_STORAGE_KEY) || 'normal';
  applyLayout(saved);

  btn.addEventListener('click', () => {
    const current = localStorage.getItem(LAYOUT_STORAGE_KEY) || 'normal';
    const next = current === 'pc' ? 'normal' : 'pc';
    localStorage.setItem(LAYOUT_STORAGE_KEY, next);
    applyLayout(next);
    // 列の幅が変わるので、忍法などのテキストエリアの高さを新しい幅で計算し直す
    resyncAllTextareaHeights();
  });
})();

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

// ==========================================
// タブタイトルをキャラ名に同期
// ==========================================
const syncTabTitle = (() => {
  const DEFAULT_TITLE = document.title;
  return () => {
    const val = document.getElementById('name')?.value.trim();
    document.title = val || DEFAULT_TITLE;
  };
})();
document.getElementById('name')?.addEventListener('input', syncTabTitle);
syncTabTitle();

// --- 共通ヘルパー ---

/** 非ブロッキングのトースト通知を表示する */
const showToast = (message, duration = 2600) => {
  let container = document.getElementById('toast_container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast_container';
    container.className = 'toast-container';
    container.setAttribute('aria-live', 'polite');
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('is-visible'));
  setTimeout(() => {
    toast.classList.remove('is-visible');
    setTimeout(() => toast.remove(), 400);
  }, duration);
};

/** ID または name で要素を探し、値を返す */
const getFieldValue = (key, fallback = '') => {
  const el = document.getElementById(key) || document.querySelector(`[name="${key}"]`);
  return el ? (el.value || fallback) : fallback;
};

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

/**
 * キャラのタグ(基本情報の「タグ」)。1〜20文字・完全一致の重複なし・5個まで(APIの一覧の要約も同じ上限)。
 * 保存データでは tags、短縮形では tg。共有リンクを開いた人にも見える。
 */
const MAX_TAGS = 5;
const MAX_TAG_LENGTH = 20;
let characterTags = [];

/** タグの配列を、前後の空白なし・1〜20文字・重複なし・5個までに整える */
const normalizeTags = (list) => {
  const tags = [];
  (Array.isArray(list) ? list : []).forEach(tag => {
    if (typeof tag !== 'string') return;
    const trimmed = tag.trim();
    const length = [...trimmed].length;
    if (length < 1 || length > MAX_TAG_LENGTH || tags.includes(trimmed) || tags.length >= MAX_TAGS) return;
    tags.push(trimmed);
  });
  return tags;
};

const renderTagChips = () => {
  const chips = document.getElementById('tag_chips');
  if (!chips) return;
  chips.innerHTML = characterTags.map((tag, i) =>
    `<span class="tag-chip">${escapeHTML(tag)}<button type="button" class="tag-chip-remove" data-tag-index="${i}" title="タグを外す" aria-label="タグを外す">×</button></span>`
  ).join('');
};

/** タグを1つ足す。足せた(または空・付いていた)ら true、上限で足せなければ知らせて false */
const addTag = (text) => {
  const tag = String(text || '').trim();
  if (!tag || characterTags.includes(tag)) return true;
  if ([...tag].length > MAX_TAG_LENGTH) {
    showToast(`タグは${MAX_TAG_LENGTH}文字までです。`);
    return false;
  }
  if (characterTags.length >= MAX_TAGS) {
    showToast(`タグは${MAX_TAGS}個までです。`);
    return false;
  }
  characterTags = [...characterTags, tag];
  renderTagChips();
  return true;
};

/** タグごとの使っている数を、多い順(同じ数なら名前順)の [タグ, 数] の配列にする */
const tagUsage = (characters) => {
  const counts = new Map();
  characters.forEach(c => (Array.isArray(c.tags) ? c.tags : []).forEach(tag => counts.set(tag, (counts.get(tag) || 0) + 1)));
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ja'));
};

/**
 * タグの入力候補(自分のキャラで使っているタグ)。キャラの要約の一覧を返す関数は、ログインと一覧の処理の側で登録する
 * (tagSuggestionProvider。未ログインなら空)。
 */
let tagSuggestionProvider = null;
const refreshTagSuggestions = async () => {
  const datalist = document.getElementById('tag_suggestions');
  if (!datalist || !tagSuggestionProvider) return;
  const characters = await tagSuggestionProvider();
  datalist.innerHTML = tagUsage(characters)
    .filter(([tag]) => !characterTags.includes(tag))
    .map(([tag]) => `<option value="${escapeHTML(tag).replace(/"/g, '&quot;')}"></option>`)
    .join('');
};

const tagInput = document.getElementById('tag_input');
if (tagInput) {
  tagInput.addEventListener('keydown', (e) => {
    // 日本語入力の変換確定のEnterは無視する(keyCode 229 は変換中を示す古いブラウザ向け)
    if (e.key !== 'Enter' || e.isComposing || e.keyCode === 229) return;
    e.preventDefault();
    if (addTag(tagInput.value)) {
      tagInput.value = '';
      refreshTagSuggestions();
    }
  });
  tagInput.addEventListener('focus', refreshTagSuggestions);
  // 入力したまま離れたときも足す
  tagInput.addEventListener('change', () => {
    if (addTag(tagInput.value)) tagInput.value = '';
  });
}
document.getElementById('tag_chips')?.addEventListener('click', (e) => {
  const btn = e.target.closest('.tag-chip-remove');
  if (!btn) return;
  characterTags = characterTags.filter((_, i) => i !== Number(btn.dataset.tagIndex));
  renderTagChips();
});

/** 習得済み特技のチェックボックスを、列が若い順(同じ列なら行が若い順)に並べて返す */
const getCheckedSkillsByColumn = () => {
  const pos = (cb) => {
    const m = /^skill_r(\d+)_c(\d+)$/.exec(cb.id);
    return m ? { r: Number(m[1]), c: Number(m[2]) } : { r: Infinity, c: Infinity };
  };
  return Array.from(document.querySelectorAll('.skill-check:checked')).sort((a, b) => {
    const pa = pos(a), pb = pos(b);
    return pa.c - pb.c || pa.r - pb.r;
  });
};

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

const parseNinpoText = (text = '') => normalizeNinpoText(text)
  .split(/\n{2,}/)
  .map(block => block.trim())
  .filter(block => block)
  .map(parseNinpoBlock);

const serializeNinpoText = (rows = []) => rows.map(serializeNinpoBlock).filter(Boolean).join('\n\n');

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

/** 習得済み特技IDリストを返す */
const getAcquiredSkillIds = () => {
  const ids = [];
  document.querySelectorAll('.skill-check:checked').forEach(cb => ids.push(cb.id));
  return ids;
};

/** テキストエリア行の高さ同期 */
const resizeTextareaRow = (container, selector, rowId) => {
  const rowTextareas = container.querySelectorAll(`${selector}[data-row="${rowId}"]`);
  if (!rowTextareas.length) return;
  // PC表示モードでページ切り替え中など非表示（display:none）のときは scrollHeight が
  // 常に0になり、高さ0で固定されてしまうため、表示されるまで計算をスキップする
  if (container.offsetParent === null) return;
  rowTextareas.forEach(ta => { ta.style.height = 'auto'; });
  let maxHeight = 0;
  rowTextareas.forEach(ta => { maxHeight = Math.max(maxHeight, ta.scrollHeight); });
  rowTextareas.forEach(ta => { ta.style.height = `${maxHeight}px`; });
};

/**
 * 行の高さを自動で合わせるテキストエリア(data-row を持つもの)を、すべて今の幅で計算し直す。
 * 高さはその時の幅に合わせた px で固定しているので、PC表示の切り替えやウィンドウの幅が変わったときに呼ぶ
 * (呼ばないと、幅が広がって余白が大きすぎたり、狭まって下が見切れたりする)。
 * 泡立たない input イベントを送るので、各テキストエリアの高さ合わせだけが動く。
 */
const resyncAllTextareaHeights = () => {
  document.querySelectorAll('textarea[data-row]').forEach(ta => ta.dispatchEvent(new Event('input')));
};
let textareaResyncTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(textareaResyncTimer);
  textareaResyncTimer = setTimeout(resyncAllTextareaHeights, 150);
});

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

/** HTML エスケープ */
const escapeHTML = (str) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * 一覧用の立ち絵のサムネイルを作る。切らずに全体を縮小し(長い辺を THUMB_MAX_SIDE 以下に。拡大はしない)、
 * WebP(作れないブラウザでは PNG)にする。THUMB_MAX_BYTES(APIの上限と同じ)以下にならなければ null。
 */
const THUMB_MAX_SIDE = 128;
const THUMB_MAX_BYTES = 64 * 1024;
const createThumbnail = async (blob) => {
  let source;
  try {
    source = await createImageBitmap(blob);
  } catch {
    source = await new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(blob);
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('画像を読み込めませんでした')); };
      img.src = url;
    });
  }
  const width = source.naturalWidth || source.width;
  const height = source.naturalHeight || source.height;
  const scale = Math.min(1, THUMB_MAX_SIDE / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext('2d');
  context.imageSmoothingQuality = 'high';
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  if (source.close) source.close();

  const toBlob = (type, quality) => new Promise(resolve => canvas.toBlob(resolve, type, quality));
  for (const quality of [0.85, 0.7, 0.5]) {
    const webp = await toBlob('image/webp', quality);
    if (!webp || webp.type !== 'image/webp') break; // WebP を作れないブラウザ
    if (webp.size <= THUMB_MAX_BYTES) return webp;
  }
  const png = await toBlob('image/png');
  return png && png.size <= THUMB_MAX_BYTES ? png : null;
};

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
  // 3. セーブ・ロード・共有リンク
  // ──────────────────────────────
  const saveBtn = document.getElementById('save_data_btn');
  const loadFile = document.getElementById('load_data_file');
  const shareBtn = document.getElementById('share_link_btn');
  let savedImageBase64 = null;
  // 今の立ち絵が、どのキャラの /api/image/<id> から読み込んだものか(ファイルを選んだ・JSONから読んだときは null)。
  // 保存先のキャラと同じなら、保存のときに画像を送り直さない
  let imageSourceId = null;

  imageInput.addEventListener('change', () => {
    imageSourceId = null;
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
      // 一覧パネル(ログイン・検索)の入力と、タグの入力欄(タグは tags に入れる)は保存しない
      if (el.closest('#history_panel') || el.id === 'tag_input') return;
      if (el.id === 'reveal_password' || el.id === 'reveal_password_prompt_input') return;
      if (!el.name.startsWith('ougi_') && !el.name.startsWith('ninpo_') && !el.name.startsWith('relation_')) {
        data.inputs[el.id || el.name] = el.value;
      }
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
    const revealPasswordInput = document.getElementById('reveal_password');
    data.revealPassword = revealPasswordInput ? revealPasswordInput.value : '';
    return data;
  };

  /** セーブデータ(JSON)を現在のフォームへ反映 */
  const applyLoadedData = (data) => {
    document.querySelectorAll('input[type="text"], input[type="number"], select, textarea').forEach(el => {
      if (el.closest('#history_panel')) return;
      if (el.id === 'reveal_password' || el.id === 'reveal_password_prompt_input') return;
      if (/^(ougi_|ninpo_|haikei_|relation_)/.test(el.name || '')) return;
      if (el.tagName === 'SELECT') el.selectedIndex = 0;
      else el.value = '';
    });
    document.querySelectorAll('.skill-check, .gap-check').forEach(cb => { cb.checked = false; });
    document.querySelectorAll('.damage-check').forEach(el => { el.dataset.state = '0'; });
    savedImageBase64 = null;
    // 画像の出どころは、読み込んだ側(共有リンクなら、そのキャラのID)が設定し直す
    imageSourceId = null;
    clearPreview();
    const revealPasswordInput = document.getElementById('reveal_password');
    if (revealPasswordInput) revealPasswordInput.value = '';

    if (data.inputs) {
      for (const [key, value] of Object.entries(data.inputs)) {
        const el = document.getElementById(key) || document.querySelector(`[name="${key}"]`);
        if (el) el.value = value;
      }
    }
    characterTags = normalizeTags(data.tags);
    renderTagChips();
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
    if (data.image) {
      savedImageBase64 = data.image;
      imagePreview.src = data.image;
      imagePreview.classList.add('is-visible');
      imageEmpty.hidden = true;
    }
    if (revealPasswordInput) revealPasswordInput.value = data.revealPassword || '';
    if (ninpoInputMode === 'text') syncNinpoTextFromGrid();
    applyCharacterKindUI();
    syncTabTitle();
    refreshOwnerPasswordUI();
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
          showToast('データの読み込みが完了しました！');
        } catch (error) {
          console.error(error);
          showToast('データの読み込みに失敗しました。');
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

  // --- 共有リンク用のデータ圧縮(キー名を持たない位置配列化・短縮キー化) ---
  const NINPO_ORDER = ['name', 'type', 'skill', 'range', 'cost', 'effect', 'ref'];
  const OUGI_ORDER = ['name', 'skill', 'kaizou', 'effect'];
  const HAIKEI_ORDER = ['name', 'merit', 'cost', 'effect', 'ref'];
  const INPUT_KEY_MAP = {
    name: 'n', furigana: 'fu', age: 'a', gender: 'g', school: 'sc', sub_school: 'ss', rank: 'rk',
    join_condition: 'jc', manner: 'mn', nemesis: 'nm', face: 'fc', belief: 'bl', points: 'pt', life_extra: 'le', char_kind: 'kd',
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
    if (data.revealPassword) compact.pw = data.revealPassword;
    if (data.tags && data.tags.length) compact.tg = data.tags;
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
    if (compact.pw) data.revealPassword = compact.pw;
    if (Array.isArray(compact.tg)) data.tags = compact.tg;
    return data;
  };
  
// localhostで開いたときは、ローカルのAPI(sinobigami-api の npm run dev)に接続する(本番APIはlocalhostを許可していない)
const API_BASE = ['localhost', '127.0.0.1'].includes(location.hostname)
  ? 'http://localhost:8787'
  : 'https://sinobigami-api.kasu-kasu.workers.dev';
const CURRENT_GAME = 'sinobigami';
const GAME_LABEL = { sinobigami: 'シノビガミ', magirogi: 'マギロギ' };
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

const LIST_TRASH_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>';
const LIST_FOLDER_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>';
const LIST_CARET_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';

/** 立ち絵の無いキャラの行に出す、人形のアイコン */
const LIST_PERSON_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="7" r="4"/><path d="M5 21v-1a7 7 0 0 1 14 0v1"/></svg>';

/** 一覧のキャラを開くページのURL(そのキャラのゲームのキャラシに #id= を付ける) */
const characterPageHref = (id, game) => {
  const g = game === 'sinobigami' || game === 'magirogi' ? game : CURRENT_GAME;
  return `../${g}/index.html#id=${encodeURIComponent(id)}`;
};

/**
 * 一覧のキャラ1行分のHTML(ゲスト履歴とマイキャラで共用。folderId があればフォルダの中の行)。
 * 名前は、行全体に広げたリンクにする(右クリックの「新しいタブで開く」や Ctrl+クリックで別タブに開けるように)。
 * 普通のクリックは一覧のクリック処理が受け取って、今までどおりこのタブで開く。行のドラッグを邪魔しないよう、リンク自体はドラッグさせない
 * showThumb なら(ログイン中の一覧)、左にサムネイルの枠を出し、右は「ゲーム・タグ」「名前」の2行にする
 */
const buildListItemHTML = (h) => {
  const date = new Date(h.updatedAt);
  const dateStr = isNaN(date) ? '' : date.toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const badge = (h.game ? `<span class="history-item-game-badge badge-${h.game}">${GAME_LABEL[h.game] || h.game}</span>` : '')
    + (h.kind === 'enemy' ? '<span class="history-item-kind-badge">エネミー</span>' : '');

  const deleteBtn = h.deletable
    ? `<button type="button" class="history-item-delete" data-delete-id="${h.id}" data-delete-type="${h.deleteType || 'local'}" title="削除">${LIST_TRASH_ICON}</button>`
    : '';
  const dragAttrs = h.draggable ? ' draggable="true"' : '';
  const folderAttr = h.folderId ? ` data-parent-folder="${h.folderId}"` : '';
  const tags = Array.isArray(h.tags) && h.tags.length
    ? `<div class="history-item-tags">${h.tags.map(tag => `<span class="history-item-tag">${escapeHTML(tag)}</span>`).join('')}</div>`
    : '';
  // ログイン中の一覧だけ、立ち絵のサムネイル(切らずに枠に収める。無ければ人形のアイコン)を出す。
  // URL に版を付けて長くキャッシュさせるので、描き直しでは読み込み直さない。読み込めなければ枠だけにする
  const thumb = !h.showThumb ? '' : (h.thumb
    ? `<span class="history-item-thumb"><img src="${API_BASE}/api/thumb/${encodeURIComponent(h.id)}?v=${encodeURIComponent(h.thumb)}" alt="" loading="lazy" width="48" height="48" onerror="this.remove()"></span>`
    : `<span class="history-item-thumb is-empty">${LIST_PERSON_ICON}</span>`);
  // サムネイルのある行(ログイン中の一覧)は、1行目にゲームのバッジとタグ、2行目に名前を出す(保存日時は出さない)。
  // タグが多いときは1行に収まる分だけ見せ、全部はツールチップで示す
  const name = `<a class="history-item-link" href="${characterPageHref(h.id, h.game)}" draggable="false">${escapeHTML(h.name || '(名前未設定)')}</a>`;
  const info = h.showThumb
    ? `<div class="history-item-meta"${Array.isArray(h.tags) && h.tags.length ? ` title="${escapeHTML(h.tags.join(' / ')).replace(/"/g, '&quot;')}"` : ''}>${badge}${(Array.isArray(h.tags) ? h.tags : []).map(tag => `<span class="history-item-tag">${escapeHTML(tag)}</span>`).join('')}</div>
          <div class="history-item-name">${name}</div>`
    : `<div class="history-item-name">${badge}${name}</div>
          ${tags}
          <div class="history-item-date">${dateStr}</div>`;
  return `
      <div class="history-item${h.draggable ? ' is-draggable' : ''}${h.showThumb ? ' has-thumb' : ''}" data-id="${h.id}" data-game="${h.game || ''}"${folderAttr}${dragAttrs}>
        ${thumb}
        <div class="history-item-info">
          ${info}
        </div>
        ${deleteBtn}
      </div>`;
};

/** 一覧を描画する共通処理 */
const renderListItems = (items) => {
  const listEl = document.getElementById('history_list');
  if (!listEl) return;
  if (items.length === 0) {
    listEl.innerHTML = '<p class="history-empty">データがありません</p>';
    return;
  }
  listEl.innerHTML = items.map(buildListItemHTML).join('');
};

/** ゲスト履歴を描画する */
const renderGuestHistory = () => {
  const title = document.getElementById('history_list_title');
  if (title) title.textContent = 'ゲスト履歴';
  const tabs = document.getElementById('game_filter_tabs');
  if (tabs) tabs.style.display = 'none';
  const newFolderBtn = document.getElementById('new_folder_btn');
  if (newFolderBtn) newFolderBtn.style.display = 'none';
  const search = document.getElementById('list_search');
  if (search) search.style.display = 'none';
  editingFolder = null;
  const items = getHistory()
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .map(h => ({ ...h, deletable: true }));
  renderListItems(items);
};

/** ログイン中ユーザーのキャラ一覧をサーバーから取得して描画する */
let myLayoutItems = []; // サーバーで並び順を適用したツリー(/api/my-layout の items。フォルダを含む)
let myCharactersCache = []; // myLayoutItems を並び順どおりに平らにしたキャラの一覧
let myLayoutSavedItems = []; // サーバーに保存済みのツリー(並び順の保存に失敗したときに戻す先)
let gameFilter = localStorage.getItem('characterListFilter') || 'all';

/** レイアウトのツリーを、並び順どおりのキャラの一覧にする(フォルダ・サブフォルダの中身も含める) */
const flattenLayoutItems = (items) => items.flatMap(item => item.type === 'folder' ? flattenLayoutItems(item.items) : [item]);

/** レイアウトのツリーからキャラを1体取り除く */
const removeFromLayoutItems = (items, id) => items
  .filter(item => item.type === 'folder' || item.id !== id)
  .map(item => item.type === 'folder' ? { ...item, items: removeFromLayoutItems(item.items, id) } : item);

/** フォルダを探し、{ folder, parent }(1段目なら parent は null)を返す。無ければ null */
const findLayoutFolder = (items, id, parent = null) => {
  for (const item of items) {
    if (item.type !== 'folder') continue;
    if (item.id === id) return { folder: item, parent };
    const found = findLayoutFolder(item.items, id, item);
    if (found) return found;
  }
  return null;
};

/** フォルダの数(サブフォルダも含める) */
const countLayoutFolders = (items) => items.reduce((sum, item) => item.type === 'folder' ? sum + 1 + countLayoutFolders(item.items) : sum, 0);

/** ドラッグで並べ替えられる環境か(PCのマウス操作のみ。タッチ端末では並べ替えない) */
const canReorderByDrag = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

/** 絞り込みタブで表示するキャラか */
const matchesGameFilter = (c) => gameFilter === 'all' || c.game === gameFilter;

/**
 * フォルダの種別(APIと同じ)。シノビガミ用・マギロギ用にはそのゲームのキャラだけが入り、一般には両方入る。
 * サブフォルダの種別は親に合わせる(親が一般なら自由)。フォルダは2段まで。
 */
const FOLDER_KIND_LABEL = { general: '一般', sinobigami: 'シノビガミ', magirogi: 'マギロギ' };
const GENERAL_FOLDER_KIND = 'general';
const folderKind = (folder) => FOLDER_KIND_LABEL[folder.kind] ? folder.kind : GENERAL_FOLDER_KIND;

/** 絞り込みタブで表示するフォルダか(シノビガミ用はシノビガミと「すべて」、マギロギ用はマギロギと「すべて」、一般はいつも) */
const folderMatchesGameFilter = (folder) => gameFilter === 'all' || folderKind(folder) === GENERAL_FOLDER_KIND || folderKind(folder) === gameFilter;

/** フォルダにそのキャラを入れられるか */
const canFolderHoldCharacter = (folder, c) => folderKind(folder) === GENERAL_FOLDER_KIND || folderKind(folder) === c.game;

/** 種別 kind のフォルダを、parent の中(サブフォルダ)に置けるか */
const canParentHoldFolderKind = (parent, kind) => folderKind(parent) === GENERAL_FOLDER_KIND || folderKind(parent) === kind;

/** フォルダが、サブフォルダを持っているか */
const hasSubfolders = (folder) => folder.items.some(item => item.type === 'folder');

/** 開いているフォルダのID(ブラウザごとに記憶する。両アプリで共通のキー) */
const OPEN_FOLDERS_KEY = 'characterListOpenFolders';
const getOpenFolderIds = () => {
  try {
    const ids = JSON.parse(localStorage.getItem(OPEN_FOLDERS_KEY) || '[]');
    return new Set(Array.isArray(ids) ? ids : []);
  } catch {
    return new Set();
  }
};
const setFolderOpen = (folderId, open) => {
  const ids = getOpenFolderIds();
  if (open) ids.add(folderId); else ids.delete(folderId);
  try {
    localStorage.setItem(OPEN_FOLDERS_KEY, JSON.stringify([...ids]));
  } catch {}
};

/** フォルダの上限(APIと同じ) */
const MAX_FOLDERS = 100;
const MAX_FOLDER_NAME_LENGTH = 30;
const LIST_PENCIL_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>';

const LIST_FOLDER_PLUS_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M12 11v4M10 13h4"/></svg>';

/**
 * 名前を編集中のフォルダ({ id, isNew, parentId, draft, draftKind })。
 * isNew は作成中でまだツリーに無いもの、parentId はサブフォルダを作るときの親(1段目なら null)。
 */
let editingFolder = null;
let isRenderingMyLayout = false;

/** 新しいフォルダのID */
const newFolderId = () => `f${crypto.randomUUID().replaceAll('-', '').slice(0, 12)}`;

/** ツリーの中の folderId のフォルダを、fn(フォルダ) の結果に置き換える */
const updateLayoutFolder = (items, folderId, fn) => items.map(item => {
  if (item.type !== 'folder') return item;
  if (item.id === folderId) return fn(item);
  return { ...item, items: updateLayoutFolder(item.items, folderId, fn) };
});

/** ツリーからフォルダを取り除く */
const removeLayoutFolder = (items, folderId) => items
  .filter(item => item.type !== 'folder' || item.id !== folderId)
  .map(item => item.type === 'folder' ? { ...item, items: removeLayoutFolder(item.items, folderId) } : item);

/** フォルダに選べる種別(中のキャラ・サブフォルダと、親に合うもの)。parent は親フォルダ(1段目なら null) */
const allowedFolderKinds = (folder, parent) => Object.keys(FOLDER_KIND_LABEL).filter(kind => {
  if (parent && !canParentHoldFolderKind(parent, kind)) return false;
  if (kind === GENERAL_FOLDER_KIND) return true;
  return folder.items.every(child => child.type === 'folder' ? folderKind(child) === kind : child.game === kind);
});

/** 新しいフォルダの種別の初期値(親が一般以外なら親と同じ。それ以外は絞り込みタブのゲーム、「すべて」なら一般) */
const defaultFolderKind = (parent) => {
  if (parent && folderKind(parent) !== GENERAL_FOLDER_KIND) return folderKind(parent);
  return FOLDER_KIND_LABEL[gameFilter] ? gameFilter : GENERAL_FOLDER_KIND;
};

/**
 * 一覧の検索条件(名前・ふりがな、タグ、シノビガミの区分)。ブラウザには記憶しない。
 * ゲームの絞り込みタブと組み合わせる(すべて AND)。検索中は、一致するキャラを含むフォルダだけを開いて表示し、
 * ドラッグとフォルダの編集はしない。
 */
const listSearch = { text: '', tags: new Set(), kind: 'all' };

/** 検索用に文字を揃える(NFKC で全角/半角をまとめ、小文字にし、カタカナをひらがなにする) */
const normalizeSearchText = (value) => String(value || '')
  .normalize('NFKC')
  .toLowerCase()
  .replace(/[ァ-ヶ]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60));

/** 区分の絞り込み(マギロギのタブでは区分が無いので効かせない) */
const activeKindFilter = () => (gameFilter === 'magirogi' ? 'all' : listSearch.kind);
const isListSearchActive = () => !!listSearch.text.trim() || listSearch.tags.size > 0 || activeKindFilter() !== 'all';

/** 検索条件に合うキャラか(名前かふりがなの部分一致・選んだタグをすべて持つ・区分) */
const matchesListSearch = (c) => {
  const query = normalizeSearchText(listSearch.text.trim());
  if (query && !normalizeSearchText(c.name).includes(query) && !normalizeSearchText(c.furigana).includes(query)) return false;
  const tags = Array.isArray(c.tags) ? c.tags : [];
  for (const tag of listSearch.tags) {
    if (!tags.includes(tag)) return false;
  }
  const kind = activeKindFilter();
  if (kind !== 'all' && (c.game !== 'sinobigami' || (c.kind || 'shinobi') !== kind)) return false;
  return true;
};

/** 検索欄の表示を条件に合わせる(タグのチップ・区分の選択の表示・クリアボタン) */
const renderListSearch = () => {
  const kindSelect = document.getElementById('list_search_kind');
  if (kindSelect) {
    kindSelect.hidden = gameFilter === 'magirogi';
    kindSelect.value = listSearch.kind;
  }
  const clearBtn = document.getElementById('list_search_clear');
  if (clearBtn) clearBtn.disabled = !isListSearchActive();
  const tagsEl = document.getElementById('list_search_tags');
  if (!tagsEl) return;
  // 使っているタグ(多い順、同じ数なら名前順)。選んだまま使われなくなったタグも出す
  const tags = tagUsage(myCharactersCache).map(([tag]) => tag);
  listSearch.tags.forEach(tag => { if (!tags.includes(tag)) tags.push(tag); });
  tagsEl.hidden = tags.length === 0;
  tagsEl.innerHTML = tags.map(tag =>
    `<button type="button" class="list-search-tag${listSearch.tags.has(tag) ? ' is-active' : ''}" data-tag="${encodeURIComponent(tag)}" aria-pressed="${listSearch.tags.has(tag)}">${escapeHTML(tag)}</button>`
  ).join('');
};

/**
 * フォルダ1行分のHTML。count は絞り込み後のキャラの数(サブフォルダの中も含む)。
 * opts: depth(段。1か2) / parentId(親フォルダのID) / editing(名前を入力欄にする。編集中はドラッグしない) /
 *       kindOptions・selectedKind(編集中の種別の選択肢と選択) / draggable / canAddSub(サブフォルダ作成ボタンを出す) /
 *       readOnly(検索中。編集のボタンを出さない)
 */
const buildFolderHTML = (folder, count, isOpen, opts = {}) => {
  const { depth = 1, parentId = null, editing = false, kindOptions = [], selectedKind = GENERAL_FOLDER_KIND, draggable = false, canAddSub = false, readOnly = false } = opts;
  const isEmpty = folder.items.length === 0;
  const kind = folderKind(folder);
  const nameHTML = editing
    ? `<input type="text" class="history-folder-input" maxlength="${MAX_FOLDER_NAME_LENGTH}" placeholder="フォルダ名(Enterで確定 / Escで取消)" aria-label="フォルダ名" />
        <select class="history-folder-kind" aria-label="フォルダの種別">${kindOptions.map(k => `<option value="${k}"${k === selectedKind ? ' selected' : ''}>${FOLDER_KIND_LABEL[k]}</option>`).join('')}</select>`
    : `<span class="history-folder-name">${escapeHTML(folder.name)}</span>`;
  // 種別はフォルダの絵の色で示す(シノビガミ=橙、マギロギ=青、一般=黒。色は CSS の .kind-*)。編集中は選んでいる種別の色
  const iconKind = editing && FOLDER_KIND_LABEL[selectedKind] ? selectedKind : kind;
  const iconTitle = iconKind === GENERAL_FOLDER_KIND ? '一般フォルダ' : `${FOLDER_KIND_LABEL[iconKind]}用フォルダ`;
  const full = countLayoutFolders(myLayoutItems) >= MAX_FOLDERS;
  const addSubBtn = canAddSub
    ? `<button type="button" class="history-folder-add-sub" title="${full ? `フォルダはサブフォルダも含めて${MAX_FOLDERS}個までです` : 'サブフォルダを作成'}" aria-disabled="${full}">${LIST_FOLDER_PLUS_ICON}</button>`
    : '';
  // 中身があるフォルダの削除ボタンは、理由をツールチップで示すため disabled ではなく aria-disabled にする
  const actions = editing || readOnly ? '' : `${addSubBtn}
        <button type="button" class="history-folder-rename" title="名前・種別を変更">${LIST_PENCIL_ICON}</button>
        <button type="button" class="history-folder-delete" title="${isEmpty ? 'フォルダを削除' : '中にキャラクターやサブフォルダがいるフォルダは削除できません'}" aria-disabled="${!isEmpty}">${LIST_TRASH_ICON}</button>`;
  const parentAttr = parentId ? ` data-parent-folder="${parentId}"` : '';
  const canDrag = draggable && !editing;
  return `
      <div class="history-folder kind-${iconKind}${isOpen ? ' is-open' : ''}${editing ? ' is-editing' : ''}${canDrag ? ' is-draggable' : ''}" data-folder-id="${folder.id}" data-depth="${depth}"${parentAttr} role="button" tabindex="0" aria-expanded="${isOpen}"${canDrag ? ' draggable="true"' : ''}>
        <span class="history-folder-caret">${LIST_CARET_ICON}</span>
        <span class="history-folder-icon" title="${iconTitle}" role="img" aria-label="${iconTitle}">${LIST_FOLDER_ICON}</span>
        ${nameHTML}
        <span class="history-folder-count">${count}</span>${actions}
      </div>`;
};

/** ログイン中のキャラ一覧を、フォルダ(2段まで)を含むツリーとして描画する(絞り込み中も、そのタブで見えるフォルダは表示する) */
const renderMyLayoutList = () => {
  const listEl = document.getElementById('history_list');
  if (!listEl) return;
  // 描き直しで入力中の名前と種別が消えないよう、下書きとして控える
  const currentInput = listEl.querySelector('.history-folder-input');
  if (editingFolder && currentInput) editingFolder.draft = currentInput.value;
  const currentKind = listEl.querySelector('.history-folder-kind');
  if (editingFolder && currentKind) editingFolder.draftKind = currentKind.value;

  // 検索中は、一致するキャラを含むフォルダだけを開いて表示し、ドラッグとフォルダの編集はしない(開閉の記憶は変えない)
  const searching = isListSearchActive();
  const isVisibleCharacter = (c) => matchesGameFilter(c) && matchesListSearch(c);
  const draggable = canReorderByDrag() && !searching;
  const openIds = getOpenFolderIds();
  const charRow = (c, folderId) => buildListItemHTML({ ...c, deletable: true, deleteType: 'server', folderId, draggable, showThumb: true });
  // 作成中のフォルダの行(parent の中。1段目なら parent は null)
  const newFolderRow = (parent, depth) => {
    if (!editingFolder || !editingFolder.isNew || editingFolder.parentId !== (parent ? parent.id : null)) return '';
    const kindOptions = allowedFolderKinds({ items: [] }, parent);
    return buildFolderHTML({ id: editingFolder.id, name: '', items: [] }, 0, false, {
      depth, parentId: parent ? parent.id : null, editing: true, kindOptions,
      selectedKind: kindOptions.includes(editingFolder.draftKind) ? editingFolder.draftKind : kindOptions[0],
    });
  };

  const renderFolder = (folder, depth, parent) => {
    const count = flattenLayoutItems(folder.items).filter(isVisibleCharacter).length;
    if (searching && count === 0) return '';
    const isOpen = searching || openIds.has(folder.id);
    const editing = !searching && !!editingFolder && !editingFolder.isNew && editingFolder.id === folder.id;
    const kindOptions = editing ? allowedFolderKinds(folder, parent) : [];
    const draftKind = editing ? editingFolder.draftKind : null;
    const row = buildFolderHTML(folder, count, isOpen, {
      depth, parentId: parent ? parent.id : null, editing, draggable, canAddSub: depth === 1, readOnly: searching,
      kindOptions, selectedKind: kindOptions.includes(draftKind) ? draftKind : folderKind(folder),
    });
    if (!isOpen) return row;
    const children = (searching ? '' : newFolderRow(folder, depth + 1)) + folder.items.map(child => {
      if (child.type === 'folder') return folderMatchesGameFilter(child) ? renderFolder(child, depth + 1, folder) : '';
      return isVisibleCharacter(child) ? charRow(child, folder.id) : '';
    }).join('');
    return row + `<div class="history-folder-children" data-folder-id="${folder.id}">${children || '<p class="history-folder-empty">キャラクターがいません</p>'}</div>`;
  };
  const html = (searching ? '' : newFolderRow(null, 1)) + myLayoutItems.map(item => {
    if (item.type === 'folder') return folderMatchesGameFilter(item) ? renderFolder(item, 1, null) : '';
    return isVisibleCharacter(item) ? charRow(item, null) : '';
  }).join('');
  const emptyMessage = searching ? '条件に合うキャラクターがいません' : 'データがありません';
  // 入力欄を描き直しで取り除くときの focusout は、編集の終了として扱わない
  isRenderingMyLayout = true;
  listEl.innerHTML = html || `<p class="history-empty">${emptyMessage}</p>`;
  isRenderingMyLayout = false;
  renderListSearch();

  const newFolderBtn = document.getElementById('new_folder_btn');
  if (newFolderBtn) {
    const full = countLayoutFolders(myLayoutItems) >= MAX_FOLDERS;
    newFolderBtn.disabled = full || searching;
    newFolderBtn.title = full ? `フォルダはサブフォルダも含めて${MAX_FOLDERS}個までです` : (searching ? '検索中はフォルダを作れません' : '');
  }

  const input = listEl.querySelector('.history-folder-input');
  if (editingFolder && input) {
    const found = findLayoutFolder(myLayoutItems, editingFolder.id);
    input.value = editingFolder.draft ?? (found ? found.folder.name : '');
    input.focus();
    input.select();
  }
};

/** 名前を付けて作成・名前の変更を始める */
const startNewFolder = () => {
  if (editingFolder) return document.querySelector('#history_list .history-folder-input')?.focus();
  if (countLayoutFolders(myLayoutItems) >= MAX_FOLDERS) return;
  editingFolder = { id: newFolderId(), isNew: true, parentId: null, draft: null, draftKind: defaultFolderKind(null) };
  renderMyLayoutList();
  const listEl = document.getElementById('history_list');
  if (listEl) listEl.scrollTop = 0;
};
/** 1段目のフォルダの中に、サブフォルダを作り始める(親を開き、中の先頭に入力欄を出す) */
const startNewSubfolder = (parentId) => {
  if (editingFolder) return document.querySelector('#history_list .history-folder-input')?.focus();
  if (countLayoutFolders(myLayoutItems) >= MAX_FOLDERS) {
    showToast(`フォルダはサブフォルダも含めて${MAX_FOLDERS}個までです。`);
    return;
  }
  const found = findLayoutFolder(myLayoutItems, parentId);
  if (!found || found.parent) return;
  setFolderOpen(parentId, true);
  editingFolder = { id: newFolderId(), isNew: true, parentId, draft: null, draftKind: defaultFolderKind(found.folder) };
  renderMyLayoutList();
};
const startRenameFolder = (folderId) => {
  if (editingFolder) finishFolderEdit(true);
  editingFolder = { id: folderId, isNew: false, parentId: null, draft: null, draftKind: null };
  renderMyLayoutList();
};

/**
 * 名前(と種別)の編集を終える。commit なら入力した名前・選んだ種別で作成・変更して保存する。
 * 名前が空のとき(Escや、空のまま入力欄から離れたとき)は取り消す。
 */
const finishFolderEdit = (commit) => {
  const editing = editingFolder;
  if (!editing) return;
  const row = document.querySelector('#history_list .history-folder.is-editing');
  const input = row && row.querySelector('.history-folder-input');
  const select = row && row.querySelector('.history-folder-kind');
  const name = (input ? input.value : (editing.draft || '')).trim();
  const selectedKind = select ? select.value : editing.draftKind;
  editingFolder = null;

  const valid = commit && name && [...name].length <= MAX_FOLDER_NAME_LENGTH;
  if (!valid) return renderMyLayoutList();
  if (editing.isNew) {
    const parent = editing.parentId ? findLayoutFolder(myLayoutItems, editing.parentId) : null;
    if (editing.parentId && !parent) return renderMyLayoutList();
    const kinds = allowedFolderKinds({ items: [] }, parent && parent.folder);
    const created = { type: 'folder', id: editing.id, name, kind: kinds.includes(selectedKind) ? selectedKind : kinds[0], items: [] };
    myLayoutItems = parent
      ? updateLayoutFolder(myLayoutItems, editing.parentId, f => ({ ...f, items: [created, ...f.items] }))
      : [created, ...myLayoutItems];
  } else {
    const found = findLayoutFolder(myLayoutItems, editing.id);
    if (!found) return renderMyLayoutList();
    const kind = allowedFolderKinds(found.folder, found.parent).includes(selectedKind) ? selectedKind : folderKind(found.folder);
    if (found.folder.name === name && folderKind(found.folder) === kind) return renderMyLayoutList();
    myLayoutItems = updateLayoutFolder(myLayoutItems, editing.id, f => ({ ...f, name, kind }));
  }
  renderMyLayoutList();
  saveMyLayout();
};

/** 空のフォルダを削除する(中にキャラやサブフォルダがいるときは知らせて何もしない) */
const deleteFolder = (folderId) => {
  const found = findLayoutFolder(myLayoutItems, folderId);
  if (!found) return;
  if (found.folder.items.length > 0) {
    showToast('中にキャラクターやサブフォルダがいるフォルダは削除できません。先に外に出してください。');
    return;
  }
  myLayoutItems = removeLayoutFolder(myLayoutItems, folderId);
  setFolderOpen(folderId, false);
  renderMyLayoutList();
  saveMyLayout();
};

/** フォルダを開閉する(検索中は、一致を含むフォルダをすべて開いて見せるので開閉しない) */
const toggleFolder = (folderId) => {
  if (isListSearchActive()) return;
  setFolderOpen(folderId, !getOpenFolderIds().has(folderId));
  renderMyLayoutList();
};

const applyGameFilter = () => {
  renderMyLayoutList();
};

/**
 * ツリーを、保存用のIDだけの形(PUT /api/my-layout の本文。レイアウト v2)にする。
 * フォルダの中は、キャラIDの文字列かサブフォルダ({type:"folder", id, name, kind, items})。
 */
const toLayoutPayload = (items) => {
  const folderPayload = (folder) => ({
    type: 'folder', id: folder.id, name: folder.name, kind: folderKind(folder),
    items: folder.items.map(child => child.type === 'folder' ? folderPayload(child) : child.id),
  });
  return {
    v: 2,
    items: items.map(item => item.type === 'folder' ? folderPayload(item) : { type: 'character', id: item.id }),
  };
};

/**
 * 並び順をサーバーに保存する。保存中に並べ替えられたら、終わってから最新の状態をもう一度送る。
 * 失敗したら、最後に保存できた並び順に戻して知らせる。
 */
let isSavingMyLayout = false;
let pendingMyLayout = null;
const saveMyLayout = async () => {
  pendingMyLayout = myLayoutItems;
  if (isSavingMyLayout) return;
  isSavingMyLayout = true;
  while (pendingMyLayout) {
    const items = pendingMyLayout;
    pendingMyLayout = null;
    try {
      const res = await fetch(`${AUTH_API_BASE}/api/my-layout`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken()}` },
        body: JSON.stringify(toLayoutPayload(items)),
      });
      if (!res.ok) throw new Error('並び順の保存に失敗しました');
      myLayoutSavedItems = items;
    } catch (err) {
      console.error(err);
      pendingMyLayout = null;
      myLayoutItems = myLayoutSavedItems;
      myCharactersCache = flattenLayoutItems(myLayoutItems);
      applyGameFilter();
      showToast('一覧の変更を保存できなかったため、元に戻しました。');
    }
  }
  isSavingMyLayout = false;
};

/**
 * キャラかフォルダ(drag: { kind: 'character'|'folder', id })を移動して保存する。drop は次のどれか。
 *   { ref: { kind, id }, place: 'before'|'after' } … その行の前後(フォルダの中の行なら、そのフォルダの中)
 *   { into: フォルダID, position: 'start'|'end' }   … フォルダ(どの段でも)の中の先頭/末尾
 *   { rootEnd: true }                                … 一覧(フォルダの外)の末尾
 * ツリーから取り除いて差し込むだけなので、ほかの項目(絞り込みで隠れたキャラも含む)の相対順は変わらない。
 * 種別の合わないフォルダへの移動と、2段を超える移動(サブフォルダを持つフォルダを入れる、サブフォルダの中へ入れる)はしない。
 */
const moveLayoutItem = (drag, drop) => {
  let moved = null;
  const take = (items) => items.flatMap(item => {
    const isFolder = item.type === 'folder';
    if (isFolder === (drag.kind === 'folder') && item.id === drag.id) {
      moved = item;
      return [];
    }
    return isFolder ? [{ ...item, items: take(item.items) }] : [item];
  });
  const rest = take(myLayoutItems);
  if (!moved) return;

  // parent(フォルダ。null なら一覧のいちばん外)の中に、動かしたものを置けるか
  const canPlace = (parent) => {
    if (!parent) return true;
    if (drag.kind === 'character') return canFolderHoldCharacter(parent, moved);
    const isRoot = rest.some(item => item.type === 'folder' && item.id === parent.id);
    return isRoot && !hasSubfolders(moved) && canParentHoldFolderKind(parent, folderKind(moved));
  };

  let next = null;
  if (drop.rootEnd) {
    next = [...rest, moved];
  } else if (drop.into) {
    const found = findLayoutFolder(rest, drop.into);
    if (!found || !canPlace(found.folder)) return;
    next = updateLayoutFolder(rest, drop.into, f => ({ ...f, items: drop.position === 'start' ? [moved, ...f.items] : [...f.items, moved] }));
  } else if (drop.ref) {
    const offset = drop.place === 'after' ? 1 : 0;
    const isRef = (item) => (item.type === 'folder' ? 'folder' : 'character') === drop.ref.kind && item.id === drop.ref.id;
    // ref の行がある配列に差し込む。見つからなければ undefined、置けなければ null
    const insertNextTo = (items, parent) => {
      const index = items.findIndex(isRef);
      if (index >= 0) {
        if (!canPlace(parent)) return null;
        const copy = [...items];
        copy.splice(index + offset, 0, moved);
        return copy;
      }
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type !== 'folder') continue;
        const inner = insertNextTo(item.items, item);
        if (inner === undefined) continue;
        if (inner === null) return null;
        const copy = [...items];
        copy[i] = { ...item, items: inner };
        return copy;
      }
      return undefined;
    };
    next = insertNextTo(rest, null) || null;
  }
  if (!next) return;
  if (JSON.stringify(toLayoutPayload(next)) === JSON.stringify(toLayoutPayload(myLayoutItems))) return;

  myLayoutItems = next;
  myCharactersCache = flattenLayoutItems(myLayoutItems);
  applyGameFilter();
  saveMyLayout();
};

/** サーバー上のキャラクターを削除する */
const deleteCharacterFromServer = async (id) => {
  try {
    const res = await fetch(`${API_BASE}/api/character/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    });
    if (!res.ok) throw new Error('削除に失敗しました');
    myLayoutItems = removeFromLayoutItems(myLayoutItems, id);
    myLayoutSavedItems = removeFromLayoutItems(myLayoutSavedItems, id);
    myCharactersCache = flattenLayoutItems(myLayoutItems);
    applyGameFilter();
    if (currentCharacterId === id) {
      currentCharacterId = null;
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  } catch (err) {
    console.error(err);
    alert('削除に失敗しました。');
  }
};

const renderMyCharacters = async () => {
  const title = document.getElementById('history_list_title');
  if (title) title.textContent = 'あなたのキャラクター';
  const tabs = document.getElementById('game_filter_tabs');
  if (tabs) tabs.style.display = '';
  const newFolderBtn = document.getElementById('new_folder_btn');
  if (newFolderBtn) newFolderBtn.style.display = '';
  const search = document.getElementById('list_search');
  if (search) search.style.display = '';
  const listEl = document.getElementById('history_list');
  if (listEl) listEl.innerHTML = '<p class="history-empty">読み込み中...</p>';

  try {
    const res = await fetch(`${AUTH_API_BASE}/api/my-layout?v=2`, {
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    });
    if (!res.ok) throw new Error('取得に失敗しました');
    myLayoutItems = (await res.json()).items;
    myLayoutSavedItems = myLayoutItems;
    myCharactersCache = flattenLayoutItems(myLayoutItems);
    applyGameFilter();
    refreshOwnerPasswordUI();
    backfillThumbnails();
  } catch (err) {
    console.error(err);
    if (listEl) listEl.innerHTML = '<p class="history-empty">読み込みに失敗しました</p>';
  }
};

/**
 * 立ち絵はあるのにサムネイルが無いキャラ(サムネイルの導入前に保存した・古いフロントで立ち絵を変えた)について、
 * 1体ずつ元の画像を読み込んでサムネイルを作って送り、できた行から表示を変える。
 * 同時に1つだけ動かし、同じページで失敗したキャラは2度は試さない。ログアウトしたら止める。
 */
const backfillFailedIds = new Set();
let isBackfillingThumbnails = false;
const backfillThumbnails = async () => {
  if (isBackfillingThumbnails) return;
  isBackfillingThumbnails = true;
  try {
    for (;;) {
      if (!getAuthToken()) break;
      const target = myCharactersCache.find(c => c.hasImage && !c.thumb && !backfillFailedIds.has(c.id));
      if (!target) break;
      let version = null;
      try {
        const res = await fetch(`${API_BASE}/api/image/${encodeURIComponent(target.id)}`);
        if (!res.ok) throw new Error(`立ち絵を読み込めませんでした(${res.status})`);
        version = await uploadThumbnail(target.id, await res.blob());
      } catch (err) {
        console.warn('サムネイルを作れませんでした', target.id, err);
      }
      if (!version) {
        backfillFailedIds.add(target.id);
        continue;
      }
      const withThumb = (items) => items.map(item => item.type === 'folder'
        ? { ...item, items: withThumb(item.items) }
        : (item.id === target.id ? { ...item, thumb: version } : item));
      myLayoutItems = withThumb(myLayoutItems);
      myLayoutSavedItems = withThumb(myLayoutSavedItems);
      myCharactersCache = flattenLayoutItems(myLayoutItems);
      // ドラッグ中に描き直すと、動かしている行が消えるので待つ(次に描き直すときに反映される)
      if (!document.querySelector('#history_list .is-dragging')) renderMyLayoutList();
    }
  } finally {
    isBackfillingThumbnails = false;
  }
};

/**
 * キャラシのタグの入力候補に使う、自分のキャラの要約の一覧(未ログインなら空)。
 * 一覧パネルをまだ開いていなければ、一覧を1回だけ取得する。
 */
let tagSuggestionFetch = null;
tagSuggestionProvider = async () => {
  if (!getAuthToken()) return [];
  if (myCharactersCache.length) return myCharactersCache;
  if (!tagSuggestionFetch) {
    tagSuggestionFetch = fetch(`${AUTH_API_BASE}/api/my-layout?v=2`, { headers: { Authorization: `Bearer ${getAuthToken()}` } })
      .then(res => (res.ok ? res.json() : { items: [] }))
      .then(json => flattenLayoutItems(json.items || []))
      .catch(() => []);
  }
  return tagSuggestionFetch;
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

const newFolderBtn = document.getElementById('new_folder_btn');
if (newFolderBtn) newFolderBtn.addEventListener('click', startNewFolder);

const gameFilterTabs = document.getElementById('game_filter_tabs');
if (gameFilterTabs) {
  gameFilterTabs.querySelectorAll('.game-filter-tab').forEach(b => b.classList.toggle('is-active', b.dataset.filter === gameFilter));
  gameFilterTabs.addEventListener('click', (e) => {
    const btn = e.target.closest('.game-filter-tab');
    if (!btn) return;
    gameFilter = btn.dataset.filter;
    localStorage.setItem('characterListFilter', gameFilter);
    gameFilterTabs.querySelectorAll('.game-filter-tab').forEach(b => b.classList.toggle('is-active', b === btn));
    applyGameFilter();
  });
}

// 一覧の検索(名前・ふりがな、タグ、区分)。条件を変えるたびに描き直す
const listSearchName = document.getElementById('list_search_name');
if (listSearchName) {
  listSearchName.addEventListener('input', () => {
    listSearch.text = listSearchName.value;
    renderMyLayoutList();
  });
}
const listSearchKind = document.getElementById('list_search_kind');
if (listSearchKind) {
  listSearchKind.addEventListener('change', () => {
    listSearch.kind = listSearchKind.value;
    renderMyLayoutList();
  });
}
const listSearchTags = document.getElementById('list_search_tags');
if (listSearchTags) {
  listSearchTags.addEventListener('click', (e) => {
    const btn = e.target.closest('.list-search-tag');
    if (!btn) return;
    const tag = decodeURIComponent(btn.dataset.tag);
    if (listSearch.tags.has(tag)) listSearch.tags.delete(tag); else listSearch.tags.add(tag);
    renderMyLayoutList();
  });
}
const listSearchClear = document.getElementById('list_search_clear');
if (listSearchClear) {
  listSearchClear.addEventListener('click', () => {
    listSearch.text = '';
    listSearch.tags.clear();
    listSearch.kind = 'all';
    if (listSearchName) listSearchName.value = '';
    renderMyLayoutList();
  });
}

const openHistoryPanel = () => {
  if (!historyPanel) return;
  updateAuthUI();
  historyPanel.classList.add('is-open');
  historyPanel.setAttribute('aria-hidden', 'false');
  if (historyToggleBtn) {
    historyToggleBtn.setAttribute('aria-expanded', 'true');
    historyToggleBtn.classList.add('is-open');
    historyToggleBtn.style.right = `${historyPanel.getBoundingClientRect().width}px`;
  }
};

const closeHistoryPanel = () => {
  if (!historyPanel) return;
  historyPanel.classList.remove('is-open');
  historyPanel.setAttribute('aria-hidden', 'true');
  if (historyToggleBtn) {
    historyToggleBtn.setAttribute('aria-expanded', 'false');
    historyToggleBtn.classList.remove('is-open');
    historyToggleBtn.style.right = '0';
  }
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
      const type = delBtn.dataset.deleteType;
      if (type === 'server') {
        if (!confirm('このキャラクターを削除します。この操作は取り消せません。よろしいですか？')) return;
        deleteCharacterFromServer(delBtn.dataset.deleteId);
      } else {
        removeFromHistory(delBtn.dataset.deleteId);
        renderGuestHistory();
      }
      return;
    }
    const folderRow = e.target.closest('.history-folder');
    if (folderRow) {
      if (e.target.closest('.history-folder-add-sub')) startNewSubfolder(folderRow.dataset.folderId);
      else if (e.target.closest('.history-folder-rename')) startRenameFolder(folderRow.dataset.folderId);
      else if (e.target.closest('.history-folder-delete')) deleteFolder(folderRow.dataset.folderId);
      else if (!folderRow.classList.contains('is-editing')) toggleFolder(folderRow.dataset.folderId);
      return;
    }
    const item = e.target.closest('.history-item');
    if (item) {
      // Ctrl/⌘/Shift+クリックは、名前のリンクをブラウザがそのまま開く(別タブ・別ウィンドウ)。Alt+クリックはリンクの保存になるので、普通のクリックと同じに扱う
      if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey) return;
      e.preventDefault();
      const game = item.dataset.game;
      if (game && game !== CURRENT_GAME) {
        const targetPath = game === 'sinobigami' ? '../sinobigami/index.html' : '../magirogi/index.html';
        window.location.href = `${targetPath}#id=${item.dataset.id}`;
        return;
      }
      window.location.hash = `id=${item.dataset.id}`;
      window.location.reload();
    }
  });

  // フォルダ名の入力欄と種別の選択: Enterで確定(名前が空なら何もしない)、Escで取り消し、
  // 行から離れたら確定(名前が空なら取り消し)。同じ行の入力欄と種別の選択の間の移動は、編集を続ける
  const FOLDER_EDIT_FIELDS = '.history-folder-input, .history-folder-kind';
  // 種別を選び直したら、フォルダの絵の色をすぐに変える
  historyListEl.addEventListener('change', (e) => {
    if (!e.target.matches('.history-folder-kind')) return;
    const row = e.target.closest('.history-folder');
    Object.keys(FOLDER_KIND_LABEL).forEach(k => row.classList.toggle(`kind-${k}`, k === e.target.value));
  });
  historyListEl.addEventListener('keydown', (e) => {
    // 日本語入力の変換確定のEnterは無視する(keyCode 229 は変換中を示す古いブラウザ向け)
    if (!e.target.matches(FOLDER_EDIT_FIELDS) || e.isComposing || e.keyCode === 229) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      const input = e.target.closest('.history-folder').querySelector('.history-folder-input');
      if (input && input.value.trim()) finishFolderEdit(true);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      finishFolderEdit(false);
    }
  });
  historyListEl.addEventListener('focusout', (e) => {
    if (!e.target.matches(FOLDER_EDIT_FIELDS) || isRenderingMyLayout) return;
    const row = e.target.closest('.history-folder');
    if (row && e.relatedTarget && row.contains(e.relatedTarget)) return;
    finishFolderEdit(true);
  });

  // フォルダ行はキーボード(Enter/Space)でも開閉できる
  historyListEl.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const folderRow = e.target.closest('.history-folder');
    if (!folderRow || e.target !== folderRow) return;
    e.preventDefault();
    toggleFolder(folderRow.dataset.folderId);
    historyListEl.querySelector(`.history-folder[data-folder-id="${folderRow.dataset.folderId}"]`)?.focus();
  });

  // ドラッグで並べ替え・フォルダへの出し入れをする(ログイン中の一覧・PCのみ。行に draggable が付いているときだけ動く)
  // { kind: 'character', id, game, grabOffset, height } か { kind: 'folder', id, folderKind, hasSub, grabOffset, height }
  let dragging = null;

  /** 動かしている行が、フォルダ行の高さのこの割合以上に被ったらフォルダの中へ入れる */
  const FOLDER_DROP_OVERLAP = 0.5;

  /** 動かしているものを、parentId のフォルダの中(null なら一覧のいちばん外)に置けるか(種別と2段の制限) */
  const canPlaceUnder = (parentId) => {
    if (!parentId) return true;
    const found = findLayoutFolder(myLayoutItems, parentId);
    if (!found) return false;
    if (dragging.kind === 'character') return canFolderHoldCharacter(found.folder, dragging);
    // フォルダは、サブフォルダを持たないものだけを、1段目のフォルダの中へ入れられる
    return !found.parent && found.folder.id !== dragging.id && !dragging.hasSub && canParentHoldFolderKind(found.folder, dragging.folderKind);
  };

  /** 動かしているフォルダ自身の中の行か(自分の中へは入れない) */
  const isInsideDragged = (el) => dragging.kind === 'folder' && !!el.closest(`.history-folder-children[data-folder-id="${dragging.id}"]`);

  /**
   * 落とす先(moveLayoutItem の drop)と、示し方を求める。落とせない場所なら null。
   * マウスの位置ではなく、動かしている行(掴んだ位置から計算した上端〜下端)で判定する。
   * - フォルダ行に FOLDER_DROP_OVERLAP 以上被ったら、そのフォルダの中(閉じていれば末尾、開いていれば先頭)。
   *   入れられるフォルダ(種別が合い、2段を超えない)だけが対象。
   * - それ以外は、動かしている行の中心がある行の前後(上半分=前 / 下半分=後)。その行と同じフォルダの中に置けるときだけ。
   *   開いた空のフォルダの余白ならその中、一覧の下の余白ならルートの末尾。
   */
  const resolveDrop = (e) => {
    if (!dragging) return null;
    const top = e.clientY - dragging.grabOffset;
    const bottom = top + dragging.height;
    const centerY = (top + bottom) / 2;

    let best = null;
    let bestOverlap = 0;
    historyListEl.querySelectorAll('.history-folder:not(.is-editing):not(.is-dragging)').forEach(folderRow => {
      if (isInsideDragged(folderRow) || !canPlaceUnder(folderRow.dataset.folderId)) return;
      const rect = folderRow.getBoundingClientRect();
      const overlap = Math.min(bottom, rect.bottom) - Math.max(top, rect.top);
      if (overlap >= rect.height * FOLDER_DROP_OVERLAP && overlap > bestOverlap) {
        best = folderRow;
        bestOverlap = overlap;
      }
    });
    if (best) {
      const position = best.classList.contains('is-open') ? 'start' : 'end';
      return { drop: { into: best.dataset.folderId, position }, into: best };
    }

    // 開いた空のフォルダ(「キャラクターがいません」)の余白
    for (const placeholder of historyListEl.querySelectorAll('.history-folder-empty')) {
      const container = placeholder.closest('.history-folder-children');
      const folderId = container.dataset.folderId;
      if (isInsideDragged(container) || folderId === dragging.id || !canPlaceUnder(folderId)) continue;
      const rect = container.getBoundingClientRect();
      if (centerY >= rect.top && centerY <= rect.bottom) {
        return { drop: { into: folderId, position: 'end' }, into: historyListEl.querySelector(`.history-folder[data-folder-id="${folderId}"]`) };
      }
    }

    // 動かしている行自身(フォルダなら、その中の行も)と、名前の編集中のフォルダは対象にしない
    const rows = [...historyListEl.querySelectorAll('.history-item, .history-folder')].filter(r =>
      !r.classList.contains('is-dragging') && !r.classList.contains('is-editing') && !isInsideDragged(r));
    const row = rows.find(r => centerY < r.getBoundingClientRect().bottom);
    if (!row) return { drop: { rootEnd: true }, atEnd: true };

    // その行の前後に置くと、その行と同じフォルダの中に入る
    if (!canPlaceUnder(row.dataset.parentFolder || null)) return null;
    const rect = row.getBoundingClientRect();
    const before = centerY < rect.top + rect.height / 2;
    const place = before ? 'before' : 'after';
    const ref = row.classList.contains('history-folder')
      ? { kind: 'folder', id: row.dataset.folderId }
      : { kind: 'character', id: row.dataset.id };
    return { drop: { ref, place }, row, before };
  };

  const clearDropIndicator = () => {
    historyListEl.classList.remove('drop-at-end');
    historyListEl.querySelectorAll('.drop-before, .drop-after, .drop-into')
      .forEach(el => el.classList.remove('drop-before', 'drop-after', 'drop-into'));
  };

  historyListEl.addEventListener('dragstart', (e) => {
    const row = e.target.closest('[draggable="true"]');
    if (!row) return;
    // 掴んだ位置と行の高さを記録し、ドラッグ中は動かしている行の位置で判定する
    const rect = row.getBoundingClientRect();
    const geometry = { grabOffset: e.clientY - rect.top, height: rect.height };
    if (row.classList.contains('history-folder')) {
      const found = findLayoutFolder(myLayoutItems, row.dataset.folderId);
      if (!found) return;
      dragging = { kind: 'folder', id: found.folder.id, folderKind: folderKind(found.folder), hasSub: hasSubfolders(found.folder), ...geometry };
    } else {
      const c = myCharactersCache.find(x => x.id === row.dataset.id);
      dragging = { kind: 'character', id: row.dataset.id, game: c ? c.game : row.dataset.game, ...geometry };
    }
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', dragging.id);
    row.classList.add('is-dragging');
  });

  historyListEl.addEventListener('dragover', (e) => {
    if (!dragging) return;
    const target = resolveDrop(e);
    clearDropIndicator();
    if (!target) return; // 落とせない場所(ブラウザが禁止のカーソルを出す)
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (target.into) target.into.classList.add('drop-into');
    else if (target.atEnd) historyListEl.classList.add('drop-at-end');
    else target.row.classList.add(target.before ? 'drop-before' : 'drop-after');
  });

  historyListEl.addEventListener('dragleave', (e) => {
    if (!historyListEl.contains(e.relatedTarget)) clearDropIndicator();
  });

  historyListEl.addEventListener('drop', (e) => {
    if (!dragging) return;
    e.preventDefault();
    const target = resolveDrop(e);
    const drag = dragging;
    // 移動で一覧を描き直すと元の行が消え、dragend がここまで届かないので、先に状態を戻す
    dragging = null;
    clearDropIndicator();
    if (target) moveLayoutItem(drag, target.drop);
  });

  historyListEl.addEventListener('dragend', () => {
    dragging = null;
    clearDropIndicator();
    historyListEl.querySelectorAll('.is-dragging').forEach(el => el.classList.remove('is-dragging'));
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
  imageSourceId = null;
  clearPreview();
  if (imageInput) imageInput.value = '';
  const revealPasswordInput = document.getElementById('reveal_password');
  if (revealPasswordInput) revealPasswordInput.value = '';
  characterTags = [];
  renderTagChips();

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
  applyCharacterKindUI();
  syncTabTitle();
  refreshOwnerPasswordUI();
};

const newCharacterModal = document.getElementById('new_character_modal');
const newCharChoiceSinobigami = document.getElementById('new_char_choice_sinobigami');
const newCharChoiceMagirogi = document.getElementById('new_char_choice_magirogi');

const openNewCharacterModal = () => {
  if (!newCharacterModal) return;
  newCharacterModal.classList.add('is-open');
  newCharacterModal.setAttribute('aria-hidden', 'false');
};
const closeNewCharacterModal = () => {
  if (!newCharacterModal) return;
  newCharacterModal.classList.remove('is-open');
  newCharacterModal.setAttribute('aria-hidden', 'true');
};

const startNewCharacter = (game) => {
  if (!confirm('現在の入力内容を破棄して新規作成しますか？')) return;
  closeNewCharacterModal();
  if (game === CURRENT_GAME) {
    resetCharacterForm();
    closeHistoryPanel();
  } else {
    window.location.href = game === 'sinobigami' ? '../sinobigami/index.html' : '../magirogi/index.html';
  }
};

const newCharacterBtn = document.getElementById('new_character_btn');
if (newCharacterBtn) newCharacterBtn.addEventListener('click', openNewCharacterModal);
if (newCharChoiceSinobigami) newCharChoiceSinobigami.addEventListener('click', () => startNewCharacter('sinobigami'));
if (newCharChoiceMagirogi) newCharChoiceMagirogi.addEventListener('click', () => startNewCharacter('magirogi'));
if (newCharacterModal) newCharacterModal.addEventListener('click', (e) => { if (e.target === newCharacterModal) closeNewCharacterModal(); });

// 見出し(トップページへのリンク)で移動すると保存していない入力が消えるので、確認してから移動する。
// Ctrl/⌘/Shift/Alt+クリックと中クリック(click は発生しない)は別のタブ・ウィンドウで開き、このページは残るので確認しない
const homeLink = document.querySelector('h1 .home-link');
if (homeLink) homeLink.addEventListener('click', (e) => {
  if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
  if (!confirm('ツールまとめページに移動します。保存していない内容は消えますが、移動しますか？')) e.preventDefault();
});

/**
 * 立ち絵の Blob から一覧用のサムネイルを作って送り、版を返す。
 * 失敗しても例外は投げずに null を返す(サムネイルは、持ち主が一覧を開いたときに作り直される)。
 */
const uploadThumbnail = async (id, imageBlob) => {
  try {
    const thumb = await createThumbnail(imageBlob);
    if (!thumb) throw new Error(`サムネイルを${THUMB_MAX_BYTES / 1024}KB以下にできませんでした`);
    const authHeaders = getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {};
    const res = await fetch(`${API_BASE}/api/upload-thumb/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': thumb.type, ...authHeaders },
      body: thumb,
    });
    if (!res.ok) throw new Error(`サムネイルの保存に失敗しました(${res.status})`);
    return (await res.json()).version;
  } catch (err) {
    console.warn('サムネイルを保存できませんでした', err);
    return null;
  }
};

/** キャラクターを保存する(currentCharacterIdの有無で新規/更新を自動判定) */
const saveCharacter = async () => {
  const data = buildSaveData();
  const imageBase64 = data.image;
  delete data.image;
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
      const res = await fetch(`${API_BASE}/api/save?game=${CURRENT_GAME}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify(compact),
    });
    if (!res.ok) throw new Error('保存に失敗しました');
    const json = await res.json();
    id = json.id;
    currentCharacterId = id;
    history.replaceState(null, '', `${window.location.pathname}${window.location.search}#id=${id}`);
  }

  // 画像は、選び直したとき・別のキャラの画像を持っているとき(JSONの読み込みや新規保存)だけ送る。
  // このキャラの画像をサーバーから読み込んだまま上書き保存するときは送り直さない。
  // 送るときは、一覧用のサムネイルも作って送る(失敗しても保存は成功とし、一覧を開いたときに作り直す)
  if (imageBase64 && imageSourceId !== id) {
    const imageBlob = await (await fetch(imageBase64)).blob();
    const imgRes = await fetch(`${API_BASE}/api/upload-image/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': imageBlob.type, ...authHeaders },
      body: imageBlob,
    });
    if (!imgRes.ok) throw new Error('画像のアップロードに失敗しました');
    await uploadThumbnail(id, imageBlob);
    imageSourceId = id;
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
      showToast('保存しました！');
    } catch (err) {
      console.error('保存に失敗しました', err);
      alert(`保存中にエラーが発生しました。\n${err && err.message ? err.message : err}`);
    } finally {
      saveCharacterBtn.disabled = false;
      saveCharacterBtn.innerHTML = originalHTML;
    }
  });
}

// Ctrl+S (Macはcmd+S) で保存ボタンを押したことにする
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault();
    if (saveCharacterBtn && !saveCharacterBtn.disabled) saveCharacterBtn.click();
  }
});

  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
      const url = copyShareLink();
      if (!url) {
        showToast('まだ保存されていません。先に「保存」ボタンを押してください。');
        return;
      }
      try {
        if (!navigator.clipboard || !navigator.clipboard.writeText) {
          throw new Error('Clipboard API is not available');
        }
        await navigator.clipboard.writeText(url);
        showToast('共有リンクをクリップボードにコピーしました！');
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

    currentCharacterId = match[1];
    applyLoadedData(data);
    // このキャラの立ち絵はサーバーにあるので、上書き保存では送り直さない
    if (compact.img) imageSourceId = match[1];
    showToast('共有リンクからキャラクターデータを読み込みました！');
  } catch (err) {
    console.error('共有データの読み込みに失敗しました', err);
    showToast('共有リンクの読み込みに失敗しました。');
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

      // 忍具の各欄(兵糧丸・神通丸・遁甲符・その他)の数字の合計
      const ninguTotal = ['ningu_hyorogan', 'ningu_jintsumaru', 'ningu_tonkofu', 'ningu_other']
        .reduce((sum, key) => sum + parseNinguCount(getFieldValue(key)), 0);

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
        { label: '頑健', value: Number(getFieldValue('life_extra', '0')), max: Number(getFieldValue('life_extra', '0')) },
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
    if (ougiSection) { ougiSection.classList.toggle('hideable-section', isHidden); ougiSection.dataset.hideLabel = '奥義'; }
    if (ninguSection) { ninguSection.classList.toggle('hideable-section', isHidden); ninguSection.dataset.hideLabel = '忍具'; }
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

  refreshOwnerPasswordUI();
  if (getAuthToken()) renderMyCharacters();

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
        if (!blob) { showToast('画像の生成に失敗しました。'); return; }
        try {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          showToast('キャラクターシートの画像をクリップボードにコピーしました！\nCtrl+V で貼り付けできます。');
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
          showToast('クリップボードへのコピーに失敗したため、画像をダウンロードしました。');
        }
      }, 'image/png');
    } catch (err) {
      console.error('画像生成に失敗:', err);
      showToast('画像の生成に失敗しました。');
    } finally {
      screenshotBtn.innerHTML = originalHTML;
      screenshotBtn.disabled = false;
    }
  });

}); // end DOMContentLoaded