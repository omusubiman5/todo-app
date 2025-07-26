-- チームアバター用のストレージポリシー設定

-- チームアバターアップロード権限（チームのオーナーのみ）
CREATE POLICY "Team owners can upload team avatars" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND
    name ~ '^team-[a-f0-9-]+' AND
    EXISTS (
      SELECT 1 FROM public.teams t
      JOIN public.team_members tm ON t.id = tm.team_id
      WHERE t.id::text = SUBSTRING(name FROM '^team-([a-f0-9-]+)')
      AND tm.user_id = auth.uid()
      AND tm.role = 'owner'
    )
  );

-- チームアバター更新権限（チームのオーナーのみ）
CREATE POLICY "Team owners can update team avatars" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' AND
    name ~ '^team-[a-f0-9-]+' AND
    EXISTS (
      SELECT 1 FROM public.teams t
      JOIN public.team_members tm ON t.id = tm.team_id
      WHERE t.id::text = SUBSTRING(name FROM '^team-([a-f0-9-]+)')
      AND tm.user_id = auth.uid()
      AND tm.role = 'owner'
    )
  );

-- チームアバター削除権限（チームのオーナーのみ）
CREATE POLICY "Team owners can delete team avatars" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars' AND
    name ~ '^team-[a-f0-9-]+' AND
    EXISTS (
      SELECT 1 FROM public.teams t
      JOIN public.team_members tm ON t.id = tm.team_id
      WHERE t.id::text = SUBSTRING(name FROM '^team-([a-f0-9-]+)')
      AND tm.user_id = auth.uid()
      AND tm.role = 'owner'
    )
  );

-- より簡単な代替ポリシー（認証済みユーザーならチームアバターをアップロード可能）
-- 上記の複雑なポリシーで問題が発生する場合は、以下のシンプルなポリシーを使用

-- DROP POLICY IF EXISTS "Team owners can upload team avatars" ON storage.objects;
-- DROP POLICY IF EXISTS "Team owners can update team avatars" ON storage.objects;
-- DROP POLICY IF EXISTS "Team owners can delete team avatars" ON storage.objects;

-- CREATE POLICY "Authenticated users can upload team avatars" ON storage.objects
--   FOR INSERT WITH CHECK (
--     bucket_id = 'avatars' AND
--     name ~ '^team-' AND
--     auth.uid() IS NOT NULL
--   );

-- CREATE POLICY "Authenticated users can update team avatars" ON storage.objects
--   FOR UPDATE USING (
--     bucket_id = 'avatars' AND
--     name ~ '^team-' AND
--     auth.uid() IS NOT NULL
--   );

-- CREATE POLICY "Authenticated users can delete team avatars" ON storage.objects
--   FOR DELETE USING (
--     bucket_id = 'avatars' AND
--     name ~ '^team-' AND
--     auth.uid() IS NOT NULL
--   );