export interface PasswordRequirements {
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  forbiddenPatterns?: string[];
  forbiddenWords?: string[];
}

export interface PasswordStrengthResult {
  score: number; // 0-4 (0=最弱, 4=最強)
  level: 'very-weak' | 'weak' | 'fair' | 'good' | 'strong';
  feedback: string[];
  requirements: RequirementCheck[];
  isValid: boolean;
}

export interface RequirementCheck {
  rule: string;
  description: string;
  passed: boolean;
  priority: 'high' | 'medium' | 'low';
}

export const DEFAULT_PASSWORD_REQUIREMENTS: PasswordRequirements = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  forbiddenPatterns: [
    'password',
    '12345',
    'qwerty',
    'abc',
    '111',
    '000'
  ],
  forbiddenWords: [
    'password',
    'パスワード',
    'pass',
    'admin',
    'user',
    'login',
    'root'
  ]
};

export function checkPasswordStrength(
  password: string,
  requirements: PasswordRequirements = DEFAULT_PASSWORD_REQUIREMENTS
): PasswordStrengthResult {
  const checks = performRequirementChecks(password, requirements);
  const score = calculatePasswordScore(password, checks);
  const level = getStrengthLevel(score);
  const feedback = generateFeedback(password, checks, requirements);
  const isValid = checks.every(check => check.passed);

  return {
    score,
    level,
    feedback,
    requirements: checks,
    isValid
  };
}

function performRequirementChecks(
  password: string,
  requirements: PasswordRequirements
): RequirementCheck[] {
  const checks: RequirementCheck[] = [];

  // 文字数チェック
  checks.push({
    rule: 'length',
    description: `${requirements.minLength}文字以上${requirements.maxLength}文字以下`,
    passed: password.length >= requirements.minLength && password.length <= requirements.maxLength,
    priority: 'high'
  });

  // 大文字チェック
  if (requirements.requireUppercase) {
    checks.push({
      rule: 'uppercase',
      description: '大文字を含む（A-Z）',
      passed: /[A-Z]/.test(password),
      priority: 'medium'
    });
  }

  // 小文字チェック
  if (requirements.requireLowercase) {
    checks.push({
      rule: 'lowercase',
      description: '小文字を含む（a-z）',
      passed: /[a-z]/.test(password),
      priority: 'medium'
    });
  }

  // 数字チェック
  if (requirements.requireNumbers) {
    checks.push({
      rule: 'numbers',
      description: '数字を含む（0-9）',
      passed: /[0-9]/.test(password),
      priority: 'medium'
    });
  }

  // 特殊文字チェック
  if (requirements.requireSpecialChars) {
    checks.push({
      rule: 'special',
      description: '特殊文字を含む（!@#$%^&*等）',
      passed: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password),
      priority: 'medium'
    });
  }

  // 禁止パターンチェック
  if (requirements.forbiddenPatterns) {
    const hasForbiddenPattern = requirements.forbiddenPatterns.some(pattern =>
      password.toLowerCase().includes(pattern.toLowerCase())
    );
    checks.push({
      rule: 'forbidden-patterns',
      description: '一般的なパスワードパターンを避ける',
      passed: !hasForbiddenPattern,
      priority: 'high'
    });
  }

  // 禁止単語チェック
  if (requirements.forbiddenWords) {
    const hasForbiddenWord = requirements.forbiddenWords.some(word =>
      password.toLowerCase().includes(word.toLowerCase())
    );
    checks.push({
      rule: 'forbidden-words',
      description: '一般的な単語を避ける',
      passed: !hasForbiddenWord,
      priority: 'high'
    });
  }

  // 連続文字チェック
  checks.push({
    rule: 'no-sequences',
    description: '連続する同じ文字を3つ以上使わない',
    passed: !/(.)\1{2,}/.test(password),
    priority: 'low'
  });

  // キーボード配列チェック
  const keyboardPatterns = ['qwerty', 'asdf', '123456', 'zxcvbn'];
  const hasKeyboardPattern = keyboardPatterns.some(pattern =>
    password.toLowerCase().includes(pattern)
  );
  checks.push({
    rule: 'no-keyboard',
    description: 'キーボード配列パターンを避ける',
    passed: !hasKeyboardPattern,
    priority: 'low'
  });

  return checks;
}

