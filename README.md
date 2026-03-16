# Medical Form (ヒアリングシート)

交通事故被害者向けの医療情報ヒアリングシートWebアプリケーションです。
個人情報・事故情報の入力、通院先の検索・登録、Google Sheetsへのデータ送信、Google Calendarでの予約までを一貫して行えます。

## 技術スタック

- **フレームワーク:** Next.js 15 (App Router)
- **言語:** TypeScript 5.7
- **UI:** React 19 + Tailwind CSS 4
- **外部サービス:**
  - Google Sheets API（データ保存）
  - Google Calendar API（予約管理）
  - Google Maps / Places / Geocoding API（施設検索・地図表示）
  - Google Chat Webhook（予約通知）
  - Google Gemini API（AI検索クエリ最適化・バリデーション）

---

## 前提条件

- **Node.js** 18.x 以上
- **npm** / **yarn** / **pnpm** / **bun** のいずれか
- **Google Cloud Platform (GCP)** アカウント
- **Google** アカウント（Gemini API キー）

---

## 1. GCP プロジェクトのセットアップ

### 1-1. プロジェクト作成

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 画面上部のプロジェクトセレクタをクリック → 「新しいプロジェクト」を選択
3. プロジェクト名を入力（例: `medical-form`）して「作成」

### 1-2. API の有効化

Google Cloud Console の「APIとサービス」→「ライブラリ」から、以下のAPIを**すべて有効化**してください。

| API 名 | 用途 | 検索キーワード |
|---------|------|---------------|
| **Google Sheets API** | フォームデータの保存 | `Sheets API` |
| **Google Calendar API** | 予約スロットの取得・イベント作成 | `Calendar API` |
| **Google Drive API** | フォルダ作成・テンプレートコピー | `Drive API` |
| **Maps JavaScript API** | フロントエンドの地図表示 | `Maps JavaScript` |
| **Places API (New)** | 通院先施設の検索 | `Places API (New)` |
| **Geocoding API** | 住所から緯度経度への変換 | `Geocoding API` |

**手順:**

