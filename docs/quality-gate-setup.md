# 品質ゲート設定ガイド

## 🎯 概要

このプロジェクトには以下の品質基準が設定されています：

1. **テスト成功率80%以上** - テストが80%以上成功しないとデプロイしない
2. **ESLintエラー0件** - コードの書き方にエラーがあるとデプロイしない  
3. **TypeScriptエラー0件** - TypeScriptエラーがあるとデプロイしない

## 🏗️ 自動品質チェック

### GitHub Actions ワークフロー

`.github/workflows/quality-gate.yml` で以下をチェック：

```yaml
✅ TypeScript型チェック (npm run type-check)
✅ ESLint コード品質チェック (npm run lint)
✅ テスト実行と成功率80%チェック (npm run test:ci)
✅ ビルドテスト (npm run build)
```

### 実行タイミング

- **プッシュ時**: main, develop, hotfix/*, feature/* ブランチ
- **プルリクエスト時**: main, develop ブランチ

## 🧪 テスト設定

### Jest 設定 (jest.config.js)

```javascript
// カバレッジしきい値（60%基準）
coverageThreshold: {
  global: {
    branches: 60,
    functions: 60,
    lines: 60,
    statements: 60
  }
}
```

### テストコマンド

```bash
# 通常のテスト実行
npm test

# カバレッジ付きテスト
npm run test:coverage

# CI用テスト（自動終了）
npm run test:ci

# ウォッチモード
npm run test:watch
```

## 🔧 品質チェック方法

### ローカル実行

デプロイ前にローカルで品質チェック：

```bash
# 1. TypeScriptチェック
npm run type-check

# 2. ESLintチェック
npm run lint

# 3. テスト実行
npm run test:ci

# 4. ビルドテスト
npm run build
```

### 修正方法

#### TypeScriptエラー修正
```bash
npm run type-check
# エラー内容を確認して型エラーを修正
```

#### ESLintエラー修正
```bash
npm run lint
# 自動修正可能なもの
npm run lint -- --fix
```

#### テスト成功率向上
```bash
# 失敗テストの確認
npm test
# 個別テスト実行
npm test -- ComponentName.test.tsx
```

## 📊 品質レポート

### 成功時の表示
```
🎉 すべての品質チェックに合格しました！
✅ TypeScript型チェック: 成功
✅ ESLint コード品質: 成功  
✅ テスト成功率: 80%以上
✅ ビルドテスト: 成功

🚀 デプロイ準備完了です！
```

### 失敗時の表示
```
❌ 品質ゲートで問題が検出されました。

📋 修正が必要な項目:
   - TypeScriptエラーの修正
   - ESLintエラーの修正
   - テスト成功率80%以上の確保
   - ビルドエラーの修正

🔧 修正後に再度プッシュしてください。
```

## 🚫 デプロイブロック条件

以下の条件でデプロイが自動的にブロックされます：

1. **TypeScriptエラー** が1件でもある
2. **ESLintエラー** が1件でもある
3. **テスト成功率** が80%未満
4. **ビルドエラー** が発生

## 🛠️ トラブルシューティング

### よくあるエラーと対処法

#### 1. テスト成功率が80%未満
```bash
# テスト詳細確認
npm test -- --verbose

# 特定のテストファイルのみ実行
npm test -- path/to/test.spec.ts

# カバレッジレポート確認
npm run test:coverage
open coverage/lcov-report/index.html
```

#### 2. TypeScriptエラー
```bash
# 詳細なエラー表示
npx tsc --noEmit --pretty

# 型定義の確認
npm run type-check
```

#### 3. ESLintエラー
```bash
# 詳細なエラー表示
npx eslint . --ext .ts,.tsx,.js,.jsx

# 自動修正試行
npx eslint . --ext .ts,.tsx,.js,.jsx --fix
```

## 📈 品質向上のヒント

### テスト品質向上
- コンポーネントの基本的な描画テストを追加
- ユーザーインタラクションのテストを追加
- エラーケースのテストを追加

### コード品質向上  
- ESLint推奨ルールの適用
- 適切な型定義の使用
- 一貫性のあるコーディングスタイル

### ビルド最適化
- 未使用のimportを削除
- 型安全性の確保
- Next.js最適化の活用

この品質ゲートにより、安定したソフトウェアリリースが保証されます！