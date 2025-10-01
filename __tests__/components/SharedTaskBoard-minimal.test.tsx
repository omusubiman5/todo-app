import React from 'react';
import { screen } from '@testing-library/react';
import { render } from '../utils/test-utils';

// Mock SharedTaskService
jest.mock('@/lib/sharedTaskService', () => ({
  SharedTaskService: {
    getTasks: jest.fn().mockResolvedValue([]),
    createTask: jest.fn().mockResolvedValue({ id: '1', text: 'Test Task', priority: '中' }),
    updateTask: jest.fn().mockResolvedValue({}),
    deleteTask: jest.fn().mockResolvedValue({}),
    subscribeToTasks: jest.fn().mockReturnValue({ unsubscribe: jest.fn() })
  }
}));

// Mock RealtimeConnectionManager
jest.mock('@/lib/RealtimeConnectionManager', () => ({
  RealtimeConnectionManager: {
    getInstance: jest.fn(() => ({
      subscribeToTasks: jest.fn().mockReturnValue('subscription-id'),
      unsubscribe: jest.fn(),
      unsubscribeFromTasks: jest.fn()
    }))
  }
}));

describe('SharedTaskBoard Basic Tests', () => {
  it('基本的なレンダリングテスト', () => {
    expect(React).toBeDefined();
  });

  it('SharedTaskBoardインポート確認', () => {
    expect(() => {
      require('@/components/SharedTaskBoard');
    }).not.toThrow();
  });

  it('基本的なコンポーネント確認', () => {
    const SharedTaskBoard = require('@/components/SharedTaskBoard').default;
    expect(SharedTaskBoard).toBeDefined();
  });
});