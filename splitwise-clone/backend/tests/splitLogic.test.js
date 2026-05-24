const { calculateShares } = require('../utils/splitLogic');

describe('Expense Split Logic', () => {
  test('Calculates equal split correctly with precise rounding', () => {
    const result = calculateShares(100, ['user1', 'user2', 'user3'], 'equal');
    expect(result['user1']).toBe(33.33);
    expect(result['user2']).toBe(33.33);
    expect(result['user3']).toBe(33.34); // remainder goes to last user
  });

  test('Calculates exact split correctly', () => {
    const details = [
      { user: 'user1', amount: 50 },
      { user: 'user2', amount: 30 },
      { user: 'user3', amount: 20 },
    ];
    const result = calculateShares(100, ['user1', 'user2', 'user3'], 'exact', details);
    expect(result['user1']).toBe(50);
    expect(result['user2']).toBe(30);
    expect(result['user3']).toBe(20);
  });

  test('Calculates percentage split correctly', () => {
    const details = [
      { user: 'user1', percentage: 50 },
      { user: 'user2', percentage: 25 },
      { user: 'user3', percentage: 25 },
    ];
    const result = calculateShares(200, ['user1', 'user2', 'user3'], 'percentage', details);
    expect(result['user1']).toBe(100);
    expect(result['user2']).toBe(50);
    expect(result['user3']).toBe(50);
  });

  test('Calculates shares split correctly with remainder tracking', () => {
    const details = [
      { user: 'user1', shares: 2 },
      { user: 'user2', shares: 1 },
      { user: 'user3', shares: 1 },
    ];
    const result = calculateShares(100, ['user1', 'user2', 'user3'], 'shares', details);
    expect(result['user1']).toBe(50);
    expect(result['user2']).toBe(25);
    expect(result['user3']).toBe(25);
  });
});
