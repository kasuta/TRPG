const imageInput = document.getElementById("setting_image");
const imagePreview = document.getElementById("setting_image_preview");
const imageEmpty = document.getElementById("setting_image_empty");

let previewUrl = null;

const clearPreview = () => {
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
    previewUrl = null;
  }
  imagePreview.removeAttribute("src");
  imagePreview.classList.remove("is-visible");
  imageEmpty.hidden = false;
};

imageInput.addEventListener("change", () => {
  const file = imageInput.files && imageInput.files[0];

  if (!file) {
    clearPreview();
    return;
  }

  if (!file.type.startsWith("image/")) {
    clearPreview();
    imageEmpty.textContent = "画像ファイルを選択してください";
    return;
  }

  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
  }

  previewUrl = URL.createObjectURL(file);
  imagePreview.src = previewUrl;
  imagePreview.classList.add("is-visible");
  imageEmpty.hidden = true;
});

// ページが読み込まれたら実行
// ページが読み込まれたら実行
document.addEventListener('DOMContentLoaded', () => {
    const spellList = document.getElementById('spell_list');
    const addSpellBtn = document.getElementById('add_spell_btn');
  const removeSpellBtn = document.getElementById('remove_spell_btn');
    
    let spellCount = 0;
  const headerCount = 8;
  const rowSize = 8;

    const resizeSpellRow = (rowId) => {
      const rowTextareas = spellList.querySelectorAll(`.spell-textarea[data-row="${rowId}"]`);
      if (!rowTextareas.length) {
        return;
      }

      // 変更前はここに let maxHeight = 0; がありましたが、処理を分割します

      // 1. まず同じ行の【すべて】のテキストエリアの高さを一斉にリセットする
      rowTextareas.forEach((textarea) => {
        textarea.style.height = 'auto';
      });

      // 2. その後、リセットされた状態での本来の高さ（scrollHeight）から最大値を取得する
      let maxHeight = 0;
      rowTextareas.forEach((textarea) => {
        maxHeight = Math.max(maxHeight, textarea.scrollHeight);
      });

      // 3. 全てのテキストエリアに最大の高さを設定する
      rowTextareas.forEach((textarea) => {
        textarea.style.height = `${maxHeight}px`;
      });
    };

    const bindSpellTextarea = (textarea) => {
      if (textarea.dataset.resizeBound) {
        return;
      }
      const rowId = textarea.dataset.row;
      textarea.dataset.resizeBound = 'true';
      textarea.addEventListener('input', () => {
        resizeSpellRow(rowId);
      });
      resizeSpellRow(rowId);
    };

    function addSpellRow() {
        spellCount++;
        
        // ▼▼ ここから下の rowHTML の中身を変更 ▼▼
        const rowHTML = `
            <textarea name="spell_name_${spellCount}" class="spell-textarea" rows="1" data-row="${spellCount}"></textarea>
            
            <select name="spell_type_${spellCount}">
                <option value="召喚">召喚</option>
                <option value="呪文">呪文</option>
                <option value="装備">装備</option>
            </select>
            
            <textarea name="spell_skill_${spellCount}" class="spell-textarea" rows="1" data-row="${spellCount}"></textarea>
            <textarea name="spell_cost_${spellCount}" class="spell-textarea" rows="1" data-row="${spellCount}"></textarea>
            
            <div class="box-container">
              <input type="checkbox" id="charge_${spellCount}_1" class="box-check" data-charge-row="${spellCount}" data-charge-index="1"><label for="charge_${spellCount}_1" class="box-label"></label>
              <input type="checkbox" id="charge_${spellCount}_2" class="box-check" data-charge-row="${spellCount}" data-charge-index="2"><label for="charge_${spellCount}_2" class="box-label"></label>
              <input type="checkbox" id="charge_${spellCount}_3" class="box-check" data-charge-row="${spellCount}" data-charge-index="3"><label for="charge_${spellCount}_3" class="box-label"></label>
              <input type="checkbox" id="charge_${spellCount}_4" class="box-check" data-charge-row="${spellCount}" data-charge-index="4"><label for="charge_${spellCount}_4" class="box-label"></label>
              <input type="checkbox" id="charge_${spellCount}_5" class="box-check" data-charge-row="${spellCount}" data-charge-index="5"><label for="charge_${spellCount}_5" class="box-label"></label>
            </div>
            
            <textarea name="spell_effect_${spellCount}" class="spell-textarea" rows="1" data-row="${spellCount}"></textarea>
            
            <div class="box-container">
              <input type="checkbox" id="phrase_${spellCount}" class="box-check"><label for="phrase_${spellCount}" class="box-label"></label>
            </div>

            <input type="text" name="spell_reference_p_${spellCount}" />
        `;
        // ▲▲ 変更はここまで ▲▲
        
        spellList.insertAdjacentHTML('beforeend', rowHTML);

        const newTextareas = spellList.querySelectorAll(`.spell-textarea[data-row="${spellCount}"]`);
        newTextareas.forEach(bindSpellTextarea);

        const chargeChecks = spellList.querySelectorAll(`input[type="checkbox"][data-charge-row="${spellCount}"]`);
        chargeChecks.forEach((checkbox) => {
          checkbox.addEventListener('change', () => {
            const currentIndex = Number(checkbox.dataset.chargeIndex || 0);
            chargeChecks.forEach((other) => {
              const otherIndex = Number(other.dataset.chargeIndex || 0);
              if (checkbox.checked) {
                other.checked = otherIndex <= currentIndex;
              } else if (otherIndex >= currentIndex) {
                other.checked = false;
              }
            });
          });
        });
    }

      function removeSpellRow() {
        if (!spellList) {
          return;
        }

        const totalCells = spellList.children.length;
        if (totalCells <= headerCount || spellCount === 0) {
          return;
        }

        for (let i = 0; i < rowSize; i++) {
          const lastCell = spellList.lastElementChild;
          if (!lastCell) {
            break;
          }
          spellList.removeChild(lastCell);
        }

        spellCount = Math.max(0, spellCount - 1);
      }

    if (spellList) {
        addSpellRow();
        addSpellRow();
      spellList.querySelectorAll('.spell-textarea').forEach(bindSpellTextarea);

      const setSpellValue = (selector, value) => {
        const field = spellList.querySelector(selector);
        if (!field) {
          return;
        }
        field.value = value;
        field.dispatchEvent(new Event('input'));
      };

      setSpellValue('textarea[name="spell_name_1"]', '緊急召喚');
      setSpellValue('select[name="spell_type_1"]', '召喚');
      setSpellValue('textarea[name="spell_skill_1"]', '可変');
      setSpellValue('textarea[name="spell_cost_1"]', 'なし');
      setSpellValue(
        'textarea[name="spell_effect_1"]',
        '１Ｄ６を振って分野をランダムに決め、その後２Ｄ６を振ってランダムに特技一つを選ぶ。それが指定特技になる。その特技の判定に成功すると、その特技に対応した精霊一体を召喚できる'
      );
      resizeSpellRow(1);
    }

    if (addSpellBtn) {
        addSpellBtn.addEventListener('click', addSpellRow);
    }

    if (removeSpellBtn) {
      removeSpellBtn.addEventListener('click', removeSpellRow);
    }
});

