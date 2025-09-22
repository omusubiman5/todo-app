# パスワード強度チェック機能 - 使用方法とコード例

強力なパスワード要求機能が実装されました。以下の4つの主要機能を提供します：

## 📁 ファイル構成

```
lib/
├── utils/passwordStrength.ts           # コア機能とタイプ定義
└── hooks/usePasswordValidation.ts      # React hooks

components/auth/
├── PasswordStrengthIndicator.tsx       # 強度表示コンポーネント
└── PasswordFormExample.tsx             # 使用例とサンプルフォーム
```

## 🔧 1. パスワード強度チェック機能

### 基本的な使用方法

```typescript
import { checkPasswordStrength } from '@/lib/utils/passwordStrength';

const result = checkPasswordStrength('MySecurePass123!');

console.log(result.score);     // 0-4の強度スコア
console.log(result.level);     // 'very-weak' | 'weak' | 'fair' | 'good' | 'strong'
console.log(result.isValid);   // 要件を満たしているか
console.log(result.feedback);  // ユーザー向けフィードバック
```

### 強度評価の基準

- **0-1点**: 非常に弱い (very-weak) - 基本要件未満
- **1-2点**: 弱い (weak) - 最低要件は満たすが改善が必要
- **2-3点**: 普通 (fair) - 標準的なセキュリティレベル
- **3-3.5点**: 良い (good) - 推奨レベル
- **3.5-4点**: 強い (strong) - 高セキュリティレベル

## ⚙️ 2. 要件設定のカスタマイズ

### デフォルト要件
```typescript
{
  minLength: 8,           // 最小文字数
  maxLength: 128,         // 最大文字数
  requireUppercase: true, // 大文字必須
  requireLowercase: true, // 小文字必須
  requireNumbers: true,   // 数字必須
  requireSpecialChars: true, // 特殊文字必須
  forbiddenPatterns: ['password', '12345', 'qwerty'], // 禁止パターン
  forbiddenWords: ['password', 'admin', 'user']       // 禁止単語
}
```

### カスタム要件の作成
```typescript
import { createPasswordRequirements, PASSWORD_PRESETS } from '@/lib/hooks/usePasswordValidation';

// プリセット使用
const strictRequirements = PASSWORD_PRESETS.STRICT;    // 厳格設定
const basicRequirements = PASSWORD_PRESETS.BASIC;      // 基本設定
const enterpriseRequirements = PASSWORD_PRESETS.ENTERPRISE; // 企業向け

// カスタム設定
const customRequirements = createPasswordRequirements({
  minLength: 10,
  requireSpecialChars: false,
  forbiddenWords: ['会社名', 'サービス名']
});
```

## 🎨 3. リアルタイム強度表示

### PasswordInputWithStrength コンポーネント

```tsx
import { PasswordInputWithStrength } from '@/components/auth/PasswordStrengthIndicator';

function MyForm() {
  const [password, setPassword] = useState('');

  return (
    <PasswordInputWithStrength
      value={password}
      onChange={setPassword}
      requirements={PASSWORD_PRESETS.STANDARD}
      showStrength={true}
      placeholder="パスワードを入力"
    />
  );
}
```

### PasswordStrengthIndicator コンポーネント

```tsx
import { PasswordStrengthIndicator } from '@/components/auth/PasswordStrengthIndicator';

function CustomPasswordField() {
  const [password, setPassword] = useState('');

  return (
    <div>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <PasswordStrengthIndicator
        password={password}
        requirements={PASSWORD_PRESETS.ENTERPRISE}
        showDetailedFeedback={true}
      />
    </div>
  );
}
```

## ✅ 4. ユーザーフレンドリーなエラーメッセージ

### 優先度付きフィードバック

```typescript
// 高優先度（必須要件）
"🚨 必須要件を満たしていません：
• 8文字以上128文字以下
• 一般的なパスワードパターンを避ける"

// 中優先度（セキュリティ向上）
"⚠️ セキュリティを向上させるために：
• 大文字を含む（A-Z）
• 数字を含む（0-9）"

// 低優先度（追加改善）
"💡 さらに安全にするために：
• 連続する同じ文字を3つ以上使わない
• キーボード配列パターンを避ける"
```

### 建設的なフィードバック

