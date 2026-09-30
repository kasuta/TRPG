// ==========================================
// シノビガミ・マギロギ キャラシ作成サイト - 共通スクリプト
// ==========================================
// 両キャラシで同じ処理(テーマ・PC表示の切り替え、トースト、タグ、立ち絵、ログイン、キャラ一覧、保存・共有リンク)。
// 各キャラシの index.html で、index.js より先に
//   <script src="../common/sheet-common.js" data-game="sinobigami" defer></script>
// のように読み込む(data-game は sinobigami か magirogi)。
// ゲームごとの処理(保存データの組み立て・読み込み、新規作成のリセットなど)は、各 index.js が initSheetCommon で登録する。

/** このキャラシのゲーム(読み込んだ <script> の data-game) */
const CURRENT_GAME = document.currentScript.dataset.game;
const GAME_LABEL = { sinobigami: 'シノビガミ', magirogi: 'マギロギ' };

// ==========================================
// テーマ切り替え(ゲームごとに記憶する。シノビガミの選択は判定ツールとも共有)
// ==========================================
(() => {
  const THEMES = [
    { key: 'light', label: 'デフォルトテーマ' },
    { key: 'dark', label: 'ダークモード1' },
    { key: 'dark-muted', label: 'ダークモード2' },
    { key: 'dark-full', label: 'ダークモード3' },
  ];
  const STORAGE_KEY = `${CURRENT_GAME}_theme`;
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
// PC表示モード切り替え(ゲームごとに記憶する)
// ==========================================
(() => {
  const LAYOUT_STORAGE_KEY = `${CURRENT_GAME}_layout`;
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
    // 列の幅が変わるので、忍法・蔵書などのテキストエリアの高さを新しい幅で計算し直す
    resyncAllTextareaHeights();
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
// 立ち絵(プレビューと、保存用の base64)
// ==========================================
const imageInput = document.getElementById('setting_image');
const imagePreview = document.getElementById('setting_image_preview');
const imageEmpty = document.getElementById('setting_image_empty');
let previewUrl = null;
let savedImageBase64 = null;
// 今の立ち絵が、どのキャラの /api/image/<id> から読み込んだものか(ファイルを選んだ・JSONから読んだときは null)。
// 保存先のキャラと同じなら、保存のときに画像を送り直さない
let imageSourceId = null;

const clearPreview = () => {
  if (previewUrl) { URL.revokeObjectURL(previewUrl); previewUrl = null; }
  imagePreview.removeAttribute('src');
  imagePreview.classList.remove('is-visible');
  imageEmpty.hidden = false;
};

/** 立ち絵を外す(画像の出どころは、読み込んだ側(共有リンクなら、そのキャラのID)が設定し直す) */
const clearCharacterImage = () => {
  savedImageBase64 = null;
  imageSourceId = null;
  clearPreview();
};

/** 読み込んだデータの立ち絵(data URL か /api/image の URL)を表示し、保存用に持つ */
const showLoadedImage = (image) => {
  savedImageBase64 = image;
  imagePreview.src = image;
  imagePreview.classList.add('is-visible');
  imageEmpty.hidden = true;
};

/** プレビュー表示とセーブ用base64変換をまとめて行う */
imageInput.addEventListener('change', () => {
  imageSourceId = null;
  const file = imageInput.files && imageInput.files[0];
  if (!file) { clearPreview(); savedImageBase64 = null; return; }
  if (!file.type.startsWith('image/')) {
    clearPreview();
    imageEmpty.textContent = '画像ファイルを選択してください';
    savedImageBase64 = null;
    return;
  }
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = URL.createObjectURL(file);
  imagePreview.src = previewUrl;
  imagePreview.classList.add('is-visible');
  imageEmpty.hidden = true;

  const reader = new FileReader();
  reader.onload = (e) => { savedImageBase64 = e.target.result; };
  reader.readAsDataURL(file);
});

clearPreview();

// ==========================================
// ゲームごとの処理(各 index.js が initSheetCommon で登録する)
// ==========================================
/**
 * buildSaveData()               … 今の入力から保存データを作る
 * applyLoadedData(data)         … 保存データを入力欄に反映する
 * compactifyForShare(data)      … 保存データを、サーバーに送る短縮形にする
 * expandFromShare(compact)      … 短縮形を保存データに戻す
 * resetCharacterForm()          … 新規作成用に入力を初期状態にする
 * onMyCharactersLoaded()        … (任意) ログイン中のキャラ一覧を読み込んだあと
 */
const sheetHooks = {
  buildSaveData: null,
  applyLoadedData: null,
  compactifyForShare: null,
  expandFromShare: null,
  resetCharacterForm: null,
  onMyCharactersLoaded: () => {},
};

// ==========================================
// アカウント・履歴・キャラ一覧(両アプリで共通のWorker。ゲームは game で区別)
// ==========================================
// localhostで開いたときは、ローカルのAPI(sinobigami-api の npm run dev)に接続する(本番APIはlocalhostを許可していない)
const API_BASE = ['localhost', '127.0.0.1'].includes(location.hostname)
  ? 'http://localhost:8787'
  : 'https://sinobigami-api.kasu-kasu.workers.dev';
let currentCharacterId = null;

/** JSON POSTリクエストを送り、{ok, json}を返す共通ヘルパー(login/registerで共有) */
const postJSON = async (path, body) => {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, json };
};

/** 保存履歴(localStorage。両アプリで共通のキー)に記録する */
const addToHistory = (id, name) => {
  const historyJson = localStorage.getItem('sinobigami_history') || '[]';
  const history = JSON.parse(historyJson);
  const existing = history.find(h => h.id === id);
  if (existing) {
    existing.name = name || '(名前未設定)';
    existing.game = CURRENT_GAME;
    existing.updatedAt = new Date().toISOString();
  } else {
    history.unshift({ id, name: name || '(名前未設定)', game: CURRENT_GAME, updatedAt: new Date().toISOString() });
  }
  localStorage.setItem('sinobigami_history', JSON.stringify(history));
};

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
      const res = await fetch(`${API_BASE}/api/my-layout`, {
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

/** ログイン中ユーザーのキャラ一覧をサーバーから取得して描画する(マギロギ・シノビガミ両方含む) */
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
    const res = await fetch(`${API_BASE}/api/my-layout?v=2`, {
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    });
    if (!res.ok) throw new Error('取得に失敗しました');
    myLayoutItems = (await res.json()).items;
    myLayoutSavedItems = myLayoutItems;
    myCharactersCache = flattenLayoutItems(myLayoutItems);
    applyGameFilter();
    sheetHooks.onMyCharactersLoaded();
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
    tagSuggestionFetch = fetch(`${API_BASE}/api/my-layout?v=2`, { headers: { Authorization: `Bearer ${getAuthToken()}` } })
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
      const { ok, json } = await postJSON('/api/login', { username, password });
      if (!ok) { errorEl.textContent = json.error || 'ログインに失敗しました'; return; }
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
      const { ok, json } = await postJSON('/api/register', { username, password });
      if (!ok) { errorEl.textContent = json.error || '登録に失敗しました'; return; }
      // 登録後、自動的にログイン
      const loginResult = await postJSON('/api/login', { username, password });
      if (loginResult.ok) {
        setAuth(loginResult.json.token, loginResult.json.username);
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
      await fetch(`${API_BASE}/api/logout`, {
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
    sheetHooks.resetCharacterForm();
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
  const data = sheetHooks.buildSaveData();
  const imageBase64 = data.image;
  delete data.image;
  const compact = sheetHooks.compactifyForShare(data);

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

const shareBtn = document.getElementById('share_link_btn');
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

/** URL が #id=<id> なら、そのキャラをサーバーから読み込んで反映する */
const loadCharacterFromHash = async () => {
  const hash = window.location.hash || '';
  const match = hash.match(/^#id=(.+)$/);
  if (!match) return;

  try {
    const res = await fetch(`${API_BASE}/api/load/${match[1]}`);
    if (!res.ok) throw new Error('データが見つかりません');
    const compact = await res.json();
    const data = sheetHooks.expandFromShare(compact);

    // 画像がある場合はURLを組み立てて反映
    if (compact.img) {
      data.image = `${API_BASE}/api/image/${match[1]}`;
    }

    currentCharacterId = match[1];
    sheetHooks.applyLoadedData(data);
    // このキャラの立ち絵はサーバーにあるので、上書き保存では送り直さない
    if (compact.img) imageSourceId = match[1];
    showToast('共有リンクからキャラクターデータを読み込みました！');
  } catch (err) {
    console.error('共有データの読み込みに失敗しました', err);
    showToast('共有リンクの読み込みに失敗しました。');
  }
};

/**
 * ゲームごとの処理を登録し(sheetHooks を参照)、共有リンク(#id=)で開いたときはそのキャラを読み込む。
 * 各 index.js の DOMContentLoaded の中で、入力欄の準備が済んでから1回呼ぶ。
 */
const initSheetCommon = (hooks) => {
  Object.assign(sheetHooks, hooks);
  loadCharacterFromHash();
};