document.addEventListener('DOMContentLoaded', () => {
  const magicChecks = document.querySelectorAll('.magic-meter input[type="checkbox"][data-magic-group]');
  if (!magicChecks.length) {
    return;
  }

  const groupMap = new Map();
  magicChecks.forEach((checkbox) => {
    const group = checkbox.dataset.magicGroup || '';
    if (!groupMap.has(group)) {
      groupMap.set(group, []);
    }
    groupMap.get(group).push(checkbox);
  });

  groupMap.forEach((groupChecks) => {
    groupChecks.forEach((checkbox) => {
      checkbox.addEventListener('change', () => {
        const currentIndex = Number(checkbox.dataset.magicIndex || 0);
        groupChecks.forEach((other) => {
          const otherIndex = Number(other.dataset.magicIndex || 0);
          if (checkbox.checked) {
            other.checked = otherIndex <= currentIndex;
          } else if (otherIndex >= currentIndex) {
            other.checked = false;
          }
        });
      });
    });
  });
});

// 領域選択時に対応するギャップを黒くする処理
document.addEventListener('DOMContentLoaded', () => {
  const areaSelect = document.getElementById('area');
  // gap1 〜 gap5 のチェックボックスを取得
  const gaps = [
    document.getElementById('gap1'),
    document.getElementById('gap2'),
    document.getElementById('gap3'),
    document.getElementById('gap4'),
    document.getElementById('gap5')
  ];

  if (areaSelect) {
    areaSelect.addEventListener('change', (e) => {
      // 領域が変更されたら、一度すべてのギャップの黒塗り（チェック）をリセットする
      gaps.forEach(gap => {
        if (gap) gap.checked = false;
      });

      // 選択された領域に対応するギャップを黒くする
      const selectedArea = e.target.value;
      switch (selectedArea) {
        case '星':
          if (gaps[0]) gaps[0].checked = true; // gap1 (星と獣の間)
          break;
        case '獣':
          if (gaps[0]) gaps[0].checked = true; // gap2 (獣と力の間)
          if (gaps[1]) gaps[1].checked = true; // gap2 (獣と力の間)
          break;
        case '力':
          if (gaps[1]) gaps[1].checked = true; // gap2 (獣と力の間)
          if (gaps[2]) gaps[2].checked = true; // gap3 (力と歌の間)
          break;
        case '歌':
          if (gaps[2]) gaps[2].checked = true; // gap3 (力と歌の間)
          if (gaps[3]) gaps[3].checked = true; // gap4 (歌と夢の間)
          break;
        case '夢':
          if (gaps[3]) gaps[3].checked = true; // gap4 (歌と夢の間)
          if (gaps[4]) gaps[4].checked = true; // gap5 (夢と闇の間)
          break;
        case '闇':
          if (gaps[4]) gaps[4].checked = true; // gap5 (夢と闇の間)
          // ルール上は「星の左側」のギャップを塗りつぶしますが、
          // 現在のHTMLには6つ目のギャップがないため何もしません。
          // （HTMLに gap0 や gap6 を追加した場合はここに処理を追記してください）
          break;
      }
    });
  }
});

