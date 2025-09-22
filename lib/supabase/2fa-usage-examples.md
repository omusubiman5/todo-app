# Supabase 2FA 使用例とコード例

## 実装完了した機能

### 1. コンポーネント構成

```
components/auth/
├── QRCodeDisplay.tsx       # QRコード表示と初期設定
├── TwoFactorSetup.tsx      # 設定管理（有効化/無効化）
└── TwoFactorLogin.tsx      # ログイン時の認証
```

### 2. 使用例

#### 2FA設定画面の表示
```tsx
import { TwoFactorSetup } from '@/components/auth/TwoFactorSetup';

function SettingsPage() {
  const [showTwoFA, setShowTwoFA] = useState(false);

  return (
    <div>
      <button onClick={() => setShowTwoFA(true)}>
        二要素認証設定
      </button>

      {showTwoFA && (
        <TwoFactorSetup onClose={() => setShowTwoFA(false)} />
      )}
    </div>
  );
}
```

#### ログイン時の2FA認証
```tsx
import { TwoFactorLogin } from '@/components/auth/TwoFactorLogin';

function LoginFlow() {
  const [needsTwoFA, setNeedsTwoFA] = useState(false);

  const handleLogin = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error?.message?.includes('MFA')) {
      setNeedsTwoFA(true);
    }
  };

  if (needsTwoFA) {
    return (
      <TwoFactorLogin
        onSuccess={() => {
          setNeedsTwoFA(false);
          // ログイン完了処理
        }}
        onCancel={() => setNeedsTwoFA(false)}
      />
    );
  }

  return (
    // 通常のログインフォーム
    <LoginForm onSubmit={handleLogin} />
  );
}
```

### 3. hookの直接使用例

```tsx
import { use2FA } from '@/lib/hooks/use2FA';

function CustomTwoFAComponent() {
  const {
    loading,
    error,
    isEnabled,
    qrCodeDataURL,
    checkMFAStatus,
    enrollMFA,
    verifyEnrollment,
    disableMFA
  } = use2FA();

  useEffect(() => {
    checkMFAStatus();
  }, []);

  const enable2FA = async () => {
    // 1. 登録開始
    const enrollData = await enrollMFA();
    if (enrollData) {
      console.log('QRコード:', enrollData.qr_code);
      console.log('秘密鍵:', enrollData.secret);

      // 2. ユーザーがコード入力後、検証
      const code = '123456'; // ユーザー入力
      const success = await verifyEnrollment(code);

      if (success) {
        console.log('2FA有効化完了');
      }
    }
  };

  return (
    <div>
      <p>2FA状態: {isEnabled ? '有効' : '無効'}</p>
      {!isEnabled && (
        <button onClick={enable2FA}>2FA有効化</button>
      )}
    </div>
  );
}
```

### 4. ログイン認証フローの完全例

```tsx
import { use2FA } from '@/lib/hooks/use2FA';

function LoginWith2FA() {
  const { createChallenge, verifyChallenge } = use2FA();
  const [challengeId, setChallengeId] = useState<string | null>(null);

  const startAuth = async () => {
    // 1. チャレンジ作成
    const id = await createChallenge();
    setChallengeId(id);
  };

  const completeAuth = async (code: string) => {
    if (challengeId) {
      // 2. コード検証
      const success = await verifyChallenge(challengeId, code);
      if (success) {
        console.log('ログイン成功');
      }
    }
  };

  return (
    <div>
      {!challengeId ? (
        <button onClick={startAuth}>認証開始</button>
      ) : (
        <input
          placeholder="認証コード"
          onBlur={(e) => completeAuth(e.target.value)}
        />
      )}
    </div>
  );
}
```

## 使用における注意点

### セキュリティ
- QRコードは一度しか使用できません
- 認証コードは30秒で変更されます
- チャレンジIDには有効期限があります

### エラーハンドリング
```tsx
const { error, clearError } = use2FA();

// エラー表示
if (error) {
  return <div className="error">{error}</div>;
}

// エラークリア
const handleRetry = () => {
  clearError();
  // 再試行処理
};
```

### ローディング状態
```tsx
const { loading } = use2FA();

return (
  <button disabled={loading}>
    {loading ? '処理中...' : '実行'}
  </button>
);
```

## 統合例：設定ページ

```tsx
import { useState } from 'react';
import { TwoFactorSetup } from '@/components/auth/TwoFactorSetup';

export default function SecuritySettings() {
  const [showMFA, setShowMFA] = useState(false);

  return (
    <div className="space-y-6">
      <h1>セキュリティ設定</h1>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2>二要素認証</h2>
        <p>アカウントのセキュリティを強化します</p>
        <button
          onClick={() => setShowMFA(true)}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
        >
          設定管理
        </button>
      </div>

      {showMFA && (
        <TwoFactorSetup onClose={() => setShowMFA(false)} />
      )}
    </div>
  );
}
```