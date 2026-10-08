// ==========================================
// マギカロギア キャラシ作成サイト - メインスクリプト
// ==========================================
// シノビガミと共通の処理(テーマ、トースト、タグ、立ち絵、ログイン、キャラ一覧、保存・共有リンクなど)は
// ../common/sheet-common.js にあり、このファイルより先に読み込まれる。

// --- マギロギ用のヘルパー ---

/** 複数のキー候補から最初に値が見つかったものを返す */
const getFirstValue = (keys, fallback = '0') => {
  for (const key of keys) {
    const v = getFieldValue(key);
    if (v) return v;
  }
  return fallback;
};

/** 魔法の各テキスト項目のオブジェクトキーとDOM上のname接尾辞の対応(collectSpells/swapSpellRowsで共有) */
const SPELL_TEXT_FIELDS = [
  { key: 'name', attr: 'name' },
  { key: 'type', attr: 'type' },
  { key: 'skill', attr: 'skill' },
  { key: 'target', attr: 'target' },
  { key: 'cost', attr: 'cost' },
  { key: 'effect', attr: 'effect' },
  { key: 'phrase', attr: 'phrase' },
  { key: 'ref', attr: 'reference_p' },
];

/** 蔵書の入力方式('grid' = 表、'text' = ルールブックの書式のテキスト) */
let spellInputMode = 'grid';

/** 表形式の蔵書データを収集 */
const collectSpellsFromGrid = () => {
  const spells = [];
  let i = 1;
  while (document.querySelector(`[name="spell_name_${i}"]`)) {
    const spell = {};
    SPELL_TEXT_FIELDS.forEach(({ key, attr }) => {
      const el = document.querySelector(`[name="spell_${attr}_${i}"]`);
      spell[key] = el ? el.value || '' : '';
    });
    spells.push(spell);
    i++;
  }
  return spells;
};

// ── 蔵書のテキスト入力(ルールブックの書式) ──
// 例:
//   汎用                     ← 魔法名より前の行(分類など)は読み飛ばす
//   退去｛デポーテーション｝  ← ルビは魔法名の2行目にする(「退去\nデポーテーション」)
//   タイプ：呪文
//   指定特技：《重力》        ← 《》は外す
//   目標：敵の立会人1人       ← 表の「対象」
//   コスト：力1
//   効果：                    ← 効果・呪句・概要は、次のラベルまでの行をまとめて読む
//   …
//   呪句：                    ← ルビ｛｝は外す
//   …
//   概要：                    ← 入れる欄が無いので読み飛ばす
//   …

/** ラベル → 蔵書の項目のキー(null は読み飛ばす項目) */
const SPELL_TEXT_LABELS = {
  'タイプ': 'type',
  '指定特技': 'skill',
  '目標': 'target',
  '対象': 'target',
  'コスト': 'cost',
  '参照p': 'ref',
  '効果': 'effect',
  '呪句': 'phrase',
  '概要': null,
};
/** 次のラベルまでの行をまとめて読む項目 */
const SPELL_TEXT_MULTILINE_LABELS = ['効果', '呪句', '概要'];
const SPELL_TEXT_LABEL_PATTERN = new RegExp(`^(${Object.keys(SPELL_TEXT_LABELS).join('|')})\\s*(?:[：:]|[\\s\\u3000]+|$)\\s*(.*)$`);
const SPELL_TYPES = ['召喚', '呪文', '装備'];
const SPELL_RUBY_PATTERN = /[｛{][^｝}]*[｝}]/g;

/** 魔法名の行を表の形にする(末尾のルビ「退去｛デポーテーション｝」は2行目へ) */
const parseSpellNameLine = (line = '') => {
  const match = line.trim().match(/^([^｛{]+)[｛{]([^｝}]+)[｝}]$/);
  return match ? `${match[1].trim()}\n${match[2].trim()}` : line.trim();
};

/** 表の魔法名をテキストの1行に戻す(2行目以降はルビとして｛｝で囲む) */
const serializeSpellName = (name = '') => {
  const [base = '', ...rest] = String(name).replace(/\r\n/g, '\n').split('\n').map(s => s.trim());
  const ruby = rest.join('');
  return ruby ? `${base}｛${ruby}｝` : base;
};

/** 表の魔法名の1行目(CCFOLIAなど、1行で出す場所で使う) */
const spellFirstLine = (name = '') => String(name).split(/\r?\n/)[0].trim();

const normalizeSpellType = (value = '') => {
  const trimmed = String(value).trim();
  const base = trimmed.replace(/魔法$/, '');
  return SPELL_TYPES.includes(base) ? base : trimmed;
};

