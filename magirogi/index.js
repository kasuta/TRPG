// ==========================================
// マギカロギア キャラシ作成サイト - メインスクリプト
// ==========================================

// --- 共通ヘルパー ---

/** ID または name で要素を探し、値を返す。見つからなければ fallback を返す */
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

/** 蔵書データを収集 */
const collectSpells = () => {
  const spells = [];
  let i = 1;
  while (document.querySelector(`[name="spell_name_${i}"]`)) {
    const charges = [];
    for (let c = 1; c <= 5; c++) {
      const cb = document.getElementById(`charge_${i}_${c}`);
      charges.push(cb ? cb.checked : false);
    }
    const spell = { charges };
    SPELL_TEXT_FIELDS.forEach(({ key, attr }) => {
      const el = document.querySelector(`[name="spell_${attr}_${i}"]`);
      spell[key] = el ? el.value || '' : '';
    });
    spells.push(spell);
    i++;
  }
  return spells;
};

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

/** 蔵書の空行判定(魔法名・指定特技・対象・コスト・効果・呪句・参照p・チャージが全て空なら空行とみなす) */
const isEmptySpellRow = (row = {}) => !row.name && !row.skill && !row.target && !row.cost && !row.effect && !row.phrase && !row.ref && !(row.charges || []).some(Boolean);

/** 関係の空行判定 */
const isEmptyRelationRow = (row = {}) => !row.anchor && !row.fate && !row.attr && !row.setting;

/** 習得済み特技一覧を返す */
const getAcquiredSkills = () => {
  const skills = [];
  document.querySelectorAll('.skill-check:checked').forEach(cb => skills.push(cb.value));
  return skills;
};

/** テキストエリア行の高さ同期（汎用） */
const resizeTextareaRow = (container, selector, rowId) => {
  const rowTextareas = container.querySelectorAll(`${selector}[data-row="${rowId}"]`);
  if (!rowTextareas.length) return;
  rowTextareas.forEach(ta => { ta.style.height = 'auto'; });
  let maxHeight = 0;
  rowTextareas.forEach(ta => { maxHeight = Math.max(maxHeight, ta.scrollHeight); });
  rowTextareas.forEach(ta => { ta.style.height = `${maxHeight}px`; });
};

/** チャージ系チェックボックスの連動処理をバインド */
const bindChargeChecks = (container, rowNum) => {
  const checks = container.querySelectorAll(`input[type="checkbox"][data-charge-row="${rowNum}"]`);
  checks.forEach(cb => {
    cb.addEventListener('change', () => {
      const idx = Number(cb.dataset.chargeIndex || 0);
      checks.forEach(other => {
        const oi = Number(other.dataset.chargeIndex || 0);
        if (cb.checked) other.checked = oi <= idx;
        else if (oi >= idx) other.checked = false;
      });
    });
  });
};

