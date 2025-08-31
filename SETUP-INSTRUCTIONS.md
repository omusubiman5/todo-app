# Supabase セットアップ手順書

## 🚨 緊急対応（即座に実行が必要）

### 1. メール確認を一時的に無効化

**Supabase Dashboard での操作:**
1. https://app.supabase.com/projects にアクセス
2. プロジェクト: `zmxnsfjmusgmapxbcbpn` を選択
3. 左メニュー: `Authentication` → `Settings`
4. **「Enable email confirmations」のチェックを外す**
5. 「Save」をクリック

これにより、ユーザー登録後即座にログイン可能になります。

---

### 2. プロファイル自動作成トリガー設定

**SQL Editor での操作:**
1. Supabase Dashboard → `SQL Editor` → `New query`
2. 以下のSQLをコピー&ペーストして実行:

```sql
-- Step 1: プロファイルテーブル作成（存在しない場合）
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Step 2: RLS有効化
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 3: ポリシー設定
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;  
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;
CREATE POLICY "Users can delete own profile" ON public.profiles
  FOR DELETE USING (auth.uid() = id);

-- Step 4: 権限設定
GRANT ALL ON public.profiles TO postgres, anon, authenticated, service_role;

-- Step 5: トリガー関数作成
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, bio)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    'New user profile'
  );
  RETURN NEW;
END;
$$;

-- Step 6: トリガー作成
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

3. 「RUN」をクリックして実行

---

### 3. Site URL設定確認

**Authentication Settings での確認:**
1. `Authentication` → `Settings`
2. `Site URL`: `http://localhost:3003` に設定
3. `Redirect URLs` に以下を追加:
   - `http://localhost:3003`
   - `http://localhost:3003/**`

---

## ✅ 設定完了後の確認

上記設定完了後、以下のコマンドでテストしてください:

```bash
cd todo-app
node debug-signup-status.js
```

**期待される結果:**
- ✅ User created: YES
- ✅ Session created: YES  
- ✅ Profile exists: YES

---

## 🔧 本番環境用 SMTP プロバイダー設定

### Gmail SMTP設定

**前提条件:**
1. Googleアカウントで2段階認証を有効化
2. アプリパスワードを生成

**設定手順:**
1. `Authentication` → `Settings` → `SMTP Settings`
2. 以下を設定:
   - **Host**: `smtp.gmail.com`
   - **Port**: `587`
   - **Username**: あなたのGmailアドレス
   - **Password**: 生成したアプリパスワード
   - **Sender Name**: アプリ名
   - **Sender Email**: あなたのGmailアドレス

### SendGrid設定

**前提条件:**
1. SendGridアカウント作成
2. API Key生成

**設定手順:**
1. `Authentication` → `Settings` → `SMTP Settings`
2. 以下を設定:
   - **Host**: `smtp.sendgrid.net`
   - **Port**: `587`
   - **Username**: `apikey`
   - **Password**: 生成したSendGrid API Key
   - **Sender Name**: アプリ名
   - **Sender Email**: 認証済みのメールアドレス

---

## 📋 チェックリスト

### 緊急対応完了チェック
- [ ] メール確認無効化 (`Enable email confirmations` をオフ)
- [ ] SQLトリガー設定実行
- [ ] Site URL設定確認
- [ ] テストスクリプト実行で全項目OK

### 本番対応チェック
- [ ] SMTPプロバイダー選択・設定
- [ ] メール確認再有効化
- [ ] 本番ドメインでのテスト
- [ ] メール送信テスト

---

## 🚀 完了後のテスト手順

1. **開発サーバー起動:**
   ```bash
   cd todo-app
   npm run dev
   ```

2. **ブラウザでアクセス:** `http://localhost:3003`

3. **新規アカウント作成テスト:**
   - 実際のメールアドレスで登録
   - 即座にログイン完了することを確認
   - ダッシュボードが表示されることを確認

4. **データベース確認:**
   - Supabase Dashboard → `Table Editor` → `profiles`
   - 新規作成したユーザーのプロファイルが存在することを確認

---

## ❗ 注意事項

- **メール確認無効化は開発・テスト目的のみ**
- **本番環境では必ずSMTPプロバイダーを設定してメール確認を有効化**
- **テスト用メールアドレス（test@example.comなど）は使用不可**
- **実際のメールアドレスでのテストを推奨**