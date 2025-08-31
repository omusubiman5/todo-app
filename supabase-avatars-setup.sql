-- Supabase アバター画像ストレージ設定
-- このスクリプトはSupabase SQL Editorで実行してください

-- 1. avatarsバケットが存在しない場合のみ作成
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars', 
  true,
  2097152, -- 2MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 2. プロフィール画像用のRLSポリシー設定

-- 認証されたユーザーは自分のフォルダーにファイルをアップロード可能
CREATE POLICY "Users can upload their own avatars" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1] AND
  auth.role() = 'authenticated'
);

-- 認証されたユーザーは自分のアバター画像を更新可能
CREATE POLICY "Users can update their own avatars" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1] AND
  auth.role() = 'authenticated'
);

-- 認証されたユーザーは自分のアバター画像を削除可能
CREATE POLICY "Users can delete their own avatars" ON storage.objects
FOR DELETE USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1] AND
  auth.role() = 'authenticated'
);

-- 全員がアバター画像を表示可能（パブリックバケットのため）
CREATE POLICY "Anyone can view avatars" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

-- 確認用クエリ
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets 
WHERE id = 'avatars';

-- RLSポリシー確認
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname LIKE '%avatar%';

-- 使用方法:
-- 1. このSQLをSupabaseダッシュボードのSQL Editorにコピー
-- 2. 「Run」ボタンで実行
-- 3. アプリケーションを再読み込みしてテスト