import { renderHook, act } from '@testing-library/react'
import '@testing-library/jest-dom'

// カスタムフックの例（実際のプロジェクトに合わせて調整してください）
function useCounter(initialValue: number = 0) {
  const [count, setCount] = React.useState(initialValue)

  const increment = React.useCallback(() => {
    setCount(prev => prev + 1)
  }, [])

  const decrement = React.useCallback(() => {
    setCount(prev => prev - 1)
  }, [])

  const reset = React.useCallback(() => {
    setCount(initialValue)
  }, [initialValue])

  return { count, increment, decrement, reset }
}

describe('useCounter hook', () => {
  // 初期値のテスト
  test('initializes with default value 0', () => {
    const { result } = renderHook(() => useCounter())
    
    expect(result.current.count).toBe(0)
  })

  test('initializes with custom initial value', () => {
    const { result } = renderHook(() => useCounter(10))
    
    expect(result.current.count).toBe(10)
  })

  // インクリメント機能のテスト
  test('increments count', () => {
    const { result } = renderHook(() => useCounter(5))
    
    act(() => {
      result.current.increment()
    })
    
    expect(result.current.count).toBe(6)
  })

  // デクリメント機能のテスト
  test('decrements count', () => {
    const { result } = renderHook(() => useCounter(5))
    
    act(() => {
      result.current.decrement()
    })
    
    expect(result.current.count).toBe(4)
  })

  // リセット機能のテスト
  test('resets to initial value', () => {
    const { result } = renderHook(() => useCounter(10))
    
    // 値を変更
    act(() => {
      result.current.increment()
      result.current.increment()
    })
    
    expect(result.current.count).toBe(12)
    
    // リセット
    act(() => {
      result.current.reset()
    })
    
    expect(result.current.count).toBe(10)
  })

  // 複数操作のテスト
  test('handles multiple operations correctly', () => {
    const { result } = renderHook(() => useCounter(0))
    
    act(() => {
      result.current.increment()  // 1
      result.current.increment()  // 2
      result.current.decrement()  // 1
      result.current.increment()  // 2
    })
    
    expect(result.current.count).toBe(2)
  })

  // 初期値変更時の再レンダリングテスト
  test('updates when initial value changes', () => {
    const { result, rerender } = renderHook(
      ({ initialValue }) => useCounter(initialValue),
      { initialProps: { initialValue: 5 } }
    )
    
    expect(result.current.count).toBe(5)
    
    // 初期値を変更して再レンダリング
    rerender({ initialValue: 10 })
    
    act(() => {
      result.current.reset()
    })
    
    expect(result.current.count).toBe(10)
  })
})

// React import for hooks
import * as React from 'react'