# Supabase 2FA設定ガイド

## 1. Supabase Dashboard設定

### ステップ1: 認証設定でMFAを有効化
1. Supabase Dashboardにログイン
2. プロジェクト選択 → Authentication → Settings → Multi-Factor Authentication
3. "Enable Multi-Factor Authentication" をONにする
4. デフォルトで TOTP (Time-based One-Time Password) が有効

### ステップ2: セキュリティ設定
```sql
-- Supabase SQL Editor で実行
-- MFAの設定を確認
SELECT * FROM auth.mfa_amr_claims WHERE session_id = auth.jwt()->'session_id';

-- MFA factors の確認
SELECT * FROM auth.mfa_factors WHERE user_id = auth.uid();
```

### ステップ3: Environment Variables
`.env.local` に以下を追加:
```env
# 2FA設定
NEXT_PUBLIC_SUPABASE_MFA_ENABLED=true
NEXT_PUBLIC_APP_NAME="タスク管理アプリ"
```

## 2. 必要なSupabase機能

### 有効になる機能:
- `supabase.auth.mfa.enroll()` - MFA登録
- `supabase.auth.mfa.challenge()` - チャレンジ作成
- `supabase.auth.mfa.verify()` - コード検証
- `supabase.auth.mfa.unenroll()` - MFA無効化

### セキュリティポリシー:
- TOTP (Google Authenticator, Authy等)
- 30秒間隔でのコード生成
- 6桁の数字コード
- QRコードでの設定