document.addEventListener('DOMContentLoaded', () => {
  // --- 関係セクションの処理 ---
  const relationList = document.getElementById('relation_list');
  const addRelationBtn = document.getElementById('add_relation_btn');
  const removeRelationBtn = document.getElementById('remove_relation_btn');
  
  let relationCount = 0;
  const relationHeaderCount = 5; // ヘッダーのセル数
  const relationRowSize = 5;     // 1行あたりのセル数

  // テキストエリアの高さを自動調整する関数
  const bindRelationTextarea = (textarea) => {
    textarea.addEventListener('input', () => {
      const rowId = textarea.dataset.row;
      resizeRelationRow(rowId);
    });
    resizeRelationRow(textarea.dataset.row);
  };

  const resizeRelationRow = (rowId) => {
    const rowTextareas = relationList.querySelectorAll(`.relation-textarea[data-row="${rowId}"]`);
    if (!rowTextareas.length) return;

    // 1. まず一斉に高さをリセット
    rowTextareas.forEach((textarea) => {
      textarea.style.height = 'auto';
    });

    // 2. 最大の高さを取得
    let maxHeight = 0;
    rowTextareas.forEach((textarea) => {
      maxHeight = Math.max(maxHeight, textarea.scrollHeight);
    });

    // 3. 最大の高さをすべてのテキストエリアに適用
    rowTextareas.forEach((textarea) => {
      textarea.style.height = `${maxHeight}px`;
    });
  };

  const addRelationRow = () => {
    relationCount++;
    const rowHTML = `
      <div class="relation-checkbox-cell">
        <div class="box-container">
          <input type="checkbox" id="relation_check_${relationCount}" class="box-check" />
          <label for="relation_check_${relationCount}" class="box-label"></label>
        </div>
      </div>
      <textarea name="relation_anchor_${relationCount}" class="relation-textarea" rows="1" data-row="${relationCount}"></textarea>
      <textarea name="relation_fate_${relationCount}" class="relation-textarea" rows="1" data-row="${relationCount}"></textarea>
      <textarea name="relation_attr_${relationCount}" class="relation-textarea" rows="1" data-row="${relationCount}"></textarea>
      <textarea name="relation_setting_${relationCount}" class="relation-textarea" rows="1" data-row="${relationCount}"></textarea>
    `;
    
    relationList.insertAdjacentHTML('beforeend', rowHTML);

    const newTextareas = relationList.querySelectorAll(`.relation-textarea[data-row="${relationCount}"]`);
    newTextareas.forEach(bindRelationTextarea);
  };

  const removeRelationRow = () => {
    if (!relationList) return;
    const totalCells = relationList.children.length;
    // ヘッダー行以下がない場合は何もしない
    if (totalCells <= relationHeaderCount || relationCount === 0) return;

    // 1行分（5セル）を削除
    for (let i = 0; i < relationRowSize; i++) {
      const lastCell = relationList.lastElementChild;
      if (!lastCell) break;
      relationList.removeChild(lastCell);
    }
    relationCount = Math.max(0, relationCount - 1);
  };

  // 初期化：最初から3行ほど関係の入力欄を作っておく場合
  if (relationList) {
    addRelationRow();
  }

  // ボタンにイベントを登録
  if (addRelationBtn) addRelationBtn.addEventListener('click', addRelationRow);
  if (removeRelationBtn) removeRelationBtn.addEventListener('click', removeRelationRow);
});