/** ルールブックの書式のテキスト1件を、蔵書の1行分のデータにする */
const parseSpellBlock = (block = '') => {
  const spell = { name: '', type: '', skill: '', target: '', cost: '', effect: '', phrase: '', ref: '' };
  const lines = String(block).replace(/\r\n/g, '\n').split('\n').map(line => line.trim());
  const firstLabelIndex = lines.findIndex(line => SPELL_TEXT_LABEL_PATTERN.test(line));
  const headLines = (firstLabelIndex < 0 ? lines : lines.slice(0, firstLabelIndex)).filter(Boolean);
  if (headLines.length) spell.name = parseSpellNameLine(headLines[headLines.length - 1]);
  if (firstLabelIndex < 0) return spell;

  const multiline = { effect: [], phrase: [] };
  let currentLabel = null;
  lines.slice(firstLabelIndex).forEach(line => {
    const match = line.match(SPELL_TEXT_LABEL_PATTERN);
    if (match) {
      const [, label, value] = match;
      currentLabel = label;
      const key = SPELL_TEXT_LABELS[label];
      if (!key) return;
      if (multiline[key]) { if (value) multiline[key].push(value); }
      else spell[key] = value.trim();
      return;
    }
    if (SPELL_TEXT_MULTILINE_LABELS.includes(currentLabel)) {
      const key = SPELL_TEXT_LABELS[currentLabel];
      if (key) multiline[key].push(line);
      return;
    }
    // ラベルの無い行は効果とみなす
    multiline.effect.push(line);
  });

  spell.type = normalizeSpellType(spell.type);
  spell.skill = spell.skill.replace(/[《》]/g, '').trim();
  spell.effect = multiline.effect.join('\n').trim();
  // 呪句は1行の入力欄なので、折り返しの改行はつなげる
  spell.phrase = multiline.phrase.join('').replace(SPELL_RUBY_PATTERN, '').trim();
  return spell;
};

/** 蔵書の1行分のデータを、ルールブックの書式のテキストにする(参照pは本に無いので、コストの後に足す) */
const serializeSpellBlock = (spell = {}) => [
  serializeSpellName(spell.name || ''),
  `タイプ：${spell.type || ''}`,
  `指定特技：${spell.skill || ''}`,
  `目標：${spell.target || ''}`,
  `コスト：${spell.cost || ''}`,
  `参照p：${spell.ref || ''}`,
  '効果：',
  ...(spell.effect ? [String(spell.effect).replace(/\r\n/g, '\n').trimEnd()] : []),
  '呪句：',
  ...(spell.phrase ? [spell.phrase] : []),
].join('\n');

/** テキスト入力の蔵書データを収集(空の行は除く) */
const collectSpellsFromText = () => Array.from(document.querySelectorAll('#spell_text_list .spell-text-block'))
  .map(textarea => parseSpellBlock(textarea.value || ''))
  .filter(row => !isEmptySpellRow(row));

/** 蔵書データを収集(今の入力方式に合わせる) */
const collectSpells = () => (spellInputMode === 'text' ? collectSpellsFromText() : collectSpellsFromGrid());

/** 関係データを収集 */
const collectRelations = () => {
  const relations = [];
  let j = 1;
  while (document.querySelector(`[name="relation_anchor_${j}"]`)) {
    relations.push({
      check: document.getElementById(`relation_check_${j}`) ? document.getElementById(`relation_check_${j}`).checked : false,
      anchor: document.querySelector(`[name="relation_anchor_${j}"]`).value || '',
      fate: document.querySelector(`[name="relation_fate_${j}"]`).value || '',
      attr: document.querySelector(`[name="relation_attr_${j}"]`).value || '',
      setting: document.querySelector(`[name="relation_setting_${j}"]`).value || '',
    });
    j++;
  }
  return relations;
};

/** 蔵書の空行判定(魔法名・指定特技・対象・コスト・効果・呪句・参照pが全て空なら空行とみなす) */
const isEmptySpellRow = (row = {}) => !row.name && !row.skill && !row.target && !row.cost && !row.effect && !row.phrase && !row.ref;

/** 関係の空行判定 */
const isEmptyRelationRow = (row = {}) => !row.anchor && !row.fate && !row.attr && !row.setting;

/** 習得済み特技一覧を返す */
const getAcquiredSkills = () => {
  const skills = [];
  document.querySelectorAll('.skill-check:checked').forEach(cb => skills.push(cb.value));
  return skills;
};

