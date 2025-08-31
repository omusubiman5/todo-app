# Supabase hCaptcha設定ガイド

## 概要
このドキュメントはSupabaseプロジェクトでhCaptcha機能を有効化するための手順を説明します。

## 前提条件
- Supabaseプロジェクトへの管理者アクセス権
- hCaptchaアカウント（無料）

## 1. hCaptchaアカウント設定

### 1.1 hCaptchaアカウント作成
1. [hCaptcha](https://www.hcaptcha.com/)にアクセス
2. "Sign Up"からアカウントを作成
3. メールアドレスを認証

### 1.2 サイト追加
1. hCaptchaダッシュボードにログイン
2. "Sites" > "New Site"をクリック
3. サイト情報を入力：
   - Site Name: `Todo App`
   - Domains: `localhost`, `127.0.0.1`, `your-domain.com`
4. "Save"をクリック
5. Site KeyとSecret Keyをコピー

## 2. 環境変数設定

`.env.local`ファイルを更新：

```env
# hCaptcha Settings
NEXT_PUBLIC_HCAPTCHA_SITE_KEY=your_actual_site_key_here
HCAPTCHA_SECRET_KEY=your_actual_secret_key_here

# 開発環境では無効化することも可能
NEXT_PUBLIC_SKIP_CAPTCHA=false
```

## 3. Supabase認証設定

### 3.1 認証プロバイダー設定
1. Supabaseプロジェクトダッシュボードにアクセス
2. `Authentication` > `Settings`に移動
3. `External OAuth Providers`セクションで各プロバイダーのCaptchaを有効化

### 3.2 セキュリティ設定
1. `Authentication` > `Settings` > `Security`に移動
2. 以下の設定を確認・更新：
   - Enable hCaptcha for sign up
   - Enable hCaptcha for password reset
   - Enable hCaptcha for sign in (オプション)

### 3.3 hCaptcha設定追加
```sql
-- Supabaseプロジェクトの設定を更新
UPDATE auth.config 
SET value = 'your_hcaptcha_secret_key' 
WHERE parameter = 'hcaptcha_secret';

-- Site keyの設定（通常は環境変数で管理）
UPDATE auth.config 
SET value = 'your_hcaptcha_site_key' 
WHERE parameter = 'hcaptcha_site_key';
```

## 4. 現在のアプリケーション設定状況

### 4.1 実装済み機能
- ✅ フロントエンドhCaptcha統合
- ✅ 開発環境での無効化オプション
- ✅ エラーハンドリング
- ✅ テスト用サイトキー設定済み

### 4.2 環境変数（現在）
```env
# 開発環境用テストキー（実際には動作しない）
NEXT_PUBLIC_HCAPTCHA_SITE_KEY=10000000-ffff-ffff-ffff-000000000001

# 開発環境では無効化
NEXT_PUBLIC_SKIP_CAPTCHA=true
NEXT_PUBLIC_DEV_MODE=true
```

### 4.3 実装されているCaptcha検証ロジック
- サインアップ時のCaptcha検証
- サインイン時のCaptcha検証
- パスワードリセット時のCaptcha検証（オプション）
- 開発環境でのスキップ機能

## 5. 本番環境での有効化手順

### 5.1 実際のhCaptchaキー取得
1. 上記の手順1でhCaptchaアカウントを作成
2. 実際のSite KeyとSecret Keyを取得

### 5.2 環境変数更新
```env
# 本番用の実際のキーに更新
NEXT_PUBLIC_HCAPTCHA_SITE_KEY=your_real_site_key
HCAPTCHA_SECRET_KEY=your_real_secret_key

# Captchaを有効化
NEXT_PUBLIC_SKIP_CAPTCHA=false
NEXT_PUBLIC_DEV_MODE=false
```

### 5.3 Supabase設定更新
1. SupabaseダッシュボードでhCaptcha設定を有効化
2. 必要に応じてRLS(Row Level Security)ポリシーを更新

## 6. テスト方法

### 6.1 開発環境でのテスト
現在は`NEXT_PUBLIC_SKIP_CAPTCHA=true`のため、Captchaなしでログイン可能

### 6.2 Captcha有効化テスト
1. `.env.local`で`NEXT_PUBLIC_SKIP_CAPTCHA=false`に設定
2. 開発サーバーを再起動
3. `http://localhost:3000/login`でCaptcha表示を確認

### 6.3 本番環境テスト
実際のキーを設定後、以下を確認：
- Captcha表示
- 認証成功/失敗
- エラーハンドリング

## 7. トラブルシューティング

### 7.1 よくある問題
- **Captcha表示されない**: Site Keyが正しく設定されているか確認
- **認証失敗**: Secret KeyがSupabase側で正しく設定されているか確認
- **ドメインエラー**: hCaptchaサイト設定でドメインが正しく登録されているか確認

### 7.2 ログ確認
```javascript
// ブラウザコンソールでhCaptchaエラーをチェック
console.log('hCaptcha Site Key:', process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY);
```

## 8. セキュリティ考慮事項

### 8.1 キー管理
- Secret Keyはサーバーサイドでのみ使用
- Site Keyはクライアントサイドで使用（公開OK）
- 環境変数での安全な管理

### 8.2 レート制限
- hCaptchaと組み合わせたレート制限設定
- 既存のAuthSecurityMonitorとの連携

### 8.3 ユーザビリティ
- アクセシビリティ対応
- モバイル表示最適化
- エラーメッセージの多言語化

---

**注意**: 現在の開発環境では`SKIP_CAPTCHA=true`でCaptcha認証が無効化されています。本番環境では必ず実際のhCaptchaキーを設定し、Captcha認証を有効化してください。