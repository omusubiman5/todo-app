import { 
  mapSupabaseError, 
  validateAuthInput, 
  AuthSecurityMonitor 
} from '../lib/authErrors';

describe('Auth Error Handling', () => {
  describe('mapSupabaseError', () => {
    it('should handle rate limit errors', () => {
      const error = { message: 'Rate limit exceeded' };
      const result = mapSupabaseError(error);
      
      expect(result.code).toBe('too_many_attempts');
      expect(result.severity).toBe('warning');
      expect(result.userMessage).toContain('ログイン試行回数が制限');
    });

    it('should handle invalid credentials', () => {
      const error = { message: 'Invalid login credentials' };
      const result = mapSupabaseError(error);
      
      expect(result.code).toBe('invalid_credentials');
      expect(result.severity).toBe('error');
      expect(result.userMessage).toContain('メールアドレスまたはパスワード');
    });

    it('should handle network errors', () => {
      const error = { message: 'Network connection failed' };
      const result = mapSupabaseError(error);
      
      expect(result.code).toBe('network_error');
      expect(result.severity).toBe('warning');
      expect(result.userMessage).toContain('ネットワークエラー');
    });

    it('should handle unknown errors safely', () => {
      const error = { message: 'Unknown database error' };
      const result = mapSupabaseError(error);
      
      expect(result.code).toBe('unknown_error');
      expect(result.severity).toBe('error');
      expect(result.userMessage).toContain('認証エラー');
    });

    it('should handle non-object errors safely', () => {
      const error = 'Simple string error';
      const result = mapSupabaseError(error);
      
      expect(result.code).toBe('unknown_error');
      expect(result.severity).toBe('error');
    });

    it('should handle null/undefined errors', () => {
      expect(() => mapSupabaseError(null)).not.toThrow();
      expect(() => mapSupabaseError(undefined)).not.toThrow();
    });
  });

  describe('Input Validation', () => {
    describe('Email validation', () => {
      it('should accept valid emails', () => {
        const validEmails = [
          'user@example.com',
          'user.name@domain.co.jp',
          'user+label@example.org'
        ];

        validEmails.forEach(email => {
          const result = validateAuthInput.email(email);
          expect(result.isValid).toBe(true);
        });
      });

      it('should reject invalid emails', () => {
        const invalidEmails = [
          '',
          'invalid-email',
          '@domain.com',
          'user@',
          'user@.com',
          'a'.repeat(255) + '@example.com'
        ];

        invalidEmails.forEach(email => {
          const result = validateAuthInput.email(email);
          expect(result.isValid).toBe(false);
          expect(result.error).toBeDefined();
        });
      });

      it('should reject malicious input', () => {
        const maliciousInputs = [
          '<script>alert("xss")</script>@example.com',
          'test@example.com<img src=x>',
          'test@${domain}.com',
          'user@DROP TABLE users;'
        ];

        maliciousInputs.forEach(input => {
          const result = validateAuthInput.email(input);
          expect(result.isValid).toBe(false);
          expect(result.error?.code).toBe('invalid_email');
        });
      });
    });

    describe('Password validation', () => {
      it('should accept valid passwords', () => {
        const validPasswords = [
          'password123',
          'SecureP@ssw0rd',
          'long-password-with-special-chars!'
        ];

        validPasswords.forEach(password => {
          const result = validateAuthInput.password(password);
          expect(result.isValid).toBe(true);
        });
      });

      it('should reject short passwords', () => {
        const result = validateAuthInput.password('short');
        expect(result.isValid).toBe(false);
        expect(result.error?.code).toBe('weak_password');
        expect(result.error?.userMessage).toContain('8文字以上');
      });

      it('should reject overly long passwords', () => {
        const longPassword = 'a'.repeat(129);
        const result = validateAuthInput.password(longPassword);
        expect(result.isValid).toBe(false);
        expect(result.error?.code).toBe('weak_password');
        expect(result.error?.userMessage).toContain('長すぎます');
      });

      it('should reject malicious patterns', () => {
        const maliciousPasswords = [
          '<script>alert("xss")</script>',
          'DROP TABLE users;',
          '${malicious.code}',
          'eval(dangerous.code)'
        ];

        maliciousPasswords.forEach(password => {
          const result = validateAuthInput.password(password);
          expect(result.isValid).toBe(false);
          expect(result.error?.code).toBe('weak_password');
        });
      });
    });
  });

  describe('AuthSecurityMonitor', () => {
    let monitor: AuthSecurityMonitor;

    beforeEach(() => {
      monitor = AuthSecurityMonitor.getInstance();
    });

    it('should allow initial attempts', () => {
      const result = monitor.checkRateLimit('test@example.com');
      expect(result.allowed).toBe(true);
    });

    it('should track failed attempts', () => {
      const email = 'test@example.com';
      
      // Record multiple failed attempts
      for (let i = 0; i < 4; i++) {
        monitor.recordFailedAttempt(email);
        const result = monitor.checkRateLimit(email);
        expect(result.allowed).toBe(true);
      }

      // 5th attempt should be blocked
      monitor.recordFailedAttempt(email);
      const result = monitor.checkRateLimit(email);
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('should reset on successful login', () => {
      const email = 'test@example.com';
      
      // Record failed attempts
      for (let i = 0; i < 4; i++) {
        monitor.recordFailedAttempt(email);
      }

      // Successful login should reset
      monitor.recordSuccessfulAttempt(email);
      const result = monitor.checkRateLimit(email);
      expect(result.allowed).toBe(true);
    });

    it('should handle different emails independently', () => {
      const email1 = 'user1@example.com';
      const email2 = 'user2@example.com';

      // Block email1
      for (let i = 0; i < 5; i++) {
        monitor.recordFailedAttempt(email1);
      }

      expect(monitor.checkRateLimit(email1).allowed).toBe(false);
      expect(monitor.checkRateLimit(email2).allowed).toBe(true);
    });
  });
});