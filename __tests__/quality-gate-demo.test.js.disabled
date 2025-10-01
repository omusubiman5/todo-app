// 品質ゲート動作確認用テスト
describe('品質ゲート動作テスト', () => {
  test('正常なテスト1', () => {
    expect(2 + 2).toBe(4);
  });

  test('正常なテスト2', () => {
    expect('hello').toBe('hello');
  });

  test('正常なテスト3', () => {
    expect(true).toBe(true);
  });

  test('正常なテスト4', () => {
    const array = [1, 2, 3];
    expect(array.length).toBe(3);
  });

  // わざと失敗させるテスト - 品質ゲートテスト用
  test('失敗テスト1 - 品質ゲートブロック確認用', () => {
    // わざと間違った期待値を設定
    expect(2 + 2).toBe(5); // 実際は4だが、5を期待して失敗
  });

  test('失敗テスト2 - 品質ゲートブロック確認用', () => {
    // わざと間違った期待値を設定  
    expect('hello').toBe('world'); // helloだがworldを期待して失敗
  });
});