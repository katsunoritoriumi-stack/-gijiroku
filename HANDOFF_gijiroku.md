# 引き継ぎ書: Gijiro（会議録音・文字起こし・要約・チャットアプリ）

最終更新: 2026-07-21（アプリ名を「Gijiro」に変更、UIをグラスモーフィズムに刷新、チャット音声入力追加、音声シークバー不具合修正）

## 1. これは何か

Manus / Cue のような音声メモアプリ。会議をブラウザで録音（またはファイルアップロード）→ Gemini で自動文字起こし（タイムスタンプ・話者ラベル付き）→ 要約・アクションアイテム抽出 → 録音内容への質問チャット、まで一気通貫でできる一般公開アプリ。アプリ名は「**Gijiro**」（旧称: 議事録メーカー。UI表示・manifest・タイトルタグすべて2026-07-21に変更済み。リポジトリ名・GitHubリポ・Vercel/Renderのサービス名など内部識別子は旧称のまま維持）。

- 本番フロントエンド: **https://frontend-three-chi-22.vercel.app**（認証なし・一般公開）
- 本番バックエンド: **https://gijiroku-v687.onrender.com**
- GitHub: **https://github.com/katsunoritoriumi-stack/-gijiroku**（Public。**リポジトリ名の先頭にハイフンが付いている**＝`-gijiroku`。地味にハマりやすいので注意）
- ソース: `C:\Users\katsu\gijiroku`（独立 git リポ、RIAT リポとは分離）
- スタック:
  - フロントエンド: Vite + React 19 + TypeScript + Tailwind v4、PWA。ビルドは `npm run build`（`frontend/` で実行）
  - バックエンド: Flask + google-genai（`gemini-3.1-flash-lite`）。ビルド不要、Render で `gunicorn` 起動
- データは**端末内 IndexedDB（Dexie）にのみ保存**。サーバーは音声・文字起こしを一切永続化しない（Gemini API呼び出し中は当然一時的にGoogle側を通過するが、それはこのアプリのサーバー実装の話とは別軸）

## 2. 起動・デプロイ

### ローカル起動
- フロントエンド: preview **"gijiroku-frontend"**（ポート5950）。RIATブログ辞典リポの `.claude/launch.json` に登録済み（`npm --prefix ../gijiroku/frontend run dev`）。gijiroku 自身の `.claude/launch.json` には `"frontend"` という名前で同内容が登録されている（cwd: `frontend`）。
- バックエンド: preview **"gijiroku-backend"**（ポート5951）。同じく RIAT リポ launch.json に登録済み（`python ../gijiroku/server/server.py`）。gijiroku 自身の launch.json には `"backend"` として登録（cwd: `server`）。
- バックエンドの `.env`（`server/.env`、gitignore 済み）に `GENAI_API_KEY` / `ALLOWED_ORIGINS=http://localhost:5950` / `GEN_MODEL` が必要。**このアプリ専用の新規 GCP プロジェクトで発行したキーを使っている**（RIATブログ事典の RPD500 とは別枠。既存キーと混同しないこと）。
- フロントエンドの `.env`（`frontend/.env`、gitignore 済み）に `VITE_API_BASE=http://localhost:5951` が必要。

### デプロイ手順（すでに設定済み。再デプロイ時の参考）
- **バックエンド（Render）**: GitHub の `-gijiroku` リポと連携。Render 側の設定 → Root Directory: `server` / Build: `pip install -r requirements.txt` / Start: `gunicorn server:app --timeout 120` / Instance: Free。環境変数 `GENAI_API_KEY`・`ALLOWED_ORIGINS=https://frontend-three-chi-22.vercel.app` を設定済み。**main への push で自動デプロイ**（Render の GitHub App 連携による）。
- **フロントエンド（Vercel）**: `frontend/` で `npx vercel --prod --yes`（Vercel CLI は認証済み、`katsunoritoriumi-2409` アカウント、スコープ `katsunoritoriumi-2409s-projects`）。Vercel プロジェクト名は残念ながら **`frontend`**（分かりにくい名前になってしまった。他プロジェクトと混同注意。リネームは Vercel ダッシュボードから可能）。環境変数 `VITE_API_BASE=https://gijiroku-v687.onrender.com` を設定済み（`vercel env add` で追加、Vite はビルド時に埋め込むため**環境変数を変えたら再デプロイ必須**）。
- デプロイ後確認: **https://frontend-three-chi-22.vercel.app** を実際に開いて、録音一覧・録音画面・ファイルアップロード→文字起こし→要約が動くことを確認する。バックエンド単体は `curl https://gijiroku-v687.onrender.com/warmup` で疎通確認できる（コールドスタート最大50秒程度）。

