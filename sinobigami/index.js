// ==========================================
// シノビガミ キャラシ作成サイト - メインスクリプト
// ==========================================

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
      ref: document.querySelector(`[name="ougi_ref_${i}"]`).value || '',
    });
    i++;
  }
  return ougi;
};

/** 忍法データを収集 */
const collectNinpo = () => {
  const ninpo = [];
  let i = 1;
  while (document.querySelector(`[name="ninpo_name_${i}"]`)) {
    ninpo.push({
      name: document.querySelector(`[name="ninpo_name_${i}"]`).value || '',
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
      <input type="text" name="ougi_ref_${n}" />`;
    ougiList.insertAdjacentHTML('beforeend', rowHTML);
    ougiList.querySelectorAll(`.ougi-textarea[data-row="o${n}"]`).forEach(bindOugiTextarea);
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
  const ninpoList = document.getElementById('ninpo_list');
  const addNinpoBtn = document.getElementById('add_ninpo_btn');
  const removeNinpoBtn = document.getElementById('remove_ninpo_btn');
  let ninpoCount = 0;
  const NINPO_HEADER_COUNT = 7;
  const NINPO_ROW_SIZE = 7;

  const bindNinpoTextarea = (textarea) => {
    if (textarea.dataset.resizeBound) return;
    textarea.dataset.resizeBound = 'true';
    textarea.addEventListener('input', () => resizeTextareaRow(ninpoList, '.ninpo-textarea', textarea.dataset.row));
    resizeTextareaRow(ninpoList, '.ninpo-textarea', textarea.dataset.row);
  };

  const addNinpoRow = () => {
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
      <input type="text" name="ninpo_ref_${n}" />`;
    ninpoList.insertAdjacentHTML('beforeend', rowHTML);
    ninpoList.querySelectorAll(`.ninpo-textarea[data-row="${n}"]`).forEach(bindNinpoTextarea);
  };

  const removeNinpoRow = () => {
    if (!ninpoList || ninpoList.children.length <= NINPO_HEADER_COUNT || ninpoCount === 0) return;
    for (let i = 0; i < NINPO_ROW_SIZE; i++) {
      if (ninpoList.lastElementChild) ninpoList.removeChild(ninpoList.lastElementChild);
    }
    ninpoCount = Math.max(0, ninpoCount - 1);
  };

  if (ninpoList) {
    addNinpoRow();
    // 1行目にデフォルト値を設定
    const setVal = (name, val) => { const el = document.querySelector(`[name="${name}"]`); if (el) el.value = val; };
    setVal('ninpo_name_1', '接近戦攻撃');
    setVal('ninpo_type_1', '攻撃');
    setVal('ninpo_range_1', '1');
    setVal('ninpo_cost_1', '0');
    setVal('ninpo_effect_1', '接近戦ダメージを1点与える。');
    setVal('ninpo_ref_1', '基78');
    addNinpoRow();
    ninpoList.querySelectorAll('.ninpo-textarea').forEach(bindNinpoTextarea);
  }
  if (addNinpoBtn) addNinpoBtn.addEventListener('click', addNinpoRow);
  if (removeNinpoBtn) removeNinpoBtn.addEventListener('click', removeNinpoRow);

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
  // 3. セーブ・ロード
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
      data.ougi = collectOugi();
      data.ninpo = collectNinpo();
      data.haikei = collectHaikei();
      data.relations = collectRelations();

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
            data.ougi.forEach((og, idx) => {
              addOugiRow();
              const i = idx + 1;
              const q = (s) => document.querySelector(s);
              q(`[name="ougi_name_${i}"]`).value = og.name || '';
              q(`[name="ougi_skill_${i}"]`).value = og.skill || '';
              q(`[name="ougi_kaizou_${i}"]`).value = og.kaizou || '';
              q(`[name="ougi_effect_${i}"]`).value = og.effect || '';
              q(`[name="ougi_ref_${i}"]`).value = og.ref || '';
              q(`[name="ougi_effect_${i}"]`).dispatchEvent(new Event('input'));
            });
          }
          if (data.ninpo) {
            while (document.querySelectorAll('.ninpo-textarea[name^="ninpo_name_"]').length > 0) removeNinpoRow();
            data.ninpo.forEach((np, idx) => {
              addNinpoRow();
              const i = idx + 1;
              const q = (s) => document.querySelector(s);
              q(`[name="ninpo_name_${i}"]`).value = np.name || '';
              q(`[name="ninpo_type_${i}"]`).value = np.type || '攻撃';
              q(`[name="ninpo_skill_${i}"]`).value = np.skill || '';
              q(`[name="ninpo_range_${i}"]`).value = np.range || '';
              q(`[name="ninpo_cost_${i}"]`).value = np.cost || '';
              q(`[name="ninpo_effect_${i}"]`).value = np.effect || '';
              q(`[name="ninpo_ref_${i}"]`).value = np.ref || '';
              q(`[name="ninpo_effect_${i}"]`).dispatchEvent(new Event('input'));
            });
          }
          if (data.haikei) {
            while (document.querySelectorAll('.haikei-textarea[name^="haikei_name_"]').length > 0) removeHaikeiRow();
            data.haikei.forEach((hk, idx) => {
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
            data.relations.forEach((rel, idx) => {
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
        commands += `2d6>=5《${cb.value}》\n`;
      });
      const specialSkill = getFieldValue('special_skill');
      if (specialSkill) commands += `\n特記: ${specialSkill}\n`;

      commands += '\nーーー奥義ーーー\n';
      collectOugi().forEach(og => {
        if (og.name) commands += `「${og.name}」指定特技=${og.skill}/間合=${og.range}/コスト=${og.cost}/${og.ref}\n効果：${og.effect}\n`;
      });

      commands += '\nーーー忍法ーーー\n';
      collectNinpo().forEach(np => {
        if (np.name) commands += `【${np.name}】タイプ=${np.type}/特技=${np.skill}/間合=${np.range}/コスト=${np.cost}/${np.ref}　効果：${np.effect}\n`;
      });

      commands += `\nーーー表ーーー
ST　シーン表
FT　ファンブル表
ET　感情表
WT　変調表
BT　戦場表
GST　汎用シーン表
GAST　汎用先攻シーン表
GKT　汎用感情表`;

      const lifeExtra = getFieldValue('life_extra', '0');

      const statusArr = [
        { label: '追加生命力', value: Number(lifeExtra), max: Number(lifeExtra) }
      ];

      const paramsArr = [
        { label: '功績点', value: String(getFieldValue('points', '0')) }
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

  let isHidden = true;
  if (hideToggleBtn) {
    // 初期状態で隠す
    document.body.classList.add('hidden-mode');
    if (ougiSection) { ougiSection.classList.add('hideable-section'); ougiSection.dataset.hideLabel = '奥義'; }
    if (ninguSection) { ninguSection.classList.add('hideable-section'); ninguSection.dataset.hideLabel = '忍具'; }
    hideToggleBtn.textContent = '表示する';

    hideToggleBtn.addEventListener('click', () => {
      isHidden = !isHidden;
      document.body.classList.toggle('hidden-mode', isHidden);
      if (ougiSection) { ougiSection.classList.toggle('hideable-section', isHidden); ougiSection.dataset.hideLabel = '奥義'; }
      if (ninguSection) { ninguSection.classList.toggle('hideable-section', isHidden); ninguSection.dataset.hideLabel = '忍具'; }
      hideToggleBtn.textContent = isHidden ? '表示する' : '隠す';
    });
  }

  // ──────────────────────────────
  // 5. キャラシ画像生成 & コピー
  // ──────────────────────────────
  const screenshotBtn = document.getElementById('screenshot_btn');
  if (!screenshotBtn) return;

  const AREA_NAMES = ['器術', '体術', '忍術', '謀術', '戦術', '妖術'];
  const SKILL_TABLE = [
    ['絡繰術','騎馬術','生存術','医術','兵糧術','異形化'],
    ['火術','砲術','潜伏術','毒術','鳴子術','召喚術'],
    ['水術','手裏剣術','遁走術','罠術','写し身の術','死霊術'],
    ['針術','手練','盗聴術','詐術','地の利','結界術'],
    ['仕込み','身体操術','腹話術','対人術','罠術','封術'],
    ['衣装術','歩法','隠形術','遊芸','意気','言霊術'],
    ['縄術','走法','変装術','九ノ一の術','用兵術','幻術'],
    ['登術','飛術','香術','傀儡の術','記憶術','瞳術'],
    ['盗術','骨法術','分身の術','流言の術','見敵術','千里眼の術'],
    ['幻術','刀術','壁抜けの術','経済力','暗号術','憑依術'],
    ['対人術','怪力','偵察術','混乱術','軍略','呪術']
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

    let skillHTML = '<table class="pv-skill-table"><thead><tr><th></th>';
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
      ougiHTML = '<table class="pv-table"><thead><tr><th>奥義名</th><th>指定特技</th><th>改造</th><th>エフェクト</th><th>参照p</th></tr></thead><tbody>';
      ougi.forEach(og => {
        ougiHTML += `<tr><td>${escapeHTML(og.name)}</td><td>${escapeHTML(og.skill)}</td><td>${escapeHTML(og.kaizou)}</td><td class="pv-effect">${escapeHTML(og.effect)}</td><td>${escapeHTML(og.ref)}</td></tr>`;
      });
      ougiHTML += '</tbody></table>';
    }

    let ninpoHTML = '';
    if (ninpo.length) {
      ninpoHTML = '<table class="pv-table"><thead><tr><th>忍法名</th><th>タイプ</th><th>指定特技</th><th>間合い</th><th>コスト</th><th>効果</th><th>参照p</th></tr></thead><tbody>';
      ninpo.forEach(np => {
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
        useCORS: true, scale: 2, backgroundColor: '#f0e8e0'
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