/** HTML エスケープ */
const escapeHTML = (str) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ==========================================
// 画像プレビュー（defer で即時実行）
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
  // 1. 蔵書（魔法）セクション
  // ──────────────────────────────
  const spellList = document.getElementById('spell_list');
  const addSpellBtn = document.getElementById('add_spell_btn');
  const removeSpellBtn = document.getElementById('remove_spell_btn');
  let spellCount = 0;
  const SPELL_HEADER_COUNT = 9;
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

    for (let i = 1; i <= 5; i++) {
      const ida = document.getElementById(`charge_${rowA}_${i}`);
      const idb = document.getElementById(`charge_${rowB}_${i}`);
      if (ida && idb) {
        const tmp = ida.checked;
        ida.checked = idb.checked;
        idb.checked = tmp;
      }
    }

    [rowA, rowB].forEach(r => resizeTextareaRow(spellList, '.spell-textarea', String(r)));
  };

  const addSpellRow = () => {
    spellCount++;
    const n = spellCount;
    const rowHTML = `
      <div class="spell-row" data-row="${n}">
        <textarea name="spell_name_${n}" class="spell-textarea" rows="1" data-row="${n}"></textarea>
        <select name="spell_type_${n}">
          <option value="召喚">召喚</option>
          <option value="呪文">呪文</option>
          <option value="装備">装備</option>
        </select>
        <textarea name="spell_skill_${n}" class="spell-textarea" rows="1" data-row="${n}"></textarea>
        <textarea name="spell_target_${n}" class="spell-textarea" rows="1" data-row="${n}"></textarea>
        <textarea name="spell_cost_${n}" class="spell-textarea" rows="1" data-row="${n}"></textarea>
        <div class="box-container">
          <input type="checkbox" id="charge_${n}_1" class="box-check" data-charge-row="${n}" data-charge-index="1"><label for="charge_${n}_1" class="box-label"></label>
          <input type="checkbox" id="charge_${n}_2" class="box-check" data-charge-row="${n}" data-charge-index="2"><label for="charge_${n}_2" class="box-label"></label>
          <input type="checkbox" id="charge_${n}_3" class="box-check" data-charge-row="${n}" data-charge-index="3"><label for="charge_${n}_3" class="box-label"></label>
          <input type="checkbox" id="charge_${n}_4" class="box-check" data-charge-row="${n}" data-charge-index="4"><label for="charge_${n}_4" class="box-label"></label>
          <input type="checkbox" id="charge_${n}_5" class="box-check" data-charge-row="${n}" data-charge-index="5"><label for="charge_${n}_5" class="box-label"></label>
        </div>
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
        <span class="spell-phrase-arrow" aria-hidden="true">↳</span>
        <div class="spell-phrase-table">
          <div class="spell-phrase-label">呪句</div>
          <input type="text" name="spell_phrase_${n}" class="spell-phrase-input" data-row="${n}" placeholder="呪句を入力" />
        </div>
      </div>`;
    spellList.insertAdjacentHTML('beforeend', rowHTML);
    spellList.querySelectorAll(`.spell-textarea[data-row="${n}"]`).forEach(bindSpellTextarea);
    bindChargeChecks(spellList, n);
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
    setVal('input[name="spell_phrase_1"]', '「死の輪を踏みしめ、我が名を呼べ」');
    resizeTextareaRow(spellList, '.spell-textarea', '1');
  };

  if (spellList) {
    addSpellRow();
    addSpellRow();
    spellList.querySelectorAll('.spell-textarea').forEach(bindSpellTextarea);
    setDefaultSpellPreset();
  }
  if (addSpellBtn) addSpellBtn.addEventListener('click', addSpellRow);
  if (removeSpellBtn) removeSpellBtn.addEventListener('click', removeSpellRow);

  // ──────────────────────────────
  // 2. 魔力メーター
  // ──────────────────────────────
  const magicGroupMap = new Map();
  document.querySelectorAll('.magic-meter input[type="checkbox"][data-magic-group]').forEach(cb => {
    const g = cb.dataset.magicGroup || '';
    if (!magicGroupMap.has(g)) magicGroupMap.set(g, []);
    magicGroupMap.get(g).push(cb);
  });
  magicGroupMap.forEach(groupChecks => {
    groupChecks.forEach(cb => {
      cb.addEventListener('change', () => {
        const idx = Number(cb.dataset.magicIndex || 0);
        groupChecks.forEach(other => {
          const oi = Number(other.dataset.magicIndex || 0);
          if (cb.checked) other.checked = oi <= idx;
          else if (oi >= idx) other.checked = false;
        });
      });
    });
  });

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
  // 5. セーブ・ロード（.jsonファイル、従来どおり併存）
  // ──────────────────────────────
  const saveBtn = document.getElementById('save_data_btn');
  const loadFile = document.getElementById('load_data_file');
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
    const data = { inputs: {}, checkboxes: {}, spells: [], relations: [], image: savedImageBase64 };

    document.querySelectorAll('input[type="text"], input[type="number"], select, textarea').forEach(el => {
      if (el.closest('#history_panel')) return;
      if (!el.name) return;
      if (el.name.startsWith('spell_') || el.name.startsWith('relation_')) return;
      data.inputs[el.id || el.name] = el.value;
    });
    document.querySelectorAll('input[type="checkbox"]').forEach(el => {
      if (el.closest('#history_panel')) return;
      if (el.id.startsWith('charge_') || el.id.startsWith('relation_check_')) return;
      data.checkboxes[el.id] = el.checked;
    });
    data.spells = collectSpells().filter(row => !isEmptySpellRow(row));
    data.relations = collectRelations().filter(row => !isEmptyRelationRow(row));
    return data;
  };

  /** セーブデータ(JSON)を現在のフォームへ反映(前のキャラの残留を防ぐため、まず全体をクリアしてから適用) */
  const applyLoadedData = (data) => {
    document.querySelectorAll('input[type="text"], input[type="number"], select, textarea').forEach(el => {
      if (el.closest('#history_panel')) return;
      if (/^(spell_|relation_)/.test(el.name || '')) return;
      if (el.tagName === 'SELECT') el.selectedIndex = 0;
      else el.value = '';
    });
    document.querySelectorAll('.skill-check').forEach(cb => { cb.checked = false; });
    document.querySelectorAll('.gap-check').forEach(cb => { cb.checked = false; });
    document.querySelectorAll('.magic-meter input[type="checkbox"]').forEach(cb => { cb.checked = false; });
    savedImageBase64 = null;
    clearPreview();

    if (data.inputs) {
      for (const [key, value] of Object.entries(data.inputs)) {
        const el = document.getElementById(key) || document.querySelector(`[name="${key}"]`);
        if (el) { el.value = value; if (key === 'area') el.dispatchEvent(new Event('change')); }
      }
    }
    if (data.checkboxes) {
      for (const [key, checked] of Object.entries(data.checkboxes)) {
        const el = document.getElementById(key);
        if (el) el.checked = checked;
      }
    }

    while (document.querySelectorAll('.spell-textarea[name^="spell_name_"]').length > 0) removeSpellRow();
    if (data.spells) {
      data.spells.filter(row => !isEmptySpellRow(row)).forEach((spell, idx) => {
        addSpellRow();
        const i = idx + 1;
        const q = (s) => document.querySelector(s);
        q(`[name="spell_name_${i}"]`).value = spell.name || '';
        q(`[name="spell_type_${i}"]`).value = spell.type || '召喚';
        q(`[name="spell_skill_${i}"]`).value = spell.skill || '';
        q(`[name="spell_target_${i}"]`).value = spell.target || '';
        q(`[name="spell_cost_${i}"]`).value = spell.cost || '';
        q(`[name="spell_effect_${i}"]`).value = spell.effect || '';
        q(`[name="spell_phrase_${i}"]`).value = typeof spell.phrase === 'string' ? spell.phrase : '';
        q(`[name="spell_reference_p_${i}"]`).value = spell.ref || '';
        if (spell.charges) spell.charges.forEach((ck, ci) => { const cb = document.getElementById(`charge_${i}_${ci + 1}`); if (cb) cb.checked = ck; });
        q(`[name="spell_effect_${i}"]`).dispatchEvent(new Event('input'));
        q(`[name="spell_phrase_${i}"]`).dispatchEvent(new Event('input'));
      });
    }

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

    if (data.image) {
      savedImageBase64 = data.image;
      imagePreview.src = data.image;
      imagePreview.classList.add('is-visible');
      imageEmpty.hidden = true;
    }
  };

  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const data = buildSaveData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${getFieldValue('name', 'character')}_マギロギCS.json`;
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

  // ──────────────────────────────
  // 6. 共有用の圧縮データ形式(マギロギ用: 蔵書・関係。奥義/忍法は無し)
  // ──────────────────────────────
  const INPUT_KEY_MAP = {
    name: 'n', m_name: 'mn', gender: 'gd', age: 'a', points: 'pt',
    tier_number: 'tn', tier_name: 'tm', area: 'ar', attack: 'atk', defense: 'df',
    kongen: 'kg', history: 'hs', belief: 'bl', face: 'fc',
    magic_max: 'mm', magic_temp: 'mt', setting: 'st',
    true_name: 'trn', true_effect: 'tre', true_description: 'trd', soul_skill: 'ss',
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

  /** 蔵書行を短縮配列に変換([名前,タイプ,指定特技,対象,コスト,効果,参照p,チャージ(5桁の01文字列),呪句]) */
  const spellsToArrays = (spells) => spells.map(sp => trimTrailingEmpty([
    sp.name || '', sp.type || '', sp.skill || '', sp.target || '', sp.cost || '', sp.effect || '', sp.ref || '',
    (sp.charges || []).map(c => c ? '1' : '0').join(''),
    typeof sp.phrase === 'string' ? sp.phrase : '',
  ]));
  const arraysToSpells = (arrs) => arrs.map(arr => ({
    name: arr[0] || '', type: arr[1] || '召喚', skill: arr[2] || '', target: arr[3] || '', cost: arr[4] || '',
    effect: arr[5] || '', ref: arr[6] || '',
    charges: (arr[7] || '').split('').map(c => c === '1'),
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
      let magicMaxLevel = 0;
      let magicTempLevel = 0;
      const others = [];
      Object.entries(data.checkboxes).forEach(([id, checked]) => {
        if (!checked) return;
        const m = id.match(SKILL_ID_RE);
        if (m) { skills.push(packSkillIndex(Number(m[1]), Number(m[2]))); return; }
        const mm = id.match(/^magic_max_(\d+)$/);
        if (mm) { magicMaxLevel = Math.max(magicMaxLevel, Number(mm[1])); return; }
        const mt = id.match(/^magic_temp_(\d+)$/);
        if (mt) { magicTempLevel = Math.max(magicTempLevel, Number(mt[1])); return; }
        others.push(id); // gap1〜gap5など
      });
      if (skills.length) compact.sk = skills;
      if (magicMaxLevel) compact.mgm = magicMaxLevel;
      if (magicTempLevel) compact.mgt = magicTempLevel;
      if (others.length) compact.cb = others;
    }
    if (data.spells && data.spells.length) compact.sp = spellsToArrays(data.spells);
    if (data.relations && data.relations.length) compact.rl = relationsToArrays(data.relations);
    return compact;
  };

  /** compactifyForShareの逆変換(applyLoadedDataが読める形へ復元) */
  const expandFromShare = (compact = {}) => {
    const data = { inputs: {}, checkboxes: {}, spells: [], relations: [] };
    if (compact.i) {
      Object.entries(compact.i).forEach(([k, v]) => { data.inputs[INPUT_KEY_MAP_REV[k] || k] = v; });
    }
    if (compact.sk) {
      compact.sk.forEach(idx => {
        const { row, col } = unpackSkillIndex(idx);
        data.checkboxes[`skill_r${row}_c${col}`] = true;
      });
    }
    if (compact.mgm) {
      for (let n = 1; n <= compact.mgm; n++) data.checkboxes[`magic_max_${n}`] = true;
    }
    if (compact.mgt) {
      for (let n = 1; n <= compact.mgt; n++) data.checkboxes[`magic_temp_${n}`] = true;
    }
    if (compact.cb) compact.cb.forEach(id => { data.checkboxes[id] = true; });
    if (compact.sp) data.spells = arraysToSpells(compact.sp);
    if (compact.rl) data.relations = arraysToRelations(compact.rl);
    return data;
  };

  // ──────────────────────────────
  // 7. アカウント・履歴・共有リンク(sinobigamiと共通Worker、gameで区別)
  // ──────────────────────────────
  const API_BASE = 'https://sinobigami-api.kasu-kasu.workers.dev';
  const CURRENT_GAME = 'magirogi';
  const GAME_LABEL = { sinobigami: 'シノビガミ', magirogi: 'マギロギ' };
  let currentCharacterId = null;

  /** 保存履歴(localStorage)に記録する */
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

  /** 一覧を描画する共通処理(ゲーム種別バッジ付き) */
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
    const badge = h.game ? `<span class="history-item-game-badge badge-${h.game}">${GAME_LABEL[h.game] || h.game}</span>` : '';
    const TRASH_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>';

    const deleteBtn = h.deletable
      ? `<button type="button" class="history-item-delete" data-delete-id="${h.id}" data-delete-type="${h.deleteType || 'local'}" title="削除">${TRASH_ICON}</button>`
      : '';
    return `
      <div class="history-item" data-id="${h.id}" data-game="${h.game || ''}">
        <div class="history-item-info">
          <div class="history-item-name">${badge}${escapeHTML(h.name || '(名前未設定)')}</div>
          <div class="history-item-date">${dateStr}</div>
        </div>
        ${deleteBtn}
      </div>`;
  }).join('');
};

  /** ゲスト履歴を描画する */
  const renderGuestHistory = () => {
    const title = document.getElementById('history_list_title');
    if (title) title.textContent = 'ゲスト履歴';
    const tabs = document.getElementById('game_filter_tabs');
    if (tabs) tabs.style.display = 'none';
    const items = getHistory()
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .map(h => ({ ...h, deletable: true }));
    renderListItems(items);
  };

  let myCharactersCache = [];
  let gameFilter = localStorage.getItem('characterListFilter') || 'all';

  const applyGameFilter = () => {
    const filtered = gameFilter === 'all' ? myCharactersCache : myCharactersCache.filter(c => c.game === gameFilter);
    renderListItems(filtered.map(c => ({ ...c, deletable: true, deleteType: 'server' })));
  };

  /** サーバー上のキャラクターを削除する */
  const deleteCharacterFromServer = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/character/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      if (!res.ok) throw new Error('削除に失敗しました');
      myCharactersCache = myCharactersCache.filter(c => c.id !== id);
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
    const listEl = document.getElementById('history_list');
    if (listEl) listEl.innerHTML = '<p class="history-empty">読み込み中...</p>';

    try {
      const res = await fetch(`${AUTH_API_BASE}/api/my-characters`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      if (!res.ok) throw new Error('取得に失敗しました');
      myCharactersCache = await res.json();
      applyGameFilter();
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

  // ゲーム種別フィルタタブ
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

  const historyToggleBtn = document.getElementById('history_toggle_btn');
  const historyPanel = document.getElementById('history_panel');
  const historyCloseBtn = document.getElementById('history_close_btn');
  const historyListEl = document.getElementById('history_list');

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
      const item = e.target.closest('.history-item');
      if (item) {
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
  }

  /** キャラクターシートを新規作成用に初期状態へリセットする */
  const resetCharacterForm = () => {
    document.querySelectorAll('input[type="text"], input[type="number"], select, textarea').forEach(el => {
      if (el.closest('#history_panel')) return;
      if (/^(spell_|relation_)/.test(el.name || '')) return;
      if (el.tagName === 'SELECT') el.selectedIndex = 0;
      else el.value = '';
    });
    document.querySelectorAll('.skill-check').forEach(cb => { cb.checked = false; });
    document.querySelectorAll('.gap-check').forEach(cb => { cb.checked = false; });
    document.querySelectorAll('.magic-meter input[type="checkbox"]').forEach(cb => { cb.checked = false; });

    savedImageBase64 = null;
    clearPreview();
    if (imageInput) imageInput.value = '';

    while (document.querySelectorAll('.spell-textarea[name^="spell_name_"]').length > 0) removeSpellRow();
    addSpellRow();
    addSpellRow();
    setDefaultSpellPreset();

    while (document.querySelectorAll('.relation-textarea[name^="relation_anchor_"]').length > 0) removeRelationRow();
    addRelationRow();

    currentCharacterId = null;
    history.replaceState(null, '', window.location.pathname + window.location.search);
  };

const newCharacterModal = document.getElementById('new_character_modal');
const newCharChoiceSinobigami = document.getElementById('new_char_choice_sinobigami');
const newCharChoiceMagirogi = document.getElementById('new_char_choice_magirogi');
const newCharacterModalCancel = document.getElementById('new_character_modal_cancel');

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
if (newCharacterModalCancel) newCharacterModalCancel.addEventListener('click', closeNewCharacterModal);
if (newCharacterModal) newCharacterModal.addEventListener('click', (e) => { if (e.target === newCharacterModal) closeNewCharacterModal(); });
  /** キャラクターを保存する(currentCharacterIdの有無で新規/更新を自動判定) */
  const saveCharacter = async () => {
    const data = buildSaveData();
    const imageBase64 = data.image;
    delete data.image;
    const compact = compactifyForShare(data);

    const authHeaders = getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {};

    let id;
    if (currentCharacterId) {
      const res = await fetch(`${API_BASE}/api/update/${currentCharacterId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify(compact),
      });
      if (!res.ok) throw new Error('更新に失敗しました');
      id = currentCharacterId;
    } else {
      const res = await fetch(`${API_BASE}/api/save?game=${CURRENT_GAME}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify(compact),
      });
      if (!res.ok) throw new Error('保存に失敗しました');
      const json = await res.json();
      id = json.id;
      currentCharacterId = id;
    }

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
        if (getAuthToken()) renderMyCharacters();
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

  const shareBtn = document.getElementById('share_link_btn');
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
  // 8. ココフォリア用コピー
  // ──────────────────────────────
  const copyNameBtn = document.getElementById('copy_name_btn');
  const nameInput = document.getElementById('name');

  if (copyNameBtn && nameInput) {
    copyNameBtn.addEventListener('click', () => {
      const nameValue = nameInput.value;
      if (!nameValue) { alert('かりそめの名前が入力されていません。'); return; }

      let commands = 'ーーー特技ーーー\n';
      document.querySelectorAll('.skill-check:checked').forEach(cb => { commands += `2d6>=5 《${cb.value}》\n`; });
      const soulSkill = getFirstValue(['soul_skill', 'true_skill']);
      if (soulSkill !== '0') commands += `2d6>=6 《${soulSkill}》\n`;

      const ccfoliaSpells = collectSpells();

      commands += '\nーーー魔法ーーー\n';
      ccfoliaSpells.forEach(sp => {
        if (sp.name) {
          const effectOneLine = sp.effect.replace(/\r?\n/g, '');
          commands += `【${sp.name}】(取得=/種別=${sp.type}/特技=${sp.skill}/目標=${sp.target}/コスト=${sp.cost}/${sp.ref})効果：${effectOneLine}\n`;
        }
      });

      const trueName = getFirstValue(['true_name']);
      const trueEffect = getFirstValue(['true_effect']);
      commands += `\nーーー真の姿ーーー\n「${trueName === '0' ? '' : trueName}」【${trueEffect === '0' ? '' : trueEffect}】\n`;

      const attackVal = getFirstValue(['attack']);
      const defenseVal = getFirstValue(['defense']);
      const rootVal = getFirstValue(['kongen']);

      commands += `\nーーー呪句ーーー\n`;
      ccfoliaSpells.forEach(sp => {
        if (sp.name && sp.phrase) {
          const phraseOneLine = sp.phrase.replace(/\r?\n/g, '');
          commands += `呪句【${sp.name}】${phraseOneLine}\n`;
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

      const magicMax = getFirstValue(['magic_max']);
      const tempMagic = getFirstValue(['magic_temp']);
      const statusArr = [
        { label: '魔力', value: Number(magicMax), max: Number(magicMax) },
        { label: '一時的魔力', value: Number(tempMagic), max: Number(tempMagic) }
      ];
      ccfoliaSpells.forEach(sp => {
        if (sp.name) statusArr.push({ label: `${sp.name}:${sp.cost}`, value: 0, max: Number(rootVal) });
      });

      const paramsArr = [
        { label: '攻撃力', value: String(attackVal) },
        { label: '防御力', value: String(defenseVal) },
        { label: '根源力', value: String(rootVal) }
      ];

      const ccfoliaData = {
        kind: 'character',
        data: { name: nameValue, initiative: 1, commands, status: statusArr, params: paramsArr }
      };

      navigator.clipboard.writeText(JSON.stringify(ccfoliaData))
        .then(() => alert('ココフォリア用のキャラクターデータをクリップボードにコピーしました！\nそのままココフォリアの盤面で Ctrl+V（ペースト）してください。'))
        .catch(err => { console.error('コピーに失敗しました', err); alert('コピーに失敗しました。'); });
    });
  }

  // ──────────────────────────────
  // 9. キャラシ画像生成 & コピー
  // ──────────────────────────────
  const screenshotBtn = document.getElementById('screenshot_btn');
  if (!screenshotBtn) return;

  const getMagicChecked = (group) => {
    let max = 0;
    document.querySelectorAll(`input[data-magic-group="${group}"]:checked`).forEach(cb => {
      max = Math.max(max, Number(cb.dataset.magicIndex || 0));
    });
    return max;
  };

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

  const chargeStr = (charges) => charges.map(c => c ? '■' : '□').join('');

  const magicBar = (current, max) => {
    const n = Number(max) || 0;
    const c = Number(current) || 0;
    if (!n) return '―';
    let bar = '';
    for (let i = 1; i <= n; i++) bar += i <= c ? '●' : '○';
    return bar;
  };

  const buildPreviewHTML = () => {
    const v = (id) => escapeHTML(getFieldValue(id));
    const magicMax = getFieldValue('magic_max');
    const magicTemp = getFieldValue('magic_temp');
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
      spellHTML = '<table class="pv-table"><thead><tr><th>魔法名</th><th>タイプ</th><th>指定特技</th><th>対象</th><th>コスト</th><th>チャージ</th><th>効果</th><th>呪句</th><th>参照p</th></tr></thead><tbody>';
      spells.forEach(sp => {
        spellHTML += `<tr><td>${escapeHTML(sp.name)}</td><td>${escapeHTML(sp.type)}</td><td>${escapeHTML(sp.skill)}</td><td>${escapeHTML(sp.target)}</td><td>${escapeHTML(sp.cost)}</td><td class="pv-charge">${chargeStr(sp.charges)}</td><td class="pv-effect">${escapeHTML(sp.effect)}</td><td>${escapeHTML(sp.phrase || '□')}</td><td>${escapeHTML(sp.ref)}</td></tr>`;
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
          <div class="pv-section">
            <h2>魔力</h2>
            <dl class="pv-dl">
              <dt>魔力の最大値 (${escapeHTML(magicMax)})</dt><dd class="pv-bar">${magicBar(getMagicChecked('magic_max'), magicMax)}</dd>
              <dt>一時的魔力 (${escapeHTML(magicTemp)})</dt><dd class="pv-bar">${magicBar(getMagicChecked('magic_temp'), magicTemp)}</dd>
            </dl>
          </div>
        </div>
        <div class="pv-col">
          <div class="pv-section">
            <h2>設定</h2>
            ${imageSrc ? `<div class="pv-image-wrap"><img src="${imageSrc}" class="pv-image" alt="設定画像" /></div>` : ''}
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

  screenshotBtn.addEventListener('click', async () => {
    const originalText = screenshotBtn.textContent;
    screenshotBtn.textContent = '⏳ 生成中...';
    screenshotBtn.disabled = true;

    try {
      const container = document.createElement('div');
      container.id = 'preview-render-container';
      container.innerHTML = buildPreviewHTML();
      document.body.appendChild(container);

      await new Promise(resolve => setTimeout(resolve, 200));

      const canvas = await html2canvas(container.querySelector('.pv-sheet'), {
        useCORS: true, scale: 2, backgroundColor: '#f7efe3'
      });
      document.body.removeChild(container);

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
      screenshotBtn.textContent = originalText;
      screenshotBtn.disabled = false;
    }
  });

}); // end DOMContentLoaded