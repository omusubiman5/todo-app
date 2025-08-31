# Supabaseメール設定ガイド

パスワードリセットメールが送信されない問題の解決方法

## 🔍 **問題の原因**
- `captcha verification process failed` エラー
- SupabaseのCAPTCHA設定またはメール送信設定の問題

## 🛠️ **解決手順**

### 1. Supabaseダッシュボードにアクセス
```
https://supabase.com/dashboard/project/zmxnsfjmusgmapxbcbpn
```

### 2. Authentication設定の確認

#### A. セキュリティ設定
1. **Authentication** → **Settings** に移動
2. **Security** セクションで以下を確認:
   - `Enable email confirmations` が有効
   - `Enable secure email change` が適切に設定

#### B. CAPTCHA設定（重要）
1. **Authentication** → **Settings** → **CAPTCHA protection**
2. 以下のオプションを確認:
   - `Enable CAPTCHA verification for password reset` を **無効** にする
   - または、適切なCAPTCHAプロバイダー（reCAPTCHA等）を設定

#### C. メール送信設定
1. **Authentication** → **Settings** → **SMTP Settings**
2. 2つのオプション:

**オプション1: デフォルトメール送信を使用**
```
- "Enable custom SMTP" を無効にする
- Supabaseの標準メール送信サービスを使用
```

**オプション2: カスタムSMTP設定（推奨）**
```
- "Enable custom SMTP" を有効にする
- SMTP設定を入力:
  - Host: smtp.gmail.com (Gmailの場合)
  - Port: 587
  - Username: your-email@gmail.com
  - Password: your-app-password
  - Sender email: your-email@gmail.com
  - Sender name: Your App Name
```

### 3. メールテンプレートの確認
1. **Authentication** → **Templates**
2. **Reset Password** テンプレートを確認
3. 必要に応じてカスタマイズ

### 4. レート制限設定
1. **Authentication** → **Settings** → **Rate limits**
2. `Password reset` の制限を確認:
   - 1時間あたりの制限数
   - IPアドレスまたはメールアドレスごとの制限

## 🧪 **テスト方法**

### ブラウザでのテスト
1. http://localhost:3000/login にアクセス
2. 開発者ツール（F12）でコンソールを開く
3. 「パスワードをお忘れですか？」をクリック
4. 実際のメールアドレスを入力してテスト
5. コンソールでデバッグメッセージを確認

### コマンドラインでのテスト
```bash
cd todo-app
node test-password-reset.js
```

## 📧 **メール送信の注意点**

### 1. テストメールアドレス
- `test@example.com` などの偽のアドレスは使用不可
- 実際に受信可能なメールアドレスを使用

### 2. メールボックスの確認
- 受信トレイ
- 迷惑メールフォルダ
- プロモーションタブ（Gmailの場合）

### 3. メール送信の遅延
- メール送信には最大5分かかる場合がある
- サーバーの負荷により遅延する可能性

## 🐛 **トラブルシューティング**

### CAPTCHA エラーが続く場合
1. SupabaseダッシュボードでCAPTCHA設定を無効化
2. 開発環境では認証メカニズムを簡素化
3. プロダクション環境では適切なCAPTCHAプロバイダーを設定

### メールが届かない場合
1. SMTP設定の再確認
2. Supabaseプロジェクトのメール設定リセット
3. 異なるメールプロバイダーでテスト

### エラーコード別の対処
- `captcha verification process failed`: CAPTCHA設定を無効化
- `email not confirmed`: 登録時の確認メールから先にアカウント有効化
- `rate limit exceeded`: 時間をおいてから再試行

## 💡 **最優先の対処法**

1. **Supabaseダッシュボード** → **Authentication** → **Settings**
2. **CAPTCHA protection** で `Enable CAPTCHA verification for password reset` を **無効** にする
3. 変更を保存してテスト実行

これで99%の場合、パスワードリセットメールが正常に送信されるようになります。