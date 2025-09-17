describe('Simple Tests', () => {
  describe('Basic JavaScript functionality', () => {
    it('should perform basic arithmetic', () => {
      expect(2 + 2).toBe(4);
      expect(5 - 3).toBe(2);
      expect(3 * 4).toBe(12);
      expect(10 / 2).toBe(5);
    });

    it('should handle string operations', () => {
      const str1 = 'Hello';
      const str2 = 'World';
      expect(str1 + ' ' + str2).toBe('Hello World');
      expect(str1.length).toBe(5);
    });

    it('should handle arrays', () => {
      const arr = [1, 2, 3];
      expect(arr.length).toBe(3);
      expect(arr[0]).toBe(1);
      expect(arr.includes(2)).toBe(true);
    });

    it('should handle objects', () => {
      const obj = { name: 'Test', value: 42 };
      expect(obj.name).toBe('Test');
      expect(obj.value).toBe(42);
      expect(typeof obj).toBe('object');
    });

    it('should handle async operations', async () => {
      const promise = Promise.resolve('success');
      const result = await promise;
      expect(result).toBe('success');
    });
  });

  describe('Type checking', () => {
    it('should identify types correctly', () => {
      expect(typeof 'string').toBe('string');
      expect(typeof 123).toBe('number');
      expect(typeof true).toBe('boolean');
      expect(typeof undefined).toBe('undefined');
      expect(typeof null).toBe('object'); // JavaScript quirk
      expect(Array.isArray([])).toBe(true);
    });

    it('should handle null and undefined', () => {
      const nullValue = null;
      const undefinedValue = undefined;
      
      expect(nullValue).toBeNull();
      expect(undefinedValue).toBeUndefined();
      expect(nullValue == undefinedValue).toBe(true);
      expect(nullValue === undefinedValue).toBe(false);
    });
  });

  describe('Error handling', () => {
    it('should handle errors properly', () => {
      const throwError = () => {
        throw new Error('Test error');
      };

      expect(throwError).toThrow('Test error');
      expect(throwError).toThrow(Error);
    });

    it('should handle async errors', async () => {
      const asyncError = async () => {
        throw new Error('Async error');
      };

      await expect(asyncError()).rejects.toThrow('Async error');
    });
  });

  describe('Date and Time', () => {
    it('should handle dates', () => {
      const now = new Date();
      expect(now instanceof Date).toBe(true);
      expect(typeof now.getTime()).toBe('number');
    });

    it('should format dates consistently', () => {
      const date = new Date('2024-01-01T00:00:00.000Z');
      expect(date.getFullYear()).toBe(2024);
      expect(date.getMonth()).toBe(0); // January is 0
      expect(date.getDate()).toBe(1);
    });
  });

  describe('JSON operations', () => {
    it('should serialize and deserialize JSON', () => {
      const obj = { name: 'Test', items: [1, 2, 3] };
      const json = JSON.stringify(obj);
      const parsed = JSON.parse(json);
      
      expect(parsed.name).toBe('Test');
      expect(Array.isArray(parsed.items)).toBe(true);
      expect(parsed.items.length).toBe(3);
    });

    it('should handle JSON errors gracefully', () => {
      const invalidJson = '{ invalid json }';
      expect(() => JSON.parse(invalidJson)).toThrow();
    });
  });
});