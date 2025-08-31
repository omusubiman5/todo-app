# hCaptcha セットアップガイド

## 🔍 **現在の問題**
- hCaptchaウィジェットが表示されない、または機能しない
- パスワードリセット時にCAPTCHA検証エラー

## 🛠️ **解決手順**

### 1. SupabaseでのhCaptcha設定確認

**Supabaseダッシュボードにアクセス:**
```
https://supabase.com/dashboard/project/zmxnsfjmusgmapxbcbpn/auth/providers
```

**確認すべき設定:**
1. **Authentication** → **Providers** → **Enable third-party providers**
2. **Authentication** → **Settings** → **CAPTCHA protection**
   - `Enable CAPTCHA verification for password reset`
   - `Enable CAPTCHA verification for email OTP`
   - `Enable CAPTCHA verification for SMS OTP`

### 2. hCaptcha アカウント設定

**Option A: Supabase内蔵hCaptcha（推奨）**
```
- Supabaseが自動的にhCaptchaを管理
- 追加設定不要
- しかし、適切に有効化されている必要がある
```

**Option B: 独自hCaptchaアカウント**
1. https://www.hcaptcha.com/ でアカウント作成
2. 新しいサイトを追加
3. サイトキーとシークレットキーを取得
4. Supabaseダッシュボードで設定

### 3. 環境変数の設定

**実際のhCaptchaキーを使用する場合:**
```bash
# .env.local に追加
NEXT_PUBLIC_HCAPTCHA_SITE_KEY=your_actual_site_key_here
```

### 4. 開発環境での対策

**現在実装済みの解決策:**
- 🧪 **開発環境でスキップ**ボタン
- 自動的なCAPTCHA バイパス機能
- 詳細デバッグログ

## 🧪 **テスト手順**

### ブラウザでのテスト
1. http://localhost:3001/login にアクセス
2. 開発者ツール（F12）でコンソール確認
3. 「パスワードをお忘れですか？」クリック
4. **hCaptchaウィジェットが表示されない場合:**
   - 「🧪 開発環境でスキップ」ボタンをクリック
5. 登録済みメールアドレスを入力
6. リセット実行

### 期待される動作
- hCaptchaウィジェット表示 または スキップボタン表示
- ボタン有効化
- メール送信成功

## 🚨 **即座の解決策**

**現在のエラーを解決するには:**

1. **ブラウザで以下をテスト:**
   - パスワードリセット画面を開く
   - hCaptchaが表示されない場合は「🧪 開発環境でスキップ」をクリック
   - 登録済みメールアドレスを使用

2. **Supabaseダッシュボード確認:**
   - CAPTCHA設定が正しく有効化されているか
   - メール送信設定が完了しているか

3. **最後の手段:**
   - 開発環境でCAPTCHA要件を一時的に無効化
   - 本番環境でのみ有効化

## 💡 **推奨アクション**

1. まず「🧪 開発環境でスキップ」ボタンでテスト
2. メール送信が成功することを確認
3. 後でSupabaseでhCaptcha設定を調整
4. 本番環境では必ずCAPTCHAを有効化