## 3. ファイル構成

```
gijiroku/
├── .claude/launch.json      # frontend(5950) / backend(5951)
├── frontend/
│   ├── vercel.json           # SPAルーティングのrewrite（削除厳禁、下記の罠参照）
│   ├── public/
│   │   ├── manifest.json / sw.js / icon-192.png / icon-512.png
│   ├── src/
│   │   ├── db.ts              # Dexieスキーマ（recordings, audioChunks）+ recoverOrphanRecordings()
│   │   ├── types.ts           # Recording / TranscriptSegment / ActionItem / ChatMessage
│   │   ├── api.ts             # transcribeAudio / summarizeTranscript / chatAboutRecording（SSE読み取り含む）
│   │   ├── hooks/useRecorder.ts   # MediaRecorder本体。timeslice毎にIndexedDBへ退避、mimeType自動判定
│   │   ├── hooks/useWakeLock.ts
│   │   ├── pages/RecordPage.tsx   # 録音画面（マイク＋ファイルアップロード両対応）
│   │   ├── pages/DetailPage.tsx   # 文字起こし/要約/アクション/チャットのタブ本体
│   │   └── components/ChatPanel.tsx 等
└── server/
    ├── server.py    # Flask本体。/warmup /api/transcribe /api/summarize /api/chat
    ├── ratelimit.py # グローバル日次450 + IP別日次（transcribe5/summarize10/chat30）
    └── prompts.py   # 文字起こし/要約/チャットのプロンプト定義
```

**触ってはいけない/注意して触るファイル**:
- `frontend/vercel.json`：削除すると本番で直接URLアクセス（リロード・共有リンク・PWA起動）が404になる
- `server/ratelimit.py` の `GLOBAL_DAILY_LIMIT = 450`：Gemini無料枠RPD500に対する安全マージン。RIATブログ事典とは別GCPプロジェクトだが、上げすぎるとこのアプリ単体でクォータ切れする

## 4. コア仕様

- 録音は **その場マイク録音 or 音声ファイルアップロード** の両対応。マイクは `MediaRecorder`、10秒 timeslice ごとに Dexie の `audioChunks` へバックアップ保存（クラッシュ耐性。アプリ起動時 `recoverOrphanRecordings()` が孤立チャンクを1本の録音として復元する）。
- 音声形式は候補順に `audio/webm;codecs=opus` → `audio/mp4` → `audio/aac` → `audio/wav` を `MediaRecorder.isTypeSupported` で自動判定。**Gemini は webm/opus をそのまま受理する**ことを実機検証済み（下記「既知の罠」参照）。
- 文字起こしは `[mm:ss] 話者A: 発言` 形式でSSEストリーミング。15MB超はGemini Files API経由（アップロード→ACTIVE待ち→削除）。
- 要約・アクションアイテムは `responseSchema` による構造化出力。**スキーマはフラット**（ネスト1階層のみ）。担当者・期限は文字起こしから明言されている場合のみ埋める（推測で埋めない指示）。
- チャットは文字起こし全文を `system_instruction` に、履歴を `Content(role=...)` の配列としてマルチターンで送る。RAG/Pineconeは使っていない（1時間会議でも全文がコンテキストに収まる想定）。
- レート制限は「全エンドポイント共通のグローバル日次カウンタ（450）」+「バケット別・IP別日次カウンタ」の二層。インメモリ実装のためサーバー再起動でリセットされる（Render無料枠のスピンダウンと相性が良い）。

## 5. 既知の罠（必読）