// ==========================================
// DOMContentLoaded — すべての初期化を集約
// ==========================================
document.addEventListener('DOMContentLoaded', () => {

  // ──────────────────────────────
  // 1. 蔵書（魔法）セクション
  // ──────────────────────────────
  const spellList = document.getElementById('spell_list');
  const addSpellBtn = document.getElementById('add_spell_btn');
  const removeSpellBtn = document.getElementById('remove_spell_btn');
  let spellCount = 0;
  const SPELL_HEADER_COUNT = 8;
  const SPELL_ROW_SIZE = 2;

  const bindSpellTextarea = (textarea) => {
    if (textarea.dataset.resizeBound) return;
    textarea.dataset.resizeBound = 'true';

    textarea.addEventListener('input', () => resizeTextareaRow(spellList, '.spell-textarea', textarea.dataset.row));
    resizeTextareaRow(spellList, '.spell-textarea', textarea.dataset.row);
  };

  /** 魔法行を上下に入れ替える */
  const swapSpellRows = (rowA, rowB) => {
    if (rowA < 1 || rowB < 1 || rowA > spellCount || rowB > spellCount || rowA === rowB) return;

    SPELL_TEXT_FIELDS.forEach(({ attr }) => {
      const elA = document.querySelector(`[name="spell_${attr}_${rowA}"]`);
      const elB = document.querySelector(`[name="spell_${attr}_${rowB}"]`);
      if (elA && elB) {
        const tmp = elA.value;
        elA.value = elB.value;
        elB.value = tmp;
      }
    });

    [rowA, rowB].forEach(r => resizeTextareaRow(spellList, '.spell-textarea', String(r)));
  };

  const addSpellRow = () => {
    spellCount++;
    const n = spellCount;
    const rowHTML = `
      <div class="spell-row" data-row="${n}">
        <div class="spell-name-cell">
          <textarea name="spell_name_${n}" class="spell-textarea" rows="1" data-row="${n}"></textarea>
        </div>
        <select name="spell_type_${n}">
          <option value="召喚">召喚</option>
          <option value="呪文">呪文</option>
          <option value="装備">装備</option>
        </select>
        <textarea name="spell_skill_${n}" class="spell-textarea" rows="1" data-row="${n}"></textarea>
        <textarea name="spell_target_${n}" class="spell-textarea" rows="1" data-row="${n}"></textarea>
        <textarea name="spell_cost_${n}" class="spell-textarea" rows="1" data-row="${n}"></textarea>
        <textarea name="spell_effect_${n}" class="spell-textarea" rows="1" data-row="${n}"></textarea>
        <input type="text" name="spell_reference_p_${n}" />
        <div class="spell-move-cell">
          <div class="spell-move-btns">
            <button type="button" class="btn-move btn-move-up" data-spell-row="${n}" title="上へ移動">▲</button>
            <button type="button" class="btn-move btn-move-down" data-spell-row="${n}" title="下へ移動">▼</button>
          </div>
        </div>
      </div>
      <div class="spell-phrase-block" data-row="${n}">
        <div class="spell-phrase-table">
          <div class="spell-phrase-label">呪句</div>
          <input type="text" name="spell_phrase_${n}" class="spell-phrase-input" data-row="${n}" placeholder="呪句を入力" />
        </div>
      </div>`;
    spellList.insertAdjacentHTML('beforeend', rowHTML);
    spellList.querySelectorAll(`.spell-textarea[data-row="${n}"]`).forEach(bindSpellTextarea);
  };

  const removeSpellRow = () => {
    if (!spellList || spellList.children.length <= SPELL_HEADER_COUNT || spellCount === 0) return;
    for (let i = 0; i < SPELL_ROW_SIZE; i++) {
      if (spellList.lastElementChild) spellList.removeChild(spellList.lastElementChild);
    }
    spellCount = Math.max(0, spellCount - 1);
  };

  if (spellList) {
    spellList.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-move');
      if (!btn) return;
      const row = parseInt(btn.dataset.spellRow, 10);
      if (btn.classList.contains('btn-move-up')) {
        swapSpellRows(row, row - 1);
      } else if (btn.classList.contains('btn-move-down')) {
        swapSpellRows(row, row + 1);
      }
    });
  }

  const setDefaultSpellPreset = () => {
    const setVal = (sel, val) => {
      const el = spellList.querySelector(sel);
      if (el) { el.value = val; el.dispatchEvent(new Event('input')); }
    };
    setVal('textarea[name="spell_name_1"]', '緊急召喚');
    setVal('select[name="spell_type_1"]', '召喚');
    setVal('textarea[name="spell_skill_1"]', '可変');
    setVal('textarea[name="spell_cost_1"]', 'なし');
    setVal('textarea[name="spell_effect_1"]',
      '１Ｄ６を振って分野をランダムに決め、その後２Ｄ６を振ってランダムに特技一つを選ぶ。それが指定特技になる。その特技の判定に成功すると、その特技に対応した精霊一体を召喚できる'
    );
    resizeTextareaRow(spellList, '.spell-textarea', '1');
  };

  /** 表の i 行目に1件分のデータを入れる(applyLoadedData とテキスト入力からの切り替えで共有) */
  const fillSpellRow = (i, spell = {}) => {
    SPELL_TEXT_FIELDS.forEach(({ key, attr }) => {
      const el = document.querySelector(`[name="spell_${attr}_${i}"]`);
      if (!el) return;
      if (key === 'type') el.value = spell.type || '召喚';
      else if (key === 'phrase') el.value = typeof spell.phrase === 'string' ? spell.phrase : '';
      else el.value = spell[key] || '';
    });
    document.querySelector(`[name="spell_effect_${i}"]`).dispatchEvent(new Event('input'));
    document.querySelector(`[name="spell_phrase_${i}"]`).dispatchEvent(new Event('input'));
  };

  if (spellList) {
    addSpellRow();
    addSpellRow();
    setDefaultSpellPreset();
  }

  // ── 蔵書のテキスト入力(表との切り替え) ──
  const spellSection = document.getElementById('spell_section');
  const spellTextWrap = document.getElementById('spell_text_wrap');
  const spellTextList = document.getElementById('spell_text_list');
  const spellModeToggleBtn = document.getElementById('spell_mode_toggle_btn');

  const bindSpellTextBlock = (textarea) => {
    if (textarea.dataset.resizeBound) return;
    textarea.dataset.resizeBound = 'true';
    textarea.addEventListener('input', () => resizeTextareaRow(spellTextList, '.spell-text-block', textarea.dataset.row));
    resizeTextareaRow(spellTextList, '.spell-text-block', textarea.dataset.row);
  };

  const countSpellTextRows = () => (spellTextList ? spellTextList.querySelectorAll('.spell-text-row').length : 0);

  const addSpellTextRow = (spell = null) => {
    if (!spellTextList) return;
    const n = countSpellTextRows() + 1;
    const rowHTML = `
      <div class="spell-text-row">
        <div class="spell-text-row-head">魔法 ${n}</div>
        <textarea name="spell_text_${n}" class="spell-text-block" rows="12" data-row="${n}" placeholder="${n}件目の魔法を入力"></textarea>
      </div>`;
    spellTextList.insertAdjacentHTML('beforeend', rowHTML);
    const textarea = spellTextList.querySelector(`textarea[name="spell_text_${n}"]`);
    if (!textarea) return;
    textarea.value = spell && !isEmptySpellRow(spell) ? serializeSpellBlock(spell) : '';
    bindSpellTextBlock(textarea);
  };

  const removeSpellTextRow = () => {
    if (!spellTextList) return;
    const rows = spellTextList.querySelectorAll('.spell-text-row');
    if (rows.length <= 1) return;
    rows[rows.length - 1].remove();
  };

  const clearSpellTextRows = () => {
    if (spellTextList) spellTextList.innerHTML = '';
  };

  const syncSpellTextFromGrid = () => {
    clearSpellTextRows();
    const spells = collectSpellsFromGrid().filter(row => !isEmptySpellRow(row));
    (spells.length ? spells : [null]).forEach(addSpellTextRow);
  };

  const syncSpellGridFromText = () => {
    const spells = collectSpellsFromText();
    while (document.querySelectorAll('.spell-textarea[name^="spell_name_"]').length > 0) removeSpellRow();
    (spells.length ? spells : [{}]).forEach((spell, idx) => {
      addSpellRow();
      fillSpellRow(idx + 1, spell);
    });
  };

  const updateSpellModeUI = () => {
    if (!spellSection) return;
    const isText = spellInputMode === 'text';
    spellSection.classList.toggle('spell-mode-text', isText);
    spellSection.classList.toggle('spell-mode-grid', !isText);
    if (spellTextWrap) spellTextWrap.setAttribute('aria-hidden', String(!isText));
    if (spellList) spellList.setAttribute('aria-hidden', String(isText));
  };

  const setSpellMode = (mode) => {
    if (mode === spellInputMode) return;
    if (mode === 'text') syncSpellTextFromGrid();
    else syncSpellGridFromText();
    spellInputMode = mode;
    updateSpellModeUI();
    // 表示されてから高さを合わせ直す(非表示の間は高さを計算できないため)
    const container = mode === 'text' ? spellTextList : spellList;
    if (container) container.querySelectorAll('textarea[data-row]').forEach(ta => ta.dispatchEvent(new Event('input')));
  };

  if (addSpellBtn) addSpellBtn.addEventListener('click', () => {
    if (spellInputMode === 'text') addSpellTextRow();
    else addSpellRow();
  });
  if (removeSpellBtn) removeSpellBtn.addEventListener('click', () => {
    if (spellInputMode === 'text') removeSpellTextRow();
    else removeSpellRow();
  });
  if (spellModeToggleBtn) spellModeToggleBtn.addEventListener('click', () => setSpellMode(spellInputMode === 'grid' ? 'text' : 'grid'));
  updateSpellModeUI();

  // ──────────────────────────────
  // 3. 領域 → ギャップ連動
  // ──────────────────────────────
  const areaSelect = document.getElementById('area');
  const gaps = [1, 2, 3, 4, 5].map(n => document.getElementById(`gap${n}`));
  const AREA_GAP_MAP = { '星': [0], '獣': [0, 1], '力': [1, 2], '歌': [2, 3], '夢': [3, 4], '闇': [4] };

  if (areaSelect) {
    areaSelect.addEventListener('change', (e) => {
      gaps.forEach(g => { if (g) g.checked = false; });
      (AREA_GAP_MAP[e.target.value] || []).forEach(i => { if (gaps[i]) gaps[i].checked = true; });
    });
  }

  // ──────────────────────────────
  // 4. 関係セクション
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
      <div class="relation-checkbox-cell">
        <div class="box-container">
          <input type="checkbox" id="relation_check_${n}" class="box-check" />
          <label for="relation_check_${n}" class="box-label"></label>
        </div>
      </div>
      <textarea name="relation_anchor_${n}" class="relation-textarea" rows="1" data-row="${n}"></textarea>
      <textarea name="relation_fate_${n}" class="relation-textarea" rows="1" data-row="${n}"></textarea>
      <textarea name="relation_attr_${n}" class="relation-textarea" rows="1" data-row="${n}"></textarea>
      <textarea name="relation_setting_${n}" class="relation-textarea" rows="1" data-row="${n}"></textarea>`);
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
  // 5. 保存データの組み立てと反映(JSONファイル・サーバーへの保存・共有リンクは sheet-common.js)
  // ──────────────────────────────
  /** 現在の入力内容からセーブデータ(JSON化可能なオブジェクト)を構築 */
  const buildSaveData = () => {
    const data = { inputs: {}, checkboxes: {}, spells: [], relations: [], image: savedImageBase64 };

    document.querySelectorAll('input[type="text"], input[type="number"], select, textarea').forEach(el => {
      // 一覧パネル(ログイン・検索)の入力と、タグの入力欄(タグは tags に入れる)は保存しない
      if (el.closest('#history_panel') || el.id === 'tag_input') return;
      if (!el.name) return;
      if (el.name.startsWith('spell_') || el.name.startsWith('relation_')) return;
      data.inputs[el.id || el.name] = el.value;
    });
    data.tags = [...characterTags];
    document.querySelectorAll('input[type="checkbox"]').forEach(el => {
      if (el.closest('#history_panel')) return;
      if (el.id.startsWith('relation_check_')) return;
      data.checkboxes[el.id] = el.checked;
    });
    data.spells = collectSpells().filter(row => !isEmptySpellRow(row));
    data.relations = collectRelations().filter(row => !isEmptyRelationRow(row));
    return data;
  };

  /** フォームの入力欄・チェック状態・画像を初期状態にクリアする(applyLoadedData/resetCharacterFormで共有) */
  const clearCharacterForm = () => {
    document.querySelectorAll('input[type="text"], input[type="number"], select, textarea').forEach(el => {
      if (el.closest('#history_panel')) return;
      if (/^(spell_|relation_)/.test(el.name || '')) return;
      if (el.tagName === 'SELECT') el.selectedIndex = 0;
      else el.value = '';
    });
    document.querySelectorAll('.skill-check').forEach(cb => { cb.checked = false; });
    document.querySelectorAll('.gap-check').forEach(cb => { cb.checked = false; });
    clearCharacterImage();
    characterTags = [];
    renderTagChips();
  };

  /** セーブデータ(JSON)を現在のフォームへ反映(前のキャラの残留を防ぐため、まず全体をクリアしてから適用) */
  const applyLoadedData = (data) => {
    clearCharacterForm();

    // 領域を変えたら、特技の表の表示(領域の列)も合わせる
    applyInputsAndCheckboxes(data, (key, el) => { if (key === 'area') el.dispatchEvent(new Event('change')); });
    characterTags = normalizeTags(data.tags);
    renderTagChips();

    // 蔵書はテキスト入力中でも表に入れ、テキスト入力の欄は表から作り直す
    while (document.querySelectorAll('.spell-textarea[name^="spell_name_"]').length > 0) removeSpellRow();
    if (data.spells) {
      data.spells.filter(row => !isEmptySpellRow(row)).forEach((spell, idx) => {
        addSpellRow();
        fillSpellRow(idx + 1, spell);
      });
    }
    if (spellInputMode === 'text') syncSpellTextFromGrid();

    while (document.querySelectorAll('.relation-textarea[name^="relation_anchor_"]').length > 0) removeRelationRow();
    if (data.relations) {
      data.relations.filter(row => !isEmptyRelationRow(row)).forEach((rel, idx) => {
        addRelationRow();
        const j = idx + 1;
        document.querySelector(`[name="relation_anchor_${j}"]`).value = rel.anchor || '';
        document.querySelector(`[name="relation_fate_${j}"]`).value = rel.fate || '';
        document.querySelector(`[name="relation_attr_${j}"]`).value = rel.attr || '';
        document.querySelector(`[name="relation_setting_${j}"]`).value = rel.setting || '';
        if (document.getElementById(`relation_check_${j}`)) document.getElementById(`relation_check_${j}`).checked = rel.check || false;
        document.querySelector(`[name="relation_anchor_${j}"]`).dispatchEvent(new Event('input'));
      });
    }

    if (data.image) showLoadedImage(data.image);
    syncTabTitle();
  };

  // ──────────────────────────────
  // 6. 共有用の圧縮データ形式(マギロギ用: 蔵書・関係。奥義/忍法は無し)
  // ──────────────────────────────
  const INPUT_KEY_MAP = {
    name: 'n', m_name: 'mn', gender: 'gd', age: 'a', points: 'pt',
    tier_number: 'tn', tier_name: 'tm', area: 'ar', attack: 'atk', defense: 'df',
    kongen: 'kg', history: 'hs', belief: 'bl', face: 'fc',
    setting: 'st',
    true_name: 'trn', true_effect: 'tre', true_description: 'trd', soul_skill: 'ss',
  };
  const INPUT_KEY_MAP_REV = Object.fromEntries(Object.entries(INPUT_KEY_MAP).map(([k, v]) => [v, k]));

  /** 蔵書行を短縮配列に変換([名前,タイプ,指定特技,対象,コスト,効果,参照p,(旧チャージ機能の名残・位置互換のため空文字列),呪句]) */
  const spellsToArrays = (spells) => spells.map(sp => trimTrailingEmpty([
    sp.name || '', sp.type || '', sp.skill || '', sp.target || '', sp.cost || '', sp.effect || '', sp.ref || '',
    '',
    typeof sp.phrase === 'string' ? sp.phrase : '',
  ]));
  const arraysToSpells = (arrs) => arrs.map(arr => ({
    name: arr[0] || '', type: arr[1] || '召喚', skill: arr[2] || '', target: arr[3] || '', cost: arr[4] || '',
    effect: arr[5] || '', ref: arr[6] || '',
    phrase: typeof arr[8] === 'string' ? arr[8] : '',
  }));

  /** 関係行を短縮配列に変換([アンカー名,運命,属性,設定,チェック(1/'')]) */
  const relationsToArrays = (relations) => relations.map(r => trimTrailingEmpty([
    r.anchor || '', r.fate || '', r.attr || '', r.setting || '', r.check ? '1' : '',
  ]));
  const arraysToRelations = (arrs) => arrs.map(arr => ({
    anchor: arr[0] || '', fate: arr[1] || '', attr: arr[2] || '', setting: arr[3] || '', check: arr[4] === '1',
  }));

  /** 共有用にキー名を持たない最小構造へ変換 */
  const compactifyForShare = (data) => {
    const compact = compactInputsAndChecks(data, INPUT_KEY_MAP);
    if (data.spells && data.spells.length) compact.sp = spellsToArrays(data.spells);
    if (data.relations && data.relations.length) compact.rl = relationsToArrays(data.relations);
    if (data.tags && data.tags.length) compact.tg = data.tags;
    return compact;
  };

  /** compactifyForShareの逆変換(applyLoadedDataが読める形へ復元) */
  const expandFromShare = (compact = {}) => {
    const data = { ...expandInputsAndChecks(compact, INPUT_KEY_MAP_REV), spells: [], relations: [] };
    if (compact.sp) data.spells = arraysToSpells(compact.sp);
    if (compact.rl) data.relations = arraysToRelations(compact.rl);
    if (Array.isArray(compact.tg)) data.tags = compact.tg;
    return data;
  };

  /** キャラクターシートを新規作成用に初期状態へリセットする */
  const resetCharacterForm = () => {
    clearCharacterForm();
    if (imageInput) imageInput.value = '';

    while (document.querySelectorAll('.spell-textarea[name^="spell_name_"]').length > 0) removeSpellRow();
    addSpellRow();
    addSpellRow();
    setDefaultSpellPreset();
    clearSpellTextRows();
    spellInputMode = 'grid';
    updateSpellModeUI();
    // テキスト入力中に作った表の行は高さを計算できていないので、表示してから合わせ直す
    spellList.querySelectorAll('textarea[data-row]').forEach(ta => ta.dispatchEvent(new Event('input')));

    while (document.querySelectorAll('.relation-textarea[name^="relation_anchor_"]').length > 0) removeRelationRow();
    addRelationRow();

    currentCharacterId = null;
    history.replaceState(null, '', window.location.pathname + window.location.search);
    syncTabTitle();
  };

  // 共通の処理(キャラ一覧・保存・共有リンク)に、マギロギの保存データの扱いを登録し、共有リンクなら読み込む
  initSheetCommon({
    buildSaveData,
    applyLoadedData,
    compactifyForShare,
    expandFromShare,
    resetCharacterForm,
    jsonFileLabel: 'マギロギCS',
  });

  // ──────────────────────────────
  // 8. チャットパレット・ココフォリア用コピー
  // ──────────────────────────────

  /** チャットパレット形式のコマンド文字列を組み立てる(CCFOLIA形式出力とチャパレ形式出力で共通) */
  const buildChatPaletteCommands = (spells = collectSpells()) => {
    let commands = 'ーーー特技ーーー\n';
    getCheckedSkillsByColumn().forEach(cb => { commands += `2d6>=5 《${cb.value}》\n`; });
    const soulSkill = getFirstValue(['soul_skill']);
    if (soulSkill !== '0') commands += `2d6>=6 《${soulSkill}》\n`;

    commands += '\nーーー魔法ーーー\n';
    spells.forEach(sp => {
      if (sp.name) {
        const effectOneLine = sp.effect.replace(/\r?\n/g, '');
        commands += `【${spellFirstLine(sp.name)}】(取得=/種別=${sp.type}/特技=${sp.skill}/目標=${sp.target}/コスト=${sp.cost}/参照p=${sp.ref})効果：${effectOneLine}\n`;
      }
    });

    const trueName = getFirstValue(['true_name']);
    const trueEffect = getFirstValue(['true_effect']);
    commands += `\nーーー真の姿ーーー\n「${trueName === '0' ? '' : trueName}」【${trueEffect === '0' ? '' : trueEffect}】\n`;

    commands += `\nーーー呪句ーーー\n`;
    spells.forEach(sp => {
      if (sp.name && sp.phrase) {
        const phraseOneLine = sp.phrase.replace(/\r?\n/g, '');
        commands += `呪句【${spellFirstLine(sp.name)}】${phraseOneLine}\n`;
      }
    });

    commands += `\nーーー戦闘ーーー
