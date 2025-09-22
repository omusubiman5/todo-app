import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
// セキュリティプラグインのインポート
import security from "eslint-plugin-security";
import noSecrets from "eslint-plugin-no-secrets";
import sdl from "@microsoft/eslint-plugin-sdl";
import sonarjs from "eslint-plugin-sonarjs";
import jsxA11y from "eslint-plugin-jsx-a11y";
import noUnsanitized from "eslint-plugin-no-unsanitized";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // セキュリティプラグインの設定
    plugins: {
      security,
      "no-secrets": noSecrets,
      "@microsoft/sdl": sdl,
      sonarjs,
      "jsx-a11y": jsxA11y,
      "no-unsanitized": noUnsanitized,
    },
    rules: {
      // 🔒 セキュリティ関連ルール（Core Security）
      "security/detect-object-injection": "error",
      "security/detect-non-literal-fs-filename": "error",
      "security/detect-non-literal-regexp": "error",
      "security/detect-non-literal-require": "error",
      "security/detect-possible-timing-attacks": "warn",
      "security/detect-pseudoRandomBytes": "error",
      "security/detect-unsafe-regex": "error",
      "security/detect-buffer-noassert": "error",
      "security/detect-child-process": "warn",
      "security/detect-disable-mustache-escape": "error",
      "security/detect-eval-with-expression": "error",
      "security/detect-no-csrf-before-method-override": "error",
      "security/detect-new-buffer": "error",

      // 🔐 秘密情報の検出（Secrets Detection）
      "no-secrets/no-secrets": ["error", {
        "tolerance": 4.2,
        "additionalRegexes": {
          "Supabase URL": "https://[a-z0-9-]+\\.supabase\\.co",
          "Supabase Key": "eyJ[A-Za-z0-9_/+-]*={0,2}\\.[A-Za-z0-9_/+-]*={0,2}\\.[A-Za-z0-9_/+-]*={0,2}",
          "API Key": "(api[_-]?key|apikey)\\s*[:=]\\s*['\"]?[a-zA-Z0-9]{20,}['\"]?",
          "JWT Token": "ey[A-Za-z0-9_/+-]*\\.[A-Za-z0-9_/+-]*\\.[A-Za-z0-9_/+-]*"
        }
      }],

      // 🛡️ Microsoft SDL セキュリティルール
      "@microsoft/sdl/no-angular-sanitization-trusted-urls": "error",
      "@microsoft/sdl/no-angular-bypass-sanitizer": "error",
      "@microsoft/sdl/no-document-domain": "error",
      "@microsoft/sdl/no-document-write": "error",
      "@microsoft/sdl/no-html-method": "error",
      "@microsoft/sdl/no-inner-html": "warn",
      "@microsoft/sdl/no-insecure-url": "error",
      "@microsoft/sdl/no-msapp-exec-unsafe": "error",
      "@microsoft/sdl/no-postmessage-star-origin": "error",
      "@microsoft/sdl/no-winjs-html-unsafe": "error",

      // 🧹 XSS防止（DOM操作の安全性）
      "no-unsanitized/method": "error",
      "no-unsanitized/property": "error",

      // 🔍 重要なコード品質とセキュリティ（SonarJS - 厳選）
      "sonarjs/no-identical-functions": "error",
      "sonarjs/cognitive-complexity": ["warn", 20],
      "sonarjs/no-duplicate-string": "off", // パフォーマンス考慮で無効

      // ♿ 重要なアクセシビリティセキュリティ
      "jsx-a11y/no-autofocus": "error",
      "jsx-a11y/anchor-is-valid": "error",

      // 🚨 追加のセキュリティチェック
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "no-script-url": "error",

      // 🎯 既存ルールの調整（警告レベルに変更）
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "@next/next/no-html-link-for-pages": "warn",
      "react-hooks/exhaustive-deps": "warn",
      "jsx-a11y/role-supports-aria-props": "warn",
      "import/no-anonymous-default-export": "warn",
      "@typescript-eslint/no-unnecessary-type-constraint": "warn"
    }
  }
];

export default eslintConfig;
