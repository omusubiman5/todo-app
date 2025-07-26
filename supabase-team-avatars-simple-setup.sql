-- チームアバター用のシンプルなストレージポリシー設定
-- まず既存のポリシーを削除（存在する場合）

-- チームアバター用のシンプルなポリシー（認証済みユーザーがアップロード可能）
CREATE POLICY "Allow authenticated users to upload team avatars" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND
    name ~ '^team-' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Allow authenticated users to update team avatars" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' AND
    name ~ '^team-' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Allow authenticated users to delete team avatars" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars' AND
    name ~ '^team-' AND
    auth.uid() IS NOT NULL
  );

-- 全員がアバターを閲覧できるようにする（既存のポリシーがない場合）
-- CREATE POLICY "Anyone can view avatars" ON storage.objects
--   FOR SELECT USING (bucket_id = 'avatars');