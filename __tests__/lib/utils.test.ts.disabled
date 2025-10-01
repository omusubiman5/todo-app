import '@testing-library/jest-dom'

// ユーティリティ関数の例
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date)
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

describe('Utility Functions', () => {
  describe('formatDate', () => {
    test('formats date correctly in Japanese format', () => {
      const date = new Date('2024-01-15')
      const formatted = formatDate(date)
      
      expect(formatted).toBe('2024/01/15')
    })

    test('handles different dates', () => {
      const date1 = new Date('2023-12-31')
      const date2 = new Date('2024-02-29') // うるう年
      
      expect(formatDate(date1)).toBe('2023/12/31')
      expect(formatDate(date2)).toBe('2024/02/29')
    })
  })

  describe('isValidEmail', () => {
    test('returns true for valid emails', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.jp',
        'test+label@gmail.com',
        'a@b.c'
      ]
      
      validEmails.forEach(email => {
        expect(isValidEmail(email)).toBe(true)
      })
    })

    test('returns false for invalid emails', () => {
      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user@domain',
        'user..name@domain.com',
        ''
      ]
      
      invalidEmails.forEach(email => {
        expect(isValidEmail(email)).toBe(false)
      })
    })
  })

  describe('debounce', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.runOnlyPendingTimers()
      jest.useRealTimers()
    })

    test('delays function execution', () => {
      const mockFn = jest.fn()
      const debouncedFn = debounce(mockFn, 1000)
      
      debouncedFn('test')
      
      // すぐには実行されない
      expect(mockFn).not.toHaveBeenCalled()
      
      // 1000ms後に実行される
      jest.advanceTimersByTime(1000)
      expect(mockFn).toHaveBeenCalledWith('test')
    })

    test('cancels previous call when called multiple times', () => {
      const mockFn = jest.fn()
      const debouncedFn = debounce(mockFn, 1000)
      
      debouncedFn('first')
      debouncedFn('second')
      debouncedFn('third')
      
      jest.advanceTimersByTime(1000)
      
      // 最後の呼び出しのみ実行される
      expect(mockFn).toHaveBeenCalledTimes(1)
      expect(mockFn).toHaveBeenCalledWith('third')
    })
  })

  describe('clamp', () => {
    test('returns value when within range', () => {
      expect(clamp(5, 0, 10)).toBe(5)
      expect(clamp(0, 0, 10)).toBe(0)
      expect(clamp(10, 0, 10)).toBe(10)
    })

    test('returns min when value is below range', () => {
      expect(clamp(-5, 0, 10)).toBe(0)
      expect(clamp(-100, 0, 10)).toBe(0)
    })

    test('returns max when value is above range', () => {
      expect(clamp(15, 0, 10)).toBe(10)
      expect(clamp(100, 0, 10)).toBe(10)
    })

    test('handles negative ranges', () => {
      expect(clamp(-5, -10, -1)).toBe(-5)
      expect(clamp(-15, -10, -1)).toBe(-10)
      expect(clamp(5, -10, -1)).toBe(-1)
    })
  })
})