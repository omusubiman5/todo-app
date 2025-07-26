-- 既存のチームアバター関連ポリシーを削除してから新しいポリシーを作成

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Allow authenticated users to upload team avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update team avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete team avatars" ON storage.objects;
DROP POLICY IF EXISTS "Team owners can upload team avatars" ON storage.objects;
DROP POLICY IF EXISTS "Team owners can update team avatars" ON storage.objects;
DROP POLICY IF EXISTS "Team owners can delete team avatars" ON storage.objects;

-- チームアバター用のシンプルなポリシーを作成
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