# TODO: SPEC.md 実装タスク

`SPEC.md` の機能要件(FR1〜FR2)を、1コミットで収まる粒度のタスクに分解したもの。全てこのリポジトリ(`TRPG`)内の変更で完結する。

フェーズ1・2は互いに独立して着手可能。

---

## フェーズ1: 確認ダイアログの削減 (FR1)

- [x] **T1-1** トースト通知の共通UI/関数(`showToast()`)を追加する
  - `magirogi/index.js`・`sinobigami/index.js` に非ブロッキング通知表示関数を実装
  - `magirogi/stylesheet.css`・`sinobigami/stylesheet.css` にトースト用スタイルを追加
  - 依存: なし

- [x] **T1-2** FR1.1・FR1.3対象の `alert()` を `showToast()` に置き換える
  - 成功系alert全て、失敗系alertのうち保存失敗・削除失敗以外
  - `magirogi/index.js`・`sinobigami/index.js`
  - 依存: **T1-1**

---

## フェーズ2: タブタイトルのキャラ名同期 (FR2)

- [x] **T2-1** タブタイトルをキャラ名にリアルタイム同期する
  - 名前欄の `input` イベントでの同期(FR2.1)、共有リンク読み込み時の同期(FR2.2)、未入力時のデフォルト復帰(FR2.3)をまとめて実装
  - `magirogi/index.js`・`sinobigami/index.js`
  - 依存: なし

---

## 依存関係サマリー

```
T1-1 → T1-2   (フェーズ1)
T2-1          (フェーズ2、独立)
```
