

### 📧 メールテンプレート設定（重要！）

Authentication → Email Templates → Reset Password で以下に変更：

```html
<h2>パスワードをリセット</h2>
<p>以下のリンクをクリックしてパスワードをリセットしてください：</p>
<p><a href="{{ .SiteURL }}/auth/callback?access_token={{ .TokenHash }}&type=recovery">パスワードをリセット</a></p>
<p>このリンクは1時間で期限切れになります。</p>
```

これで、メールのリンクが以下の流れで動作します：
1. ユーザーがリンクをクリック
2. /auth/callback で認証処理
3. 成功時に /reset-password へリダイレクト
4. パスワード変更フォームが表示