s1d1　攻撃プロット（攻撃力={攻撃力}）
s{攻撃力}TZ6　攻撃ランダムプロット（攻撃力={攻撃力}）
s1d1　防御プロット（防御力={防御力}）
s{防御力}TZ6　防御ランダムプロット（防御力={防御力}）\n\n`;

      commands += `ーーー表ーーー
BGT　経歴表
DAT　初期アンカー表
FAT　運命属性表
WIT　願い表
PT　プライズ表
TPT　時の流れ表
TPTB　大判時の流れ表
AT　事件表
FT　ファンブル表
WT　変調表
FCT　運命変転表
TCT　典型的災厄表
PCT　物理的災厄表
MCT　精神的災厄表
ICT　狂気的災厄表
SCT　社会的災厄表
XCT　超常的災厄表
WCT　不思議系災厄表
CCT　コミカル系災厄表
MGCT　魔法使いの災厄表
ST　シーン表
STB　大判シーン表
XEST　極限環境表
IWST　内面世界表
MCST　魔法都市表
WDST　死後世界表
LWST　迷宮世界表
MBST　魔法書架表
MAST　魔法学院表
TCST　クレドの塔表
PWST　平行世界表
PAST　終末世界表
GBST　異世界酒場表
SLST　ほしかげ表
OLST　旧図書館表
WLAT　世界法則追加表
WMT　さまよう怪物表
RCT　ランダム分野表
RTT　ランダム特技表
RTS　星分野ランダム特技表
RTB　獣分野ランダム特技表
RTF　力分野ランダム特技表
RTP　歌分野ランダム特技表
RTD　夢分野ランダム特技表
RTN　闇分野ランダム特技表
BST　ブランク秘密表
MIT　宿敵表
MOT　謀略表
MAT　因縁表
MUT　奇人表
MFT　力場表
MLT　同盟票
FFT　落花表
FLT　その後表`;

    return commands;
  };

  const copyNameBtn = document.getElementById('copy_name_btn');
  const nameInput = document.getElementById('name');

  if (copyNameBtn && nameInput) {
    copyNameBtn.addEventListener('click', () => {
      const nameValue = nameInput.value;
      if (!nameValue) { showToast('かりそめの名前が入力されていません。'); return; }

      const ccfoliaSpells = collectSpells();
      const commands = buildChatPaletteCommands(ccfoliaSpells);

      const attackVal = getFirstValue(['attack']);
      const defenseVal = getFirstValue(['defense']);
      const rootVal = getFirstValue(['kongen']);

      // 魔力・一時的魔力はセッション中に増減させる値なので、キャラシの内容によらず0で出す
      const statusArr = [
        { label: '魔力', value: 0, max: 0 },
        { label: '一時的魔力', value: 0, max: 0 }
      ];
      ccfoliaSpells.forEach(sp => {
        if (sp.name) statusArr.push({ label: `${spellFirstLine(sp.name)}:${sp.cost}`, value: 0, max: Number(rootVal) });
      });

      const paramsArr = [
        { label: '攻撃力', value: String(attackVal) },
        { label: '防御力', value: String(defenseVal) },
        { label: '根源力', value: String(rootVal) }
      ];

      const ccfoliaData = {
        kind: 'character',
        data: { name: nameValue, initiative: 1, commands, status: statusArr, params: paramsArr, externalUrl: copyShareLink() || '' }
      };

      navigator.clipboard.writeText(JSON.stringify(ccfoliaData))
        .then(() => showToast('ココフォリア用のキャラクターデータをクリップボードにコピーしました！\nそのままココフォリアの盤面で Ctrl+V（ペースト）してください。'))
        .catch(err => { console.error('コピーに失敗しました', err); showToast('コピーに失敗しました。'); });
    });
  }

  const copyChatPaletteBtn = document.getElementById('copy_chatpalette_btn');
  if (copyChatPaletteBtn) {
    copyChatPaletteBtn.addEventListener('click', () => {
      const commands = buildChatPaletteCommands();
      navigator.clipboard.writeText(commands)
        .then(() => showToast('チャットパレット形式のコマンドをクリップボードにコピーしました！'))
        .catch(err => { console.error('コピーに失敗しました', err); showToast('コピーに失敗しました。'); });
    });
  }

  // ──────────────────────────────
  // 9. キャラシ画像の中身(生成とコピーは sheet-common.js の initSheetImageOutput)
  // ──────────────────────────────
  const AREA_NAMES = ['星', '獣', '力', '歌', '夢', '闇'];
  const SKILL_TABLE = [
    ['黄金','肉','重力','物語','追憶','深淵'],
    ['大地','蟲','風','旋律','謎','腐敗'],
    ['森','花','流れ','涙','嘘','裏切り'],
    ['道','血','水','別れ','不安','迷い'],
    ['海','鱗','波','微笑み','眠り','怠惰'],
    ['静寂','混沌','自由','想い','偶然','歪み'],
    ['雨','牙','衝撃','勝利','幻','不幸'],
    ['嵐','叫び','雷','恋','狂気','バカ'],
    ['太陽','怒り','炎','情熱','祈り','悪意'],
    ['天空','翼','光','癒し','希望','絶望'],
    ['異界','エロス','円環','時','未来','死']
  ];

  const buildPreviewHTML = () => {
    const v = (id) => escapeHTML(getFieldValue(id));
    const setting = getFieldValue('setting');
    const trueDesc = getFieldValue('true_description');
    const soulSkill = getFieldValue('soul_skill');
    const skills = getAcquiredSkills();
    const spells = collectSpells().filter(sp => sp.name);
    const relations = collectRelations().filter(r => r.anchor);

    const imgEl = document.getElementById('setting_image_preview');
    const imageSrc = (imgEl && imgEl.classList.contains('is-visible') && imgEl.src) ? imgEl.src : '';

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
        skillHTML += `<td class="${skills.includes(s) ? 'pv-skill-on' : ''}">${s}</td>`;
        if (ci < 5) skillHTML += `<td class="pv-gap-cell ${gaps[ci] ? 'pv-gap-on' : ''}"></td>`;
      });
      skillHTML += '</tr>';
    });
    skillHTML += '</tbody></table>';

    let spellHTML = '';
    if (spells.length) {
      spellHTML = '<table class="pv-table"><thead><tr><th>魔法名</th><th>タイプ</th><th>指定特技</th><th>対象</th><th>コスト</th><th>効果</th><th>呪句</th><th>参照p</th></tr></thead><tbody>';
      spells.forEach(sp => {
        spellHTML += `<tr><td>${escapeHTML(sp.name).replace(/\r?\n/g, '<br>')}</td><td>${escapeHTML(sp.type)}</td><td>${escapeHTML(sp.skill)}</td><td>${escapeHTML(sp.target)}</td><td>${escapeHTML(sp.cost)}</td><td class="pv-effect">${escapeHTML(sp.effect)}</td><td>${escapeHTML(sp.phrase || '□')}</td><td>${escapeHTML(sp.ref)}</td></tr>`;
      });
      spellHTML += '</tbody></table>';
    }

    let relHTML = '';
    if (relations.length) {
      relHTML = '<table class="pv-table"><thead><tr><th></th><th>アンカー名</th><th>運命</th><th>属性</th><th>設定</th></tr></thead><tbody>';
      relations.forEach(r => {
        relHTML += `<tr><td>${r.check ? '■' : '□'}</td><td>${escapeHTML(r.anchor)}</td><td>${escapeHTML(r.fate)}</td><td>${escapeHTML(r.attr)}</td><td>${escapeHTML(r.setting)}</td></tr>`;
      });
      relHTML += '</tbody></table>';
    }

    return `
    <div class="pv-sheet">
      <h1 class="pv-title">マギカロギア キャラクターシート</h1>
      <div class="pv-columns">
        <div class="pv-col">
          <div class="pv-section">
            <h2>基本情報</h2>
            <dl class="pv-dl">
              <dt>かりそめの名前</dt><dd>${v('name')}</dd>
              <dt>魔法名</dt><dd>${v('m_name')}</dd>
              <dt>性別</dt><dd>${v('gender')}</dd>
              <dt>年齢</dt><dd>${v('age')}</dd>
              <dt>功績点</dt><dd>${v('points')}</dd>
              <dt>階梯</dt><dd>第${v('tier_number')}階梯 ${v('tier_name')}</dd>
              <dt>領域</dt><dd>${v('area')}</dd>
              <dt>攻撃力</dt><dd>${v('attack')}</dd>
              <dt>防御力</dt><dd>${v('defense')}</dd>
              <dt>根源力</dt><dd>${v('kongen')}</dd>
              <dt>経歴/機関</dt><dd>${v('history')}</dd>
              <dt>信条</dt><dd>${v('belief')}</dd>
              <dt>表の顔</dt><dd>${v('face')}</dd>
            </dl>
          </div>
        </div>
        <div class="pv-col">
          <div class="pv-section">
            <h2>設定</h2>
            ${imageSrc ? `<div class="pv-image-wrap"><img src="${escapeHTML(imageSrc)}" class="pv-image" alt="設定画像" /></div>` : ''}
            <p class="pv-text">${escapeHTML(setting).replace(/\n/g, '<br>')}</p>
          </div>
          <div class="pv-section">
            <h2>真の姿</h2>
            <dl class="pv-dl">
              <dt>名称</dt><dd>${v('true_name')}</dd>
              <dt>効果</dt><dd>${v('true_effect')}</dd>
            </dl>
            <p class="pv-text">${escapeHTML(trueDesc).replace(/\n/g, '<br>')}</p>
          </div>
        </div>
      </div>
      <div class="pv-section pv-full">
        <h2>特技</h2>
        ${skillHTML}
        ${soulSkill ? `<p class="pv-soul">魂の特技：<strong>${escapeHTML(soulSkill)}</strong></p>` : ''}
      </div>
      <div class="pv-section pv-full">
        <h2>蔵書（修得魔法）</h2>
        ${spellHTML || '<p class="pv-empty">なし</p>'}
      </div>
      <div class="pv-section pv-full">
        <h2>関係</h2>
        ${relHTML || '<p class="pv-empty">なし</p>'}
      </div>
    </div>`;
  };

  initSheetImageOutput({ buildPreviewHTML, busyHTML: '⏳ 生成中...', fallbackBackground: '#f7efe3' });
}); // end DOMContentLoaded