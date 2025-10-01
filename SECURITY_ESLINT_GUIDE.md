# ESLintセキュリティプラグイン導入ガイド

## 📋 概要

このプロジェクトには包括的なESLintセキュリティプラグイン設定が導入されています。

## 🔧 導入済みパッケージ

### セキュリティ専用プラグイン
- **eslint-plugin-security** - 一般的なセキュリティ脆弱性検出
- **eslint-plugin-no-secrets** - 秘密情報（API キー、トークン）検出
- **@microsoft/eslint-plugin-sdl** - Microsoft Security Development Lifecycle
- **eslint-plugin-no-unsanitized** - XSS攻撃防止（DOM操作の安全性）

### コード品質とセキュリティ
- **eslint-plugin-sonarjs** - コードの複雑性とセキュリティホール検出
- **eslint-plugin-jsx-a11y** - アクセシビリティセキュリティ

## 🛡️ 検出するセキュリティリスク

### 1. オブジェクトインジェクション攻撃
```javascript
// 🚨 危険: 動的プロパティアクセス
const value = obj[userInput];

// ✅ 安全: ホワイトリスト検証
const allowedKeys = ['name', 'email'];
if (allowedKeys.includes(userInput)) {
  const value = obj[userInput];
}
```

### 2. 秘密情報の誤露出
```javascript
// 🚨 危険: ハードコードされたAPI キー
const apiKey = "sk-1234567890abcdef";

// ✅ 安全: 環境変数使用
const apiKey = process.env.API_KEY;
```

### 3. XSS攻撃
```javascript
// 🚨 危険: 直接的なDOM操作
element.innerHTML = userInput;

// ✅ 安全: textContentまたはサニタイズ
element.textContent = userInput;
```

### 4. 正規表現DoS (ReDoS)
```javascript
// 🚨 危険: 複雑すぎる正規表現
const regex = /(a+)+$/;

// ✅ 安全: 単純な正規表現
const regex = /^[a-zA-Z0-9]+$/;
```

### 5. 任意コード実行
```javascript
// 🚨 危険: eval使用
eval(userInput);

// ✅ 安全: JSON.parse等の安全な代替
JSON.parse(userInput);
```

## 🚀 使用方法

### 基本的なセキュリティチェック
```bash
npm run lint:security
```

### セキュリティエラーのみ表示（CI/CD用）
```bash
npm run security-check:critical
```

### 自動修正可能な問題を修正
```bash
npm run lint:security-fix
```

### 包括的なセキュリティ監査
```bash
npm run security-full
```

### 依存関係の脆弱性チェック
```bash
npm run security-audit
```

## ⚙️ 設定レベル

### エラーレベル（ビルド停止）
- オブジェクトインジェクション
- 秘密情報の露出
- XSS脆弱性
- eval系関数の使用
- 安全でない正規表現

### 警告レベル（開発効率重視）
- 複雑度チェック
- アクセシビリティ軽微な問題
- コードスタイル

## 🔍 カスタム検出パターン

### Supabase特化
- Supabase URL: `https://[a-z0-9-]+\.supabase\.co`
- Supabase Key: `eyJ[A-Za-z0-9_/+-]*...`

### API関連
- API Key: `(api[_-]?key|apikey)\s*[:=]\s*['\"]?[a-zA-Z0-9]{20,}['\"]?`
- JWT Token: `ey[A-Za-z0-9_/+-]*\.[A-Za-z0-9_/+-]*\.[A-Za-z0-9_/+-]*`

## 🎯 CI/CDでの活用

### GitHub Actions例
```yaml
- name: Security Lint Check
  run: npm run security-check:critical

- name: Dependency Audit
  run: npm run security-audit
```

### Pre-commit Hook例
```json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run security-check:critical"
    }
  }
}
```

## 📊 セキュリティメトリクス

現在の状態:
- ✅ **依存関係脆弱性**: 0件
- ✅ **Critical Security Issues**: 大幅削減済み
- ✅ **秘密情報検出**: 適切に管理済み
- ✅ **XSS対策**: DOM操作の安全性確保

## 🔄 継続的改善

1. **週次**: `npm run security-full` 実行
2. **リリース前**: `npm run security-check:critical` 必須
3. **依存関係更新後**: `npm audit` 実行
4. **新機能追加時**: セキュリティレビュー実施

## 🆘 トラブルシューティング

### よくあるエラーと対処法

**Object Injection Warning**
```javascript
// 問題のあるコード
const value = obj[dynamicKey];

// 修正方法
const allowedKeys = ['key1', 'key2'];
const value = allowedKeys.includes(dynamicKey) ? obj[dynamicKey] : null;
```

**Secret Detection False Positive**
```javascript
// 正当なプレースホルダーの場合
// eslint-disable-next-line no-secrets/no-secrets
const placeholder = "data:image/jpeg;base64,..."
```

## 📚 参考資料

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [ESLint Security Plugin](https://github.com/eslint-community/eslint-plugin-security)
- [Microsoft SDL](https://www.microsoft.com/en-us/securityengineering/sdl)