function calculatePasswordScore(password: string, checks: RequirementCheck[]): number {
  let score = 0;

  // 基本要件のスコア計算
  const highPriorityPassed = checks.filter(c => c.priority === 'high' && c.passed).length;
  const mediumPriorityPassed = checks.filter(c => c.priority === 'medium' && c.passed).length;
  const lowPriorityPassed = checks.filter(c => c.priority === 'low' && c.passed).length;

  // 高優先度要件（必須）
  score += highPriorityPassed * 1;

  // 中優先度要件（文字種類）
  score += mediumPriorityPassed * 0.5;

  // 低優先度要件（追加セキュリティ）
  score += lowPriorityPassed * 0.2;

  // 長さボーナス
  if (password.length >= 12) score += 0.5;
  if (password.length >= 16) score += 0.5;

  // 文字種類の多様性ボーナス
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumbers = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password);
  const hasUnicode = /[^\x00-\x7F]/.test(password);

  const varietyCount = [hasUpper, hasLower, hasNumbers, hasSpecial, hasUnicode].filter(Boolean).length;
  score += varietyCount * 0.1;

  return Math.min(4, Math.max(0, score));
}

function getStrengthLevel(score: number): PasswordStrengthResult['level'] {
  if (score < 1) return 'very-weak';
  if (score < 2) return 'weak';
  if (score < 3) return 'fair';
  if (score < 3.5) return 'good';
  return 'strong';
}

function generateFeedback(
  password: string,
  checks: RequirementCheck[],
  requirements: PasswordRequirements
): string[] {
  const feedback: string[] = [];
  const failedChecks = checks.filter(check => !check.passed);

  if (failedChecks.length === 0) {
    feedback.push('✅ 強力なパスワードです！');
    return feedback;
  }

  // 優先度順にフィードバック生成
  const highPriorityFailed = failedChecks.filter(c => c.priority === 'high');
  const mediumPriorityFailed = failedChecks.filter(c => c.priority === 'medium');
  const lowPriorityFailed = failedChecks.filter(c => c.priority === 'low');

  if (highPriorityFailed.length > 0) {
    feedback.push('🚨 必須要件を満たしていません：');
    highPriorityFailed.forEach(check => {
      feedback.push(`• ${check.description}`);
    });
  }

  if (mediumPriorityFailed.length > 0) {
    feedback.push('⚠️ セキュリティを向上させるために：');
    mediumPriorityFailed.forEach(check => {
      feedback.push(`• ${check.description}`);
    });
  }

  if (lowPriorityFailed.length > 0 && highPriorityFailed.length === 0) {
    feedback.push('💡 さらに安全にするために：');
    lowPriorityFailed.forEach(check => {
      feedback.push(`• ${check.description}`);
    });
  }

  // 具体的な改善提案
  if (password.length < requirements.minLength) {
    const needed = requirements.minLength - password.length;
    feedback.push(`📏 あと${needed}文字追加してください`);
  }

  if (password.length < 12) {
    feedback.push('🔒 12文字以上にするとより安全です');
  }

  return feedback;
}

export function getPasswordStrengthColor(level: PasswordStrengthResult['level']): string {
  switch (level) {
    case 'very-weak': return 'text-red-600 bg-red-50 border-red-200';
    case 'weak': return 'text-orange-600 bg-orange-50 border-orange-200';
    case 'fair': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'good': return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'strong': return 'text-green-600 bg-green-50 border-green-200';
  }
}

export function getPasswordStrengthLabel(level: PasswordStrengthResult['level']): string {
  switch (level) {
    case 'very-weak': return '非常に弱い';
    case 'weak': return '弱い';
    case 'fair': return '普通';
    case 'good': return '良い';
    case 'strong': return '強い';
  }
}