// ==========================================
// ▼▼ ここからセーブ・ロード機能の追加コード ▼▼
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  const saveBtn = document.getElementById('save_data_btn');
  const loadFile = document.getElementById('load_data_file');

  // 画像をJSONに保存するため、Base64形式のデータを保持する変数
  let savedImageBase64 = null;
  const imageInput = document.getElementById("setting_image");
  
  // 既存の画像選択処理に相乗りしてBase64化する
  imageInput.addEventListener("change", () => {
    const file = imageInput.files && imageInput.files[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => { savedImageBase64 = e.target.result; };
      reader.readAsDataURL(file);
    } else {
      savedImageBase64 = null;
    }
  });

  // -------------------------
  // データを保存（エクスポート）
  // -------------------------
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const data = {
        inputs: {},
        checkboxes: {},
        spells: [],
        relations: [],
        image: savedImageBase64
      };

      // 1. 基本的な入力欄（テキスト、数値、セレクトなど）を取得
      const textElements = document.querySelectorAll('input[type="text"], input[type="number"], select, textarea');
      textElements.forEach(el => {
        // 動的生成される魔法・関係の要素はここでは除外
        if (!el.name.startsWith('spell_') && !el.name.startsWith('relation_')) {
          data.inputs[el.id || el.name] = el.value;
        }
      });

      // 2. 基本的なチェックボックスを取得（特技、魔力メーター、ギャップなど）
      const checkElements = document.querySelectorAll('input[type="checkbox"]');
      checkElements.forEach(el => {
        if (!el.id.startsWith('charge_') && !el.id.startsWith('phrase_') && !el.id.startsWith('relation_check_')) {
          data.checkboxes[el.id] = el.checked;
        }
      });

      // 3. 動的リスト：蔵書（魔法）を取得
      let i = 1;
      while (document.querySelector(`[name="spell_name_${i}"]`)) {
        const spell = {
          name: document.querySelector(`[name="spell_name_${i}"]`).value,
          type: document.querySelector(`[name="spell_type_${i}"]`).value,
          skill: document.querySelector(`[name="spell_skill_${i}"]`).value,
          cost: document.querySelector(`[name="spell_cost_${i}"]`).value,
          effect: document.querySelector(`[name="spell_effect_${i}"]`).value,
          phrase: document.getElementById(`phrase_${i}`) ? document.getElementById(`phrase_${i}`).checked : false,
          ref: document.querySelector(`[name="spell_reference_p_${i}"]`).value,
          charges: []
        };
        for (let c = 1; c <= 5; c++) {
          const cb = document.getElementById(`charge_${i}_${c}`);
          if (cb) spell.charges.push(cb.checked);
        }
        data.spells.push(spell);
        i++;
      }

      // 4. 動的リスト：関係を取得
      let j = 1;
      while (document.querySelector(`[name="relation_anchor_${j}"]`)) {
        data.relations.push({
          check: document.getElementById(`relation_check_${j}`) ? document.getElementById(`relation_check_${j}`).checked : false,
          anchor: document.querySelector(`[name="relation_anchor_${j}"]`).value,
          fate: document.querySelector(`[name="relation_fate_${j}"]`).value,
          attr: document.querySelector(`[name="relation_attr_${j}"]`).value,
          setting: document.querySelector(`[name="relation_setting_${j}"]`).value,
        });
        j++;
      }

      // JSONファイルとしてダウンロードさせる処理
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // キャラクター名をファイル名にする（空なら 'character'）
      const charName = document.getElementById('name').value || 'character';
      a.download = `${charName}_マギロギCS.json`;
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  // -------------------------
  // データを読み込み（インポート）
  // -------------------------
  if (loadFile) {
    loadFile.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          
          // 1. テキストなどの復元
          if (data.inputs) {
            for (const [key, value] of Object.entries(data.inputs)) {
              const el = document.getElementById(key) || document.querySelector(`[name="${key}"]`);
              if (el) {
                el.value = value;
                // 領域の変更を検知してギャップの黒塗りを自動実行
                if (key === 'area') el.dispatchEvent(new Event('change'));
              }
            }
          }

          // 2. チェックボックスの復元
          if (data.checkboxes) {
            for (const [key, checked] of Object.entries(data.checkboxes)) {
              const el = document.getElementById(key);
              if (el) {
                el.checked = checked;
              }
            }
          }

          // 3. 蔵書（魔法）リストの復元
          if (data.spells) {
            const addBtn = document.getElementById('add_spell_btn');
            const removeBtn = document.getElementById('remove_spell_btn');
            
            // 一旦現在の行をすべて削除する
            while(document.querySelectorAll('.spell-textarea[name^="spell_name_"]').length > 0) {
              removeBtn.click();
            }
            
            // 保存データ数に合わせて行を追加し、データを代入
            data.spells.forEach((spell, idx) => {
              addBtn.click();
              const i = idx + 1;
              document.querySelector(`[name="spell_name_${i}"]`).value = spell.name || '';
              document.querySelector(`[name="spell_type_${i}"]`).value = spell.type || '召喚';
              document.querySelector(`[name="spell_skill_${i}"]`).value = spell.skill || '';
              document.querySelector(`[name="spell_cost_${i}"]`).value = spell.cost || '';
              document.querySelector(`[name="spell_effect_${i}"]`).value = spell.effect || '';
              document.querySelector(`[name="spell_reference_p_${i}"]`).value = spell.ref || '';
              
              if (document.getElementById(`phrase_${i}`)) {
                document.getElementById(`phrase_${i}`).checked = spell.phrase || false;
              }
              
              if (spell.charges) {
                spell.charges.forEach((checked, cIdx) => {
                  const cb = document.getElementById(`charge_${i}_${cIdx + 1}`);
                  if (cb) cb.checked = checked;
                });
              }
              // テキストエリアの高さ自動調整を発火させる
              document.querySelector(`[name="spell_effect_${i}"]`).dispatchEvent(new Event('input'));
            });
          }

          // 4. 関係リストの復元
          if (data.relations) {
            const addBtn = document.getElementById('add_relation_btn');
            const removeBtn = document.getElementById('remove_relation_btn');
            
            // 一旦削除
            while(document.querySelectorAll('.relation-textarea[name^="relation_anchor_"]').length > 0) {
              removeBtn.click();
            }
            
            // 追加と代入
            data.relations.forEach((rel, idx) => {
              addBtn.click();
              const j = idx + 1;
              document.querySelector(`[name="relation_anchor_${j}"]`).value = rel.anchor || '';
              document.querySelector(`[name="relation_fate_${j}"]`).value = rel.fate || '';
              document.querySelector(`[name="relation_attr_${j}"]`).value = rel.attr || '';
              document.querySelector(`[name="relation_setting_${j}"]`).value = rel.setting || '';
              
              if (document.getElementById(`relation_check_${j}`)) {
                document.getElementById(`relation_check_${j}`).checked = rel.check || false;
              }
              // テキストエリアの高さ自動調整を発火させる
              document.querySelector(`[name="relation_anchor_${j}"]`).dispatchEvent(new Event('input'));
            });
          }

          // 5. 画像の復元
          if (data.image) {
            savedImageBase64 = data.image;
            const imagePreview = document.getElementById("setting_image_preview");
            const imageEmpty = document.getElementById("setting_image_empty");
            
            imagePreview.src = data.image;
            imagePreview.classList.add("is-visible");
            imageEmpty.hidden = true;
          }

          alert('データの読み込みが完了しました！');

        } catch (error) {
          console.error(error);
          alert('データの読み込みに失敗しました。');
        }
        
        // 同じファイルを連続で選べるようにクリアしておく
        e.target.value = '';
      };
      reader.readAsText(file);
    });
  }
});

