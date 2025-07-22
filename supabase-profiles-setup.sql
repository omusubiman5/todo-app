  -- Profiles テーブル作成
  CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    display_name TEXT,
    bio TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
  );

  -- RLS (Row Level Security) を有効にする
  ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

  -- ユーザーは自分のプロフィールのみアクセス可能なポリシー
  CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

  CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

  CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

  CREATE POLICY "Users can delete own profile" ON public.profiles
    FOR DELETE USING (auth.uid() = id);

  -- updated_atを自動更新するトリガー関数
  CREATE OR REPLACE FUNCTION public.handle_updated_at()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  -- updated_atトリガー
  CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

  -- プロフィール画像用のStorageバケット作成
  INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

  -- Storageポリシー: ユーザーは自分のアバター画像のみアップロード/更新/削除可能
  CREATE POLICY "Users can upload own avatar" ON storage.objects
    FOR INSERT WITH CHECK (
      bucket_id = 'avatars' AND
      auth.uid()::text = (storage.foldername(name))[1]
    );

  CREATE POLICY "Users can update own avatar" ON storage.objects
    FOR UPDATE USING (
      bucket_id = 'avatars' AND
      auth.uid()::text = (storage.foldername(name))[1]
    );

  CREATE POLICY "Users can delete own avatar" ON storage.objects
    FOR DELETE USING (
      bucket_id = 'avatars' AND
      auth.uid()::text = (storage.foldername(name))[1]
    );

  CREATE POLICY "Anyone can view avatars" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');
