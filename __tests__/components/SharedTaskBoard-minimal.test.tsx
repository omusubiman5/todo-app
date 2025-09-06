// 🔬 【最小限版】SharedTaskBoard テスト - 問題特定用

import React from 'react'

// 段階的にインポートして問題を特定
// import SharedTaskBoard from '@/components/SharedTaskBoard'

describe('SharedTaskBoard Minimal Debug Test', () => {
  test('基本的なテスト実行確認', () => {
    expect(1 + 1).toBe(2)
  })
  
  test('Reactのインポートテスト', () => {
    expect(React).toBeDefined()
  })
  
  test('SharedTaskBoardインポート確認', () => {
    // インポートを動的に行い、エラーを特定
    expect(() => {
      require('@/components/SharedTaskBoard')
    }).not.toThrow()
  })
})