// ==========================================
// ▼▼ ココフォリア用：キャラクター駒データをコピーする機能 ▼▼
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  const copyNameBtn = document.getElementById('copy_name_btn');
  const nameInput = document.getElementById('name');

  if (copyNameBtn && nameInput) {
    copyNameBtn.addEventListener('click', () => {
      const nameValue = nameInput.value;

      if (!nameValue) {
        alert('かりそめの名前が入力されていません。');
        return;
      }

      // -----------------------------
      // 1. チャットパレット（commands）の作成
      // -----------------------------
      let commands = "ーーー特技ーーー\n";
      
      // 特技（チェックが入っているもの）を取得
      // ※画像アップロードなどの魔法/関係関連以外のチェックボックスを対象とします
      const checkboxes = document.querySelectorAll('input[type="checkbox"]:checked');
      checkboxes.forEach(cb => {
        if (!cb.id.startsWith('charge_') && !cb.id.startsWith('phrase_') && !cb.id.startsWith('relation_check_')) {
          // value属性に特技名が入っている想定
          commands += `2d6>=5《${cb.value}》\n`;
        }
      });

      commands += "\nーーー魔法ーーー\n";
      let i = 1;
      while (document.querySelector(`[name="spell_name_${i}"]`)) {
        const sName = document.querySelector(`[name="spell_name_${i}"]`).value || "";
        const sType = document.querySelector(`[name="spell_type_${i}"]`).value || "";
        const sSkill = document.querySelector(`[name="spell_skill_${i}"]`).value || "";
        const sCost = document.querySelector(`[name="spell_cost_${i}"]`).value || "";
        const sRef = document.querySelector(`[name="spell_reference_p_${i}"]`).value || "";
        const sEffect = document.querySelector(`[name="spell_effect_${i}"]`).value || "";
        
        if (sName) {
          commands += `【${sName}】取得=/種別=${sType}/特技=${sSkill}/目標=/コスト=${sCost}/${sRef}　効果：${sEffect}\n`;
        }
        i++;
      }

      // ▼ 真の姿（※HTMLのidに合わせて調整してください）
      const trueName = document.getElementById('true_name') ? document.getElementById('true_name').value : "";
      const trueEffect = document.getElementById('true_effect') ? document.getElementById('true_effect').value : "";
      commands += `\nーーー真の姿ーーー\n「${trueName}」【${trueEffect}】\n`;

      // ▼ 戦闘ステータス（※HTMLのidに合わせて調整してください）
      const attackVal = document.getElementById('attack') ? document.getElementById('attack').value : 0;
      const defenseVal = document.getElementById('defense') ? document.getElementById('defense').value : 0;
      const rootVal = document.getElementById('root') ? document.getElementById('root').value : 0;

      commands += `\nーーー戦闘ーーー
s1d1　　攻撃プロット（攻撃力=${attackVal}）
s${attackVal}TZ6　攻撃ランダムプロット（攻撃力=${attackVal}）
s1d1　　防御プロット（防御力=${defenseVal}）
s${defenseVal}TZ6　防御ランダムプロット（防御力=${defenseVal}）\n\n`;

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

      // -----------------------------
      // 2. ステータス（status）の作成
      // -----------------------------
      const magicMax = document.getElementById('magic') ? document.getElementById('magic').value : 0;
      const tempMagic = document.getElementById('temp_magic') ? document.getElementById('temp_magic').value : 0;

      let statusArr = [
        { label: "魔力", value: Number(magicMax), max: Number(magicMax) },
        { label: "一時的魔力", value: Number(tempMagic || 0), max: Number(tempMagic || 0) }
      ];

      // 魔法名とコストをステータスに追加
      let j = 1;
      while (document.querySelector(`[name="spell_name_${j}"]`)) {
        const sName = document.querySelector(`[name="spell_name_${j}"]`).value;
        const sCost = document.querySelector(`[name="spell_cost_${j}"]`).value;
        if (sName) {
          statusArr.push({
            label: `${sName}:${sCost}`,
            value: 0,
            max: Number(rootVal)
          });
        }
        j++;
      }

      // -----------------------------
      // 3. パラメータ（params）の作成
      // -----------------------------
      let paramsArr = [
        { label: "攻撃力", value: Number(attackVal) },
        { label: "防御力", value: Number(defenseVal) },
        { label: "根源力", value: Number(rootVal) }
      ];

      // -----------------------------
      // 4. ココフォリア用データの結合とコピー
      // -----------------------------
      const ccfoliaData = {
        kind: "character",
        data: {
          name: nameValue,
          initiative: 1,
          commands: commands,
          status: statusArr,
          params: paramsArr
        }
      };

      // JSのオブジェクトをココフォリアが読める形式（JSON文字列）に一括変換
      const textToCopy = JSON.stringify(ccfoliaData);

      navigator.clipboard.writeText(textToCopy)
        .then(() => {
          alert('ココフォリア用のキャラクターデータをクリップボードにコピーしました！\nそのままココフォリアの盤面で Ctrl+V（ペースト）してください。');
        })
        .catch(err => {
          console.error('コピーに失敗しました', err);
          alert('コピーに失敗しました。');
        });
    });
  }
});

clearPreview();