```typescript
// 文字数不足の場合
"📏 あと3文字追加してください"

// 長さ推奨
"🔒 12文字以上にするとより安全です"

// 成功時
"✅ 強力なパスワードです！"
```

## 🔨 実装例

### 1. シンプルなバリデーション

```tsx
import { usePasswordValidation } from '@/lib/hooks/usePasswordValidation';

function SimplePasswordForm() {
  const {
    password,
    confirmPassword,
    errors,
    isValid,
    setPassword,
    setConfirmPassword,
    validatePassword
  } = usePasswordValidation();

  const handleSubmit = () => {
    if (validatePassword()) {
      console.log('パスワード設定:', password);
    }
  };

  return (
    <form>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="パスワード"
      />

      <input
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        placeholder="パスワード確認"
      />

      {errors.map(error => (
        <div key={error} className="text-red-600">{error}</div>
      ))}

      <button onClick={handleSubmit} disabled={!isValid}>
        設定
      </button>
    </form>
  );
}
```

### 2. フォーム送信付きバリデーション

```tsx
import { usePasswordForm, PASSWORD_PRESETS } from '@/lib/hooks/usePasswordValidation';

function AdvancedPasswordForm() {
  const {
    password,
    confirmPassword,
    strength,
    errors,
    isSubmitting,
    canSubmit,
    setPassword,
    setConfirmPassword,
    handleSubmit
  } = usePasswordForm({
    requirements: PASSWORD_PRESETS.ENTERPRISE,
    onSubmit: async (password) => {
      // API呼び出し
      await updatePassword(password);
    },
    onSuccess: () => {
      alert('パスワードが更新されました！');
    },
    onError: (error) => {
      alert(`エラー: ${error}`);
    }
  });

  return (
    <form onSubmit={handleSubmit}>
      <PasswordInputWithStrength
        value={password}
        onChange={setPassword}
        requirements={PASSWORD_PRESETS.ENTERPRISE}
      />

      <input
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        placeholder="パスワード確認"
      />

      <button type="submit" disabled={!canSubmit}>
        {isSubmitting ? '更新中...' : 'パスワード更新'}
      </button>
    </form>
  );
}
```

### 3. 設定別実装例

```tsx
// 一般ユーザー向け（基本要件）
<PasswordFormExample
  title="アカウント作成"
  customRequirements={PASSWORD_PRESETS.BASIC}
/>

// 標準ユーザー向け
<PasswordFormExample
  title="パスワード変更"
  customRequirements={PASSWORD_PRESETS.STANDARD}
/>

// 管理者向け（厳格要件）
<PasswordFormExample
  title="管理者アカウント作成"
  customRequirements={PASSWORD_PRESETS.ENTERPRISE}
/>
```

## 🎯 設置場所の推奨

### 1. ユーザー登録画面
```
app/auth/register/page.tsx
├── PasswordInputWithStrength を使用
├── STANDARD プリセットを推奨
└── リアルタイム強度表示を有効
```

### 2. パスワード変更画面
```
app/settings/password/page.tsx
├── usePasswordForm フックを使用
├── 現在のパスワード確認も含める
└── STRICT プリセットを推奨
```

### 3. 管理者機能
```
app/admin/users/[id]/password/page.tsx
├── ENTERPRISE プリセットを使用
├── 詳細フィードバックを表示
└── 厳格な要件を適用
```

### 4. 2FA設定と組み合わせ
```tsx
// 既存の2FA設定と組み合わせ
import { TwoFactorSetup } from '@/components/auth/TwoFactorSetup';
import { PasswordFormExample } from '@/components/auth/PasswordFormExample';

function SecuritySettings() {
  return (
    <div className="space-y-8">
      <PasswordFormExample
        title="パスワード変更"
        customRequirements={PASSWORD_PRESETS.STRICT}
      />

      <TwoFactorSetup onClose={() => {}} />
    </div>
  );
}
```

## 🔍 テスト用パスワード例

```
弱いパスワード例:
- "password"     → 一般的すぎる
- "12345678"     → 数字のみ
- "abcdefgh"     → 小文字のみ

良いパスワード例:
- "MySecure123!" → 要件を満たす
- "Tokyo@2024#App" → 強力
- "書類管理2024!" → 日本語+特殊文字
```

この実装により、ユーザーフレンドリーで安全なパスワード設定機能が提供されます。