# 🌟 黄金の開発フロー - SuperClaude Edition

## 🎯 完全自動化開発ワークフロー

このワークフローは要件定義から実装、テスト、ドキュメント生成まで全てを自動化する完璧な開発フローです。

## 📋 ワークフローステップ

### Step 1: 要件定義ワークフロー
```bash
# 要件から設計を生成
npm run sc:workflow new-feature
# または
node scripts/workflow-command.js new-feature
```

**生成物:**
- `requirements/new-feature.md` - 構造化された要件定義書
- ビジネス要件、技術要件、UI/UX要件を包含
- 成功指標とテスト戦略を含む

### Step 2: 詳細設計生成
```bash
# 設計を詳細化
npm run sc:design new-feature --type=detailed
# または
node scripts/design-command.js new-feature --type=detailed
```

**生成物:**
- `design/new-feature-detailed-design.md` - 詳細設計書
- アーキテクチャ図、コンポーネント設計
- データモデル、API仕様、セキュリティモデル
- テスト戦略とパフォーマンス要件

### Step 3: セーフ実装（テスト付き）
```bash
# 実装（テスト付き）
npm run sc:implement new-feature --safe --with-tests
# または
node scripts/implement-command.js new-feature --safe --with-tests
```

**生成物:**
- 完全なTDD実装（テストファースト）
- フロントエンド: Container/Presentational コンポーネント
- バックエンド: Service層、型定義
- カスタムフック: `useNewFeature`
- 自動バックアップとロールバック機能

### Step 4: API ドキュメント自動生成
```bash
# ドキュメント自動生成
npm run sc:document new-feature --type=api
# または
node scripts/document-command.js new-feature --type=api
```

**生成物:**
- `docs/new-feature-api.md` - 完全なAPI仕様書
- OpenAPI準拠の仕様
- コード例（JavaScript、React、cURL）
- リアルタイム仕様とエラーハンドリング

## 🏗️ 生成されるファイル構造

```
your-project/
├── requirements/
│   └── new-feature.md              # 構造化要件定義
├── design/
│   └── new-feature-detailed-design.md  # 詳細設計書
├── components/
│   └── new-feature/
│       ├── index.ts                # エクスポートファイル
│       ├── NewFeatureContainer.tsx # Container Component
│       └── NewFeatureView.tsx      # Presentational Component  
├── lib/
│   ├── newFeatureService.ts        # Service Layer
│   └── types.ts                    # 型定義（更新）
├── hooks/
│   └── useNewFeature.ts            # Custom Hook
├── __tests__/
│   ├── NewFeatureContainer.test.tsx
│   ├── NewFeatureView.test.tsx
│   ├── newFeatureService.test.ts
│   └── useNewFeature.test.ts
├── docs/
│   └── new-feature-api.md          # API ドキュメント
└── .backups/
    └── new-feature-[timestamp]/    # 自動バックアップ
```

## 🔧 コマンド詳細仕様

### `/sc:workflow` - 要件ワークフロー
```bash
node scripts/workflow-command.js <feature-name> [options]
```
- 構造化された要件テンプレート生成
- ビジネス要件、技術要件、UI/UX要件
- 成功指標とKPI設定
- 関係者レビューチェックリスト

### `/sc:design` - 設計コマンド
```bash
node scripts/design-command.js <feature-name> --type=<detailed|overview|api>
```
**Types:**
- `detailed`: 完全な詳細設計書
- `overview`: アーキテクチャ概要（未実装）
- `api`: API仕様のみ（未実装）

### `/sc:implement` - セーフ実装
```bash
node scripts/implement-command.js <feature-name> [flags]
```
**Flags:**
- `--safe`: バックアップ作成、ロールバック機能
- `--with-tests`: テストファースト開発
- `--dry-run`: 実行計画のみ表示

### `/sc:document` - ドキュメント生成
```bash
node scripts/document-command.js <feature-name> --type=<api|user|dev>
```
**Types:**
- `api`: API仕様書（完全実装）
- `user`: ユーザーガイド（未実装）
- `dev`: 開発者ドキュメント（未実装）

## 🛡️ セーフティ機能

### 自動バックアップ
- 実装前に自動的にファイルバックアップ
- タイムスタンプ付きバックアップフォルダ
- 失敗時の自動ロールバック

### 品質ゲート
1. **Pre-implementation checks:**
   - Git状態確認
   - 既存テスト実行
   - TypeScript型チェック

2. **Post-implementation validation:**
   - テスト実行
   - Lint チェック
   - TypeScript コンパイル

3. **Error handling:**
   - 失敗時の自動ロールバック
   - 詳細なエラーログ
   - 復旧手順の提示

## 🧪 テスト戦略

### TDD (Test-Driven Development)
1. **Test First**: 実装前にテスト作成
2. **Red-Green-Refactor**: 失敗→成功→リファクタリング
3. **Complete Coverage**: コンポーネント、サービス、フック

### テストタイプ
- **Unit Tests**: 個別コンポーネント/関数
- **Integration Tests**: サービス層統合
- **Component Tests**: React コンポーネント
- **Hook Tests**: カスタムフック

## 📊 生成されるコード品質

### TypeScript 完全対応
- 厳密な型定義
- インターフェース設計
- ジェネリクス活用

### React ベストプラクティス
- Container/Presentational パターン
- カスタムフック分離
- メモ化最適化
- エラーバウンダリ

### モダンなアーキテクチャ
- Service Layer パターン
- Repository パターン
- Observer パターン（リアルタイム）
- 依存性注入

## 🚀 実行例

### 新機能「ユーザープロフィール」の完全実装

```bash
# Step 1: 要件定義
npm run sc:workflow user-profile

# Step 2: 詳細設計
npm run sc:design user-profile --type=detailed

# Step 3: セーフ実装
npm run sc:implement user-profile --safe --with-tests

# Step 4: ドキュメント生成
npm run sc:document user-profile --type=api
```

**結果:** 約30分で本格的なフィーチャーが完成！

## 🔄 継続的改善

### ワークフロー最適化
- 実行時間の測定と最適化
- コード品質メトリクスの向上
- テンプレートの継続改善

### 機能拡張
- CI/CD パイプライン統合
- 自動デプロイメント
- パフォーマンス監視統合

## 💡 使用場面

### 理想的な使用ケース
- ✅ 新機能開発
- ✅ CRUD 操作実装
- ✅ API エンドポイント作成
- ✅ React コンポーネント開発

### 向いていない場面
- ❌ 複雑なUI/UXデザイン
- ❌ 既存コードの大規模リファクタリング
- ❌ パフォーマンス最適化

## 🎯 次世代開発体験

このワークフローにより以下が実現できます:

1. **開発速度 10倍向上** - 手作業の大幅削減
2. **品質の担保** - 自動テスト、型安全、ベストプラクティス
3. **ドキュメント同期** - コードと仕様の自動同期
4. **学習効果** - 生成されたコードからパターン学習

---

**🌟 黄金の開発フロー完成！**

Requirements → Design → Implementation → Documentation の完璧な自動化により、最高品質のソフトウェア開発体験を提供します。