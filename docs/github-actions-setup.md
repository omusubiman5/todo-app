# 🚀 GitHub Actions CI/CD セットアップガイド

## 📋 必要なGitHub Secretsの設定

GitHub Actionsが正常に動作するために、以下のSecretを設定する必要があります：

### 1️⃣ GitHub Repositoryでの設定手順

1. **GitHubリポジトリ** → **Settings** → **Secrets and variables** → **Actions** へ移動
2. **New repository secret** をクリック
3. 以下の4つのSecretを順次追加：

### 2️⃣ 必要なSecret一覧

#### **VERCEL_TOKEN**
```
説明: Vercelのデプロイメント用APIトークン
取得方法:
1. Vercel Dashboard → Settings → Tokens
2. "Create Token" をクリック
3. スコープを "Full Access" に設定
4. 生成されたトークンをコピー
```

#### **VERCEL_ORG_ID** 
```
説明: VercelのOrganization ID
取得方法:
1. プロジェクトルートでコマンド実行: npx vercel link
2. 生成される .vercel/project.json の "orgId" をコピー
または
1. Vercel Dashboard → Settings → General
2. "Organization ID" をコピー
```

#### **VERCEL_PROJECT_ID**
```
説明: VercelのProject ID  
取得方法:
1. プロジェクトルートでコマンド実行: npx vercel link
2. 生成される .vercel/project.json の "projectId" をコピー
または
1. Vercel Dashboard → プロジェクト選択 → Settings → General
2. "Project ID" をコピー
```

#### **GITHUB_TOKEN**
```
説明: GitHub Actions用のトークン（通常は自動で設定済み）
注意: 通常は ${{ secrets.GITHUB_TOKEN }} として自動利用可能
手動設定は不要ですが、権限エラーが発生した場合のみ設定
```

## 🔧 ローカルでのVercel設定

### 初回セットアップ
```bash
# Vercel CLIインストール
npm install -g vercel

# プロジェクトをVercelにリンク
npx vercel link

# .vercelフォルダが作成され、project.jsonに設定が保存される
```

### 設定確認
```bash
# .vercel/project.json の内容確認
cat .vercel/project.json
```

出力例：
```json
{
  "orgId": "team_xxxxxxxxxxxxxxx",
  "projectId": "prj_xxxxxxxxxxxxxxx"
}
```

## 📊 CI/CDパイプラインの動作フロー

### 🧪 テスト段階（全ブランチ）
1. **TypeScript型チェック** - `npm run type-check`
2. **ESLint品質チェック** - `npm run lint` 
3. **単体テスト実行** - `npm run test`
4. **ビルドテスト** - `npm run build`
5. **E2Eテスト** - Playwright Chromium

### 🚢 デプロイ段階（mainブランチのみ）
1. **テスト完了後に自動実行**
2. **Vercel本番環境へデプロイ**
3. **デプロイ結果をPull Requestにコメント**

### 📈 パフォーマンステスト（Pull Requestのみ）
1. **Performance benchmarkテスト実行**
2. **結果をPull Requestにレポート**

## ⚡ トリガー条件

### 自動実行されるタイミング
- `main`、`develop`、`hotfix/**` ブランチへのpush
- `main`、`develop` ブランチへのPull Request作成・更新

### デプロイされるタイミング
- `main` ブランチへの **直接push時のみ**
- Pull Requestマージ後の自動デプロイ

## 🔍 トラブルシューティング

### よくあるエラー

#### **Secret未設定エラー**
```
Error: VERCEL_TOKEN is not set
```
**解決方法**: GitHub SecretsにVERCEL_TOKENを設定

#### **権限エラー**  
```
Error: Insufficient permissions
```
**解決方法**: Vercel TokenのスコープをFull Accessに変更

#### **プロジェクト未リンクエラー**
```
Error: Project not found
```
**解決方法**: `npx vercel link` でプロジェクトを再リンク

## 📚 カスタマイズ方法

### テスト条件の変更
```yaml
# .github/workflows/ci.yml の該当箇所を編集
- name: 🧪 Run Unit Tests
  run: npm run test -- --coverage --watchAll=false --passWithNoTests
```

### デプロイ条件の変更
```yaml
# 複数ブランチでデプロイする場合
if: contains(fromJson('["main", "staging"]'), github.ref_name) && github.event_name == 'push'
```

これで完全なCI/CDパイプラインが構築されます！