1. [APIライブラリ](https://console.cloud.google.com/apis/library) を開く
2. 検索バーに上記の「検索キーワード」を入力
3. 対象のAPIをクリック → 「有効にする」ボタンを押す
4. 6つすべてのAPIについて繰り返す

### 1-3. サービスアカウントの作成

サービスアカウントは、アプリケーションがサーバーサイドで Google Sheets API・Calendar API を利用するために必要です。

1. [IAMと管理 → サービスアカウント](https://console.cloud.google.com/iam-admin/serviceaccounts) を開く
2. 「サービスアカウントを作成」をクリック
3. 以下を入力:
   - **サービスアカウント名:** `medical-form-app`（任意）
   - **サービスアカウントID:** 自動生成されるメールアドレスを確認（後で使用）
4. 「作成して続行」をクリック
5. ロールは付与不要（スキップ可）→ 「完了」

### 1-4. サービスアカウントキー（JSON）の取得

1. 作成したサービスアカウントの行をクリック
2. 「鍵」タブを選択
3. 「鍵を追加」→「新しい鍵を作成」
4. キーのタイプ: **JSON** を選択 → 「作成」
5. JSONファイルが自動ダウンロードされる
6. ダウンロードしたファイルをプロジェクトの `key/` ディレクトリに配置:

```bash
mkdir -p key
mv ~/Downloads/<ダウンロードしたファイル名>.json key/
```

> **重要:** このJSONファイルには秘密鍵が含まれます。Gitにコミットしないでください（`.gitignore` に `key/` が含まれていることを確認）。

JSONファイルの中から以下の値を `.env.local` に設定します:
- `client_email` → `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `private_key` → `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`

### 1-5. Google Maps API キーの作成

1. [認証情報](https://console.cloud.google.com/apis/credentials) を開く
2. 「認証情報を作成」→「APIキー」を選択
3. 作成されたAPIキーをコピー
4. （推奨）APIキーをクリックして制限を設定:
   - **アプリケーションの制限:** HTTPリファラー（本番デプロイ時にドメインを指定）
   - **APIの制限:** 以下のAPIのみに制限
     - Maps JavaScript API
     - Places API (New)
     - Geocoding API

---

## 2. Google Sheets のセットアップ

### 2-1. スプレッドシートの作成

1. [Google Sheets](https://sheets.google.com/) で新しいスプレッドシートを作成
2. シート名を `通院先リスト` に変更（シートタブをダブルクリックしてリネーム）
3. URLからスプレッドシートIDを取得:
   ```
   https://docs.google.com/spreadsheets/d/【この部分がスプレッドシートID】/edit
   ```

### 2-2. サービスアカウントへの共有

1. スプレッドシートの右上「共有」ボタンをクリック
2. サービスアカウントのメールアドレス（例: `medical-form-app@your-project.iam.gserviceaccount.com`）を入力
3. 権限を **編集者** に設定 → 「送信」

### 2-3. Google Drive 親フォルダのセットアップ

フォーム送信時、依頼者名（カタカナ）のフォルダが自動作成され、テンプレートSpreadsheetのコピーが格納されます。

1. [Google Drive](https://drive.google.com/) で親フォルダを作成（例: `顧客データ`）
2. URLからフォルダIDを取得:
   ```
   https://drive.google.com/drive/folders/【この部分がフォルダID】
   ```
3. フォルダを右クリック →「共有」→ サービスアカウントのメールアドレスを追加
4. 権限を **編集者** に設定 → 「送信」

---

## 3. Google Calendar のセットアップ

### 3-1. カレンダーの共有設定

予約管理に使用するスタッフのGoogleカレンダーに対して、サービスアカウントからアクセスできるようにします。

**各スタッフのカレンダーに対して以下を実施:**

1. [Google Calendar](https://calendar.google.com/) を開く
2. 左サイドバーの対象カレンダーの「⋮」→「設定と共有」を選択
3. 「特定のユーザーまたはグループと共有する」セクションで「ユーザーやグループを追加」
4. サービスアカウントのメールアドレスを入力
5. 権限を **予定の変更** に設定 → 「送信」

### 3-2. カレンダーIDの確認

1. カレンダーの「設定と共有」を開く
2. 「カレンダーの統合」セクションの「カレンダーID」をコピー
   - 個人カレンダーの場合は通常メールアドレスと同じ

---

## 4. Google Chat Webhook のセットアップ（任意）

予約完了時にGoogle Chatスペースへ通知を送信する場合に設定します。

1. Google Chatで通知先のスペースを開く
2. スペース名をクリック → 「アプリと統合」→ 「Webhook を管理」
3. 「Webhook を追加」をクリック
4. 名前を入力（例: `予約通知`）→ 「保存」
5. 生成されたWebhook URLをコピー

---

## 5. Gemini API キーの取得

1. [Google AI Studio](https://aistudio.google.com/) にアクセス
2. 「Get API key」を開く
3. 「Create API key」をクリックして新しいAPIキーを作成
4. 生成されたキーをコピー

---

## 6. 環境変数の設定

### 6-1. `.env.local` ファイルの作成

```bash
cp .env.local.example .env.local
```

### 6-2. 各値の設定

`.env.local` を開き、以下の値を設定してください:

```env
# Google Maps API キー（手順1-5で取得）
GOOGLE_MAPS_API_KEY=AIza...
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...

# Google Sheets テンプレートスプレッドシートID（手順2-1で取得）
GOOGLE_SHEETS_SPREADSHEET_ID=1ywg3v...

# Google Drive 親フォルダID（手順2-2で取得）
GOOGLE_DRIVE_PARENT_FOLDER_ID=1abc...

# Google サービスアカウント（手順1-4のJSONファイルから取得）
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-app@your-project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----\n"

# Gemini API キー（手順5で取得）
GEMINI_API_KEY=AIza...

# Google Calendar スタッフ設定（手順3-2で取得したカレンダーIDを使用）
GOOGLE_CALENDAR_STAFF='[{"name":"山田","calendarId":"yamada@example.com","priority":1},{"name":"鈴木","calendarId":"suzuki@example.com","priority":2}]'

# Google Chat Webhook URL（手順4で取得、任意）
GOOGLE_CHAT_WEBHOOK_URL=https://chat.googleapis.com/v1/spaces/...
```

> **注意:** `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` は必ずダブルクォートで囲み、改行は `\n` で表現してください。JSONキーファイルの `private_key` フィールドの値をそのまま貼り付けます。

> **注意:** `GOOGLE_MAPS_API_KEY` と `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` は同じ値を設定します。`NEXT_PUBLIC_` プレフィックス付きはフロントエンド（ブラウザ）側で使用されます。

---

## 7. アプリケーションの起動

### 7-1. 依存パッケージのインストール

```bash
npm install
```

### 7-2. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてアプリケーションにアクセスします。

### 7-3. 本番ビルド

```bash
npm run build
npm start
```

---

## 動作確認チェックリスト

セットアップ完了後、以下を確認してください:

- [ ] トップページが表示される
- [ ] 基本情報フォームに入力できる
- [ ] 住所入力後、施設検索で地図と検索結果が表示される
- [ ] 施設を選択してスプレッドシートにデータが書き込まれる
- [ ] 予約可能な時間枠が表示される
- [ ] 予約が完了し、Google Calendarにイベントが作成される

---

## トラブルシューティング

### API が有効化されていない

```
Error: Google Sheets API has not been used in project XXXXX before or it is disabled.
```

→ GCPコンソールで対象のAPIが有効になっているか確認してください。

### サービスアカウントの権限不足

```
Error: The caller does not have permission
```

→ スプレッドシートやカレンダーがサービスアカウントに共有されているか確認してください。

### 秘密鍵のフォーマットエラー

```
Error: error:1E08010C:DECODER routines::unsupported
```

→ `.env.local` の `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` がダブルクォートで囲まれ、改行が `\n` で表現されているか確認してください。

### Maps API キーの制限エラー

```
Google Maps JavaScript API error: ApiNotActivatedMapError
```

→ GCPコンソールで Maps JavaScript API が有効か確認し、APIキーの制限設定を見直してください。

---

## プロジェクト構成

```
medical-form/
├── src/
│   ├── app/
│   │   ├── page.tsx                 # メインページ（マルチステップフォーム）
│   │   ├── layout.tsx               # ルートレイアウト
│   │   ├── globals.css              # グローバルスタイル
│   │   └── api/
│   │       ├── search/route.ts      # 施設検索 API
│   │       ├── submit/route.ts      # データ送信 API
│   │       ├── geocode/route.ts     # ジオコーディング API
│   │       ├── validate-field/route.ts  # AI バリデーション API
│   │       └── calendar/
│   │           ├── availability/route.ts  # 予約枠取得 API
│   │           └── book/route.ts          # 予約作成 API
│   ├── components/
│   │   ├── BasicInfoForm.tsx        # 基本情報入力フォーム
│   │   ├── FacilitySearchSection.tsx # 施設検索・選択
│   │   ├── AppointmentScheduler.tsx  # 予約スケジューラ
│   │   ├── ConfirmationView.tsx      # 確認画面
│   │   ├── CompleteView.tsx          # 完了画面
│   │   └── MapView.tsx              # Google Maps 表示
│   ├── lib/
│   │   └── form-context.tsx         # フォーム状態管理（React Context）
│   └── types/
│       ├── index.ts                 # 型定義
│       └── youtube.d.ts            # YouTube iframe 型定義
├── key/                             # サービスアカウントキー（Git管理外）
├── .env.local                       # 環境変数（Git管理外）
├── .env.local.example               # 環境変数テンプレート
├── package.json
├── tsconfig.json
└── next.config.ts
```
