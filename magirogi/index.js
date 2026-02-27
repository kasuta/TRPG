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
    spells.push({
      name: document.querySelector(`[name="spell_name_${i}"]`).value || '',
      type: document.querySelector(`[name="spell_type_${i}"]`).value || '',
      skill: document.querySelector(`[name="spell_skill_${i}"]`).value || '',
      target: document.querySelector(`[name="spell_target_${i}"]`).value || '',
      cost: document.querySelector(`[name="spell_cost_${i}"]`).value || '',
      effect: document.querySelector(`[name="spell_effect_${i}"]`).value || '',
      phrase: document.getElementById(`phrase_${i}`) ? document.getElementById(`phrase_${i}`).checked : false,
      ref: document.querySelector(`[name="spell_reference_p_${i}"]`).value || '',
      charges
    });
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
  const SPELL_ROW_SIZE = 9;

  const bindSpellTextarea = (textarea) => {
    if (textarea.dataset.resizeBound) return;
    textarea.dataset.resizeBound = 'true';
    textarea.addEventListener('input', () => resizeTextareaRow(spellList, '.spell-textarea', textarea.dataset.row));
    resizeTextareaRow(spellList, '.spell-textarea', textarea.dataset.row);
  };

  const addSpellRow = () => {
    spellCount++;
    const n = spellCount;
    const rowHTML = `
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
      <div class="box-container">
        <input type="checkbox" id="phrase_${n}" class="box-check"><label for="phrase_${n}" class="box-label"></label>
      </div>
      <input type="text" name="spell_reference_p_${n}" />`;
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
    addSpellRow();
    addSpellRow();
    spellList.querySelectorAll('.spell-textarea').forEach(bindSpellTextarea);

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
  // 5. セーブ・ロード
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

  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const data = { inputs: {}, checkboxes: {}, spells: [], relations: [], image: savedImageBase64 };

      document.querySelectorAll('input[type="text"], input[type="number"], select, textarea').forEach(el => {
        if (!el.name.startsWith('spell_') && !el.name.startsWith('relation_')) {
          data.inputs[el.id || el.name] = el.value;
        }
      });
      document.querySelectorAll('input[type="checkbox"]').forEach(el => {
        if (!el.id.startsWith('charge_') && !el.id.startsWith('phrase_') && !el.id.startsWith('relation_check_')) {
          data.checkboxes[el.id] = el.checked;
        }
      });
      data.spells = collectSpells();
      data.relations = collectRelations();

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
          if (data.spells) {
            while (document.querySelectorAll('.spell-textarea[name^="spell_name_"]').length > 0) removeSpellRow();
            data.spells.forEach((spell, idx) => {
              addSpellRow();
              const i = idx + 1;
              const q = (s) => document.querySelector(s);
              q(`[name="spell_name_${i}"]`).value = spell.name || '';
              q(`[name="spell_type_${i}"]`).value = spell.type || '召喚';
              q(`[name="spell_skill_${i}"]`).value = spell.skill || '';
              q(`[name="spell_target_${i}"]`).value = spell.target || '';
              q(`[name="spell_cost_${i}"]`).value = spell.cost || '';
              q(`[name="spell_effect_${i}"]`).value = spell.effect || '';
              q(`[name="spell_reference_p_${i}"]`).value = spell.ref || '';
              if (document.getElementById(`phrase_${i}`)) document.getElementById(`phrase_${i}`).checked = spell.phrase || false;
              if (spell.charges) spell.charges.forEach((ck, ci) => { const cb = document.getElementById(`charge_${i}_${ci + 1}`); if (cb) cb.checked = ck; });
              q(`[name="spell_effect_${i}"]`).dispatchEvent(new Event('input'));
            });
          }
          if (data.relations) {
            while (document.querySelectorAll('.relation-textarea[name^="relation_anchor_"]').length > 0) removeRelationRow();
            data.relations.forEach((rel, idx) => {
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
  // 6. ココフォリア用コピー
  // ──────────────────────────────
  const copyNameBtn = document.getElementById('copy_name_btn');
  const nameInput = document.getElementById('name');

  if (copyNameBtn && nameInput) {
    copyNameBtn.addEventListener('click', () => {
      const nameValue = nameInput.value;
      if (!nameValue) { alert('かりそめの名前が入力されていません。'); return; }

      let commands = 'ーーー特技ーーー\n';
      document.querySelectorAll('.skill-check:checked').forEach(cb => { commands += `2d6>=5《${cb.value}》\n`; });
      const soulSkill = getFirstValue(['soul_skill', 'true_skill']);
      if (soulSkill !== '0') commands += `2d6>=6《${soulSkill}》\n`;

      commands += '\nーーー魔法ーーー\n';
      collectSpells().forEach(sp => {
        if (sp.name) commands += `【${sp.name}】取得=/種別=${sp.type}/特技=${sp.skill}/目標=${sp.target}/コスト=${sp.cost}/${sp.ref}　効果：${sp.effect}\n`;
      });

      const trueName = getFirstValue(['true_name']);
      const trueEffect = getFirstValue(['true_effect']);
      commands += `\nーーー真の姿ーーー\n「${trueName === '0' ? '' : trueName}」【${trueEffect === '0' ? '' : trueEffect}】\n`;

      const attackVal = getFirstValue(['attack']);
      const defenseVal = getFirstValue(['defense']);
      const rootVal = getFirstValue(['kongen']);

      commands += `\nーーー戦闘ーーー
s1d1　　攻撃プロット（攻撃力={攻撃力}）
s{攻撃力}TZ6　攻撃ランダムプロット（攻撃力={攻撃力}）
s1d1　　防御プロット（防御力={防御力}）
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
      collectSpells().forEach(sp => {
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
  // 7. キャラシ画像生成 & コピー
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

    let skillHTML = '<table class="pv-skill-table"><thead><tr><th></th>';
    AREA_NAMES.forEach(a => { skillHTML += `<th>${a}</th>`; });
    skillHTML += '</tr></thead><tbody>';
    SKILL_TABLE.forEach((row, ri) => {
      skillHTML += `<tr><td class="pv-num">${ri + 2}</td>`;
      row.forEach(s => { skillHTML += `<td class="${skills.includes(s) ? 'pv-skill-on' : ''}">${s}</td>`; });
      skillHTML += '</tr>';
    });
    skillHTML += '</tbody></table>';

    let spellHTML = '';
    if (spells.length) {
      spellHTML = '<table class="pv-table"><thead><tr><th>魔法名</th><th>タイプ</th><th>指定特技</th><th>対象</th><th>コスト</th><th>チャージ</th><th>効果</th><th>呪句</th><th>参照p</th></tr></thead><tbody>';
      spells.forEach(sp => {
        spellHTML += `<tr><td>${escapeHTML(sp.name)}</td><td>${escapeHTML(sp.type)}</td><td>${escapeHTML(sp.skill)}</td><td>${escapeHTML(sp.target)}</td><td>${escapeHTML(sp.cost)}</td><td class="pv-charge">${chargeStr(sp.charges)}</td><td class="pv-effect">${escapeHTML(sp.effect)}</td><td>${sp.phrase ? '■' : '□'}</td><td>${escapeHTML(sp.ref)}</td></tr>`;
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
