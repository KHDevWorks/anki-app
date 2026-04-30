# 📘 構文対応 暗記カードアプリ  
**PWA 対応・iCloud/Google Drive 同期・構文モード搭載**

このアプリは、プログラミング学習に特化した **暗記カードアプリ** です。  
GitHub Pages 上で動作し、スマホ・PC どちらでも快適に利用できます。

---

## 🚀 デモ（GitHub Pages）

https://github.com/KHDevWorks/anki-app.git

---

## ✨ 主な特徴

### 🔹 1. PWA 対応（ホーム画面アプリ化）
- iPhone / Android / PC でホーム画面に追加可能  
- オフラインでも動作  
- ネイティブアプリのような使い心地  

### 🔹 2. 構文モード（コード＋選択肢）
- コードブロック表示  
- 選択肢形式の問題  
- 通常の Q&A 形式にも対応  

### 🔹 3. ローカル JSON 読み込み
`cards.json` を読み込んで学習を開始できます。

### 🔹 4. カード保存機能（カテゴリ付き）
- 保存すると学習カードから削除  
- 保存済みカードは localStorage に永続保存  
- カテゴリ別フィルタ  
- キーワード検索  
- 再インポート可能  

### 🔹 5. 出題順ランダム化
読み込み時に自動シャッフル。

### 🔹 6. スワイプ操作（スマホ最適化）
- 左スワイプ → 次のカード  
- 右スワイプ → 前のカード  

### 🔹 7. ダークモード対応
OS のテーマに合わせて自動切り替え。

### 🔹 8. iCloud 同期（WebDAV）
- 保存済みカードを iCloud Drive にアップロード  
- iCloud Drive から読み込み  

### 🔹 9. Google Drive 同期（Drive API）
- OAuth 認証  
- Drive に保存 / 読み込み  

### 🔹 10. 自動バックアップ
カード保存時に自動で iCloud / Google Drive にバックアップ。

---

## 📦 セットアップ方法

### 1. リポジトリをクローン

```bash
git clone https://github.com/YOUR_NAME/YOUR_REPO_NAME.git
