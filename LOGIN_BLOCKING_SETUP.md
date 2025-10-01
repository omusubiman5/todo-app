# ログイン試行ブロック機能 - セットアップガイド

## 概要

短時間に何度もログインを試行された場合の自動ブロック機能を実装しました。IPアドレス単位での制限により、正当なユーザーに配慮しつつセキュリティを強化します。

## 主な機能

### 1. 試行回数のカウント方法
- **IPアドレス単位**: 同一IPからの試行を追跡
- **メールアドレス単位**: 同一メールアドレスでの試行を監視
- **時間窓**: 設定可能な時間窓内での試行回数をカウント
- **リアルタイム追跡**: データベースによるリアルタイムの試行追跡

### 2. ブロック期間の設定
- **初期ブロック期間**: デフォルト15分
- **エスカレーション**: 再ブロック時に期間を2倍に延長
- **最大ブロック期間**: デフォルト1440分（24時間）
- **永続ブロック**: 閾値（デフォルト10回）を超えた場合

### 3. IPアドレス単位での制限
- **自動ブロック**: 設定回数を超えた場合の自動ブロック
- **手動ブロック**: 管理者による手動ブロック機能
- **ホワイトリスト**: 信頼できるIPアドレスの除外設定
- **ブロック解除**: 管理者による即座のブロック解除

### 4. 正当なユーザーへの配慮
- **段階的制限**: 初回は短時間のブロック
- **成功時リセット**: 正常ログイン時に試行カウントをリセット
- **明確な通知**: ブロック理由と残り時間を表示
- **管理者対応**: 誤ったブロックの即座の解除機能

## セットアップ手順

### 1. データベースセットアップ

```bash
# Supabaseでデータベーススキーマを適用
psql -h your-supabase-host -U postgres -d your-database -f supabase-login-attempts-setup.sql
```

**作成されるテーブル:**
- `login_attempts`: ログイン試行記録
- `blocked_ips`: IPブロック管理
- `security_settings`: セキュリティ設定

### 2. 環境変数設定

`.env.local`に以下を追加：
```env
# 既存のSupabase設定
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# 開発環境でのCaptchaスキップ（オプション）
NEXT_PUBLIC_SKIP_CAPTCHA=true
NEXT_PUBLIC_DEV_MODE=true
```

### 3. Supabaseでの関数とポリシー有効化

データベースに以下の機能が作成されます：

**主要関数:**
- `record_login_attempt()`: ログイン試行記録
- `is_ip_blocked()`: IPブロック状態確認
- `evaluate_auto_block()`: 自動ブロック評価
- `cleanup_expired_blocks()`: 期限切れブロック削除

**RLSポリシー:**
- 管理者のみがセキュリティ情報にアクセス可能
- チーム所有者のみが設定変更可能

## 使用方法

### 1. フロントエンドでの統合

```typescript
import LoginAttemptService from '@/lib/services/loginAttemptService';

// ログイン試行の記録
const result = await LoginAttemptService.recordAttempt(
  '192.168.1.1',    // IPアドレス
  'user@email.com', // メールアドレス
  navigator.userAgent, // ユーザーエージェント
  false // 成功/失敗
);

if (result.blocked) {
  // ブロック処理
  console.log(`ブロックされました: ${result.message}`);
  console.log(`残り時間: ${result.blockDuration}分`);
}
```

### 2. 管理画面での監視

SecurityDashboardコンポーネントで以下の監視が可能：
- リアルタイムセキュリティ統計
- ブロック中IPアドレス一覧
- 最近のログイン試行履歴
- 手動ブロック/解除機能

### 3. API エンドポイントでの使用

```typescript
// /api/auth/login/route.ts
import { withAuthRateLimit } from '@/lib/middleware/rateLimiter';

export async function POST(request: NextRequest) {
  return withAuthRateLimit(request, loginHandler);
}
```

## 設定のカスタマイズ

### デフォルト設定

| 設定項目 | デフォルト値 | 説明 |
|---------|------------|------|
| IPあたり最大試行回数 | 5回 / 15分 | 同一IPからの制限 |
| メールあたり最大試行回数 | 3回 / 15分 | 同一メールでの制限 |
| 初期ブロック期間 | 15分 | 最初のブロック期間 |
| エスカレーション倍数 | 2倍 | 再ブロック時の期間延長 |
| 最大ブロック期間 | 1440分 | 最長ブロック期間 |
| 永続ブロック閾値 | 10回 | 永続ブロックの条件 |

### 設定変更方法

```typescript
// セキュリティ設定の更新
await LoginAttemptService.updateSecuritySettings(
  'max_attempts_per_ip',
  { value: 3, windowMinutes: 10 }
);
```

## 監視とメンテナンス

### 1. 定期クリーンアップ

```typescript
// 期限切れブロックの削除
await LoginAttemptService.cleanupExpiredBlocks();

// 古いログ記録の削除（30日以上古い記録）
await LoginAttemptService.cleanupOldAttempts(30);
```

### 2. セキュリティ統計の監視

```typescript
// セキュリティ統計の取得
const stats = await LoginAttemptService.getSecurityStats();
console.log('24時間の総試行数:', stats.totalAttempts.value);
console.log('ブロック中のIP数:', stats.currentlyBlocked.value);
```

### 3. 緊急時の対応

```typescript
// 緊急時のIPブロック解除
await LoginAttemptService.unblockIP('192.168.1.100');

// 手動でのIPブロック
await LoginAttemptService.blockIP(
  '192.168.1.200',
  '不正アクセスの疑い',
  60 // 60分間ブロック
);
```

## セキュリティ考慮事項

### 1. データ保護
- ログに機密情報（パスワード等）は記録しません
- RLSポリシーにより管理者のみがアクセス可能
- IPアドレスとメールアドレスの適切な匿名化

### 2. 可用性の確保
- ホワイトリスト機能による重要IPの保護
- 段階的制限による正当ユーザーへの配慮
- 管理者による即座のブロック解除機能

### 3. 監査とコンプライアンス
- すべてのログイン試行の詳細記録
- ブロック/解除操作の監査ログ
- セキュリティイベントの統計情報

## トラブルシューティング

### よくある問題と解決方法

1. **IPアドレスが正しく取得できない**
   - リバースプロキシの設定を確認
   - `X-Forwarded-For`ヘッダーの確認

2. **ブロックが期待通りに動作しない**
   - データベース関数の実行権限を確認
   - RLSポリシーの設定を確認

3. **管理画面にアクセスできない**
   - ユーザーがチーム管理者権限を持つことを確認
   - RLSポリシーの適切な設定を確認

### ログの確認

```typescript
// ブラウザのコンソールでデバッグ情報を確認
console.log('Login attempt result:', result);
console.log('Block info:', blockInfo);
```

## 今後の拡張可能性

- Redis を使用した分散レート制限
- 機械学習による異常検知
- より詳細な地理的制限
- デバイスフィンガープリンティング
- CAPTCHA の動的レベル調整

## 関連ファイル

- `supabase-login-attempts-setup.sql`: データベーススキーマ
- `lib/services/loginAttemptService.ts`: メインサービス
- `lib/middleware/rateLimiter.ts`: ミドルウェア
- `components/admin/SecurityDashboard.tsx`: 管理画面
- `app/api/client-ip/route.ts`: IPアドレス取得API
- `app/api/auth/login/route.ts`: 認証API例