- **Vercel + React Router の組み合わせは `vercel.json` に rewrite が無いと直接URL/リロードで404になる**。初回デプロイ時に実際にこれを踏んだ。`{"rewrites":[{"source":"/(.*)","destination":"/index.html"}]}` を必ず置いておくこと。
- **RenderのEnvironment Variables UIで「KEY」欄と「VALUE」欄を取り違えやすい**。実際にユーザーがAPIキーの値をKEY欄に貼ってしまい `GENAI_API_KEY` が未設定のままデプロイされ、`Exited with status 1` でクラッシュした（ログに `Error: GENAI_API_KEY を .env に設定してください` と出る＝これはserver.pyの起動時チェックが正しく機能している証拠でもある）。
- **RenderのGitHub連携はリポジトリ単位で許可が必要**。新規リポを作ってもRenderの「New Web Service」の検索に出てこない場合、`github.com/settings/installations` → Render の「Configure」→ Repository access に対象リポを追加する必要がある（"All repositories" にすると以後この作業が不要になる）。
- **MediaRecorderのwebm/opusをGeminiに送る検証は、ブラウザのOscillatorNode+MediaStreamDestination+MediaRecorderで合成音声を作ればマイク権限なしでもテストできる**。Claude BrowserペインはgetUserMediaが常にブロックされるため、実マイクでの検証は不可能（想定通り、これは実機依存の作業として残っている）。Gemini TTSで実際の日本語音声を生成し、それをMediaRecorderに通して現実的なテスト音声を作る手法も有効だった（このセッションで実施し、一言一句正確な文字起こしを確認済み）。
- **Claude Browserペインのscreenshotツールがこのセッションでたびたびタイムアウトした**。`get_page_text` + `javascript_tool`（`document.querySelector('button').click()` 等の直接DOM操作）で代替すれば検証は続行できる。特に、`computer` ツールの ref クリックが「クリックはしたが実際にはReactの状態が変わらない」ケースが複数回あった（原因不明、Vite HMR起因の可能性もある）。**確実に動かしたい時はブラウザの完全リロード（`location.reload()`）してから直接DOM操作でクリックする**のが最も信頼できた。
- **Vite の HMR（Fast Refresh）で大きくコンポーネントを書き換えた直後は、古いクロージャが残ってボタンクリックが無反応になることがある**。挙動がおかしいと感じたら疑う前にまずフルリロードで切り分けること。
- Vercel プロジェクト名が `frontend` になってしまった（gijiroku-frontend等にすべきだった）。実害はないが紛らわしいので、気になるならVercelダッシュボードでリネームする。

## 5.5. 2026-07-21の変更（UI刷新・音声入力・シークバー修正・改称）

- **デザインをグラスモーフィズムに全面刷新**。`src/index.css` を全面書き換えし、`backdrop-filter: blur()` 半透明サーフェス、固定背景の放射グラデーション「ブロブ」演出（`.ambient-bg`、`App.tsx` にルート直下で常時レンダリング）、グラデーションボタン、`color-mix()` によるグロー影を導入。絵文字アイコンは全廃し `src/components/icons.tsx` の手描きSVGアイコンセットに統一（アクセシビリティ・一貫性のため）。数字・ブランド表記には Space Grotesk フォントを採用。
- **チャットに音声入力を追加**（`src/hooks/useSpeechInput.ts`）。ブラウザ標準の Web Speech API（`SpeechRecognition`）を使用し、サーバー側のGeminiクォータを消費しない。非対応ブラウザではマイクボタンを自動非表示。
- **録音タイトルの編集導線を改善**。編集機能自体は元から実装済みだったが発見しづらかったため、`DetailPage.tsx` に鉛筆アイコンボタンを追加して明示化。
- **音声プレイヤーのシークバー不具合を修正**（`src/hooks/useRecorder.ts` / `src/components/AudioPlayer.tsx` / `src/utils.ts`）。原因はChromeの既知の挙動で、`MediaRecorder` が複数チャンク（timeslice/一時停止再開あり）から生成したwebm Blobは `duration === Infinity` を返し、シークバーが機能しない。`fix-webm-duration` パッケージを録音停止時に適用してEBMLヘッダーのduration情報を補正。加えて `AudioPlayer` に `fallbackDurationSec` prop（録音時に実測した秒数）を渡し、メディア要素がInfinityを返した場合の保険とした。ブラウザでOscillatorNode+MediaRecorder(timeslice+pause/resume)による合成webmで再現・修正の両方を確認済み。
- 上記4点はすべてビルド確認・ローカル/本番ブラウザ確認・commit・push・Vercel本番再デプロイ済み（バックエンドは無変更のためRender再デプロイ不要）。

## 6. 未解決・今後の候補

- **実機でのマイク録音確認が未実施**。Claude Browserペインではマイク権限が取得できないため、スマホ/PCの実ブラウザで録音→保存→再生の一連を確認する必要がある。
- **iOS Safari（`audio/mp4`）でのMediaRecorder動作・Gemini受理**は未検証（webm/opusのみ実機相当検証済み）。
- **Screen Wake Lock（画面スリープ防止）の実機挙動**、特に iOS でのバックグラウンド遷移時の録音停止挙動は未検証。
- Render無料枠のコールドスタート体感（本番初回アクセス時50秒程度）と、**RIATブログ事典との750h/月ワークスペース合算枠の共存状況**は運用しながら要観察。
- チャットタブ（SSEストリーミング・マルチターン）はローカルでは実データ検証済みだが、**本番環境での動作は未確認**（文字起こし・要約は本番確認済み、チャットはGeminiクォータ節約のため本番テストを省略した）。
- レート制限値（グローバル450、IP別 transcribe5/summarize10/chat30）は初期仮値。実際の利用状況を見て調整する想定。
