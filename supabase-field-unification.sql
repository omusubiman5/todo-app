-- completed/statusフィールド統一のためのデータベース移行スクリプト

-- 現在の状況確認
/*
現在のtasksテーブルには以下の重複フィールドがある：
- completed BOOLEAN DEFAULT FALSE
- status TEXT CHECK (status IN ('pending', 'in_progress', 'completed')) DEFAULT 'pending'

これらを統一してstatus1つに集約する
*/

-- ステップ1: 既存データの整合性確認
DO $$
DECLARE
    inconsistent_count INTEGER;
BEGIN
    -- completedとstatusの不整合を確認
    SELECT COUNT(*) INTO inconsistent_count
    FROM tasks 
    WHERE (completed = true AND status != 'completed') 
       OR (completed = false AND status = 'completed');
    
    RAISE NOTICE '不整合なレコード数: %', inconsistent_count;
    
    -- 不整合データがある場合は修正
    IF inconsistent_count > 0 THEN
        RAISE NOTICE 'データを修正します...';
        
        -- completed=trueだが status!='completed' の場合
        UPDATE tasks 
        SET status = 'completed' 
        WHERE completed = true AND status != 'completed';
        
        -- completed=falseだが status='completed' の場合
        UPDATE tasks 
        SET completed = false 
        WHERE completed = false AND status = 'completed';
        
        RAISE NOTICE 'データ修正完了';
    END IF;
END $$;

-- ステップ2: completedフィールドから最新データでstatusを更新
UPDATE tasks 
SET status = CASE 
    WHEN completed = true THEN 'completed'
    WHEN completed = false AND status = 'completed' THEN 'pending'
    ELSE status
END;

-- ステップ3: トリガー作成（completedフィールド自動更新用の一時的措置）
-- アプリケーションコードの移行期間中に整合性を保つ
CREATE OR REPLACE FUNCTION sync_completed_status()
RETURNS TRIGGER AS $$
BEGIN
    -- statusが更新された場合、completedも同期
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        NEW.completed := (NEW.status = 'completed');
    -- completedが更新された場合、statusも同期  
    ELSIF NEW.completed IS DISTINCT FROM OLD.completed THEN
        NEW.status := CASE 
            WHEN NEW.completed = true THEN 'completed'
            WHEN NEW.completed = false AND OLD.status = 'completed' THEN 'pending'
            ELSE NEW.status
        END;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 同期トリガーを作成
DROP TRIGGER IF EXISTS sync_completed_status_trigger ON tasks;
CREATE TRIGGER sync_completed_status_trigger
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION sync_completed_status();

-- ステップ4: データ確認用ビュー作成
CREATE OR REPLACE VIEW task_status_check AS
SELECT 
    id,
    title,
    completed,
    status,
    CASE 
        WHEN completed = true AND status = 'completed' THEN 'OK'
        WHEN completed = false AND status != 'completed' THEN 'OK'  
        ELSE 'INCONSISTENT'
    END as consistency_status,
    created_at
FROM tasks;

-- 確認用クエリの説明
/*
-- データの整合性確認
SELECT consistency_status, COUNT(*) 
FROM task_status_check 
GROUP BY consistency_status;

-- 不整合データの詳細確認
SELECT * FROM task_status_check 
WHERE consistency_status = 'INCONSISTENT';
*/

-- ステップ5: 完全移行後の cleanup用スクリプト（コメントアウト状態）
/*
-- ⚠️ アプリケーションコードの完全移行後にのみ実行すること
-- completedフィールドを削除する最終段階のスクリプト

-- 1. トリガー削除
DROP TRIGGER IF EXISTS sync_completed_status_trigger ON tasks;
DROP FUNCTION IF EXISTS sync_completed_status();

-- 2. completedカラム削除
ALTER TABLE tasks DROP COLUMN IF EXISTS completed;

-- 3. 確認用ビュー削除
DROP VIEW IF EXISTS task_status_check;

-- 4. 最終確認用のサンプルクエリ
SELECT 
    status, 
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM tasks 
GROUP BY status 
ORDER BY count DESC;
*/

COMMIT;