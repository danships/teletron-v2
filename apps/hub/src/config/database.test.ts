import { describe, expect, it } from 'vitest';
import { parseDatabaseUrl } from './database.js';

describe('database configuration', () => {
  it('normalizes accepted schemes for SuperSave', () => {
    expect(parseDatabaseUrl('MYSQL://localhost/teletron')).toBe('mysql://localhost/teletron');
  });

  it.each([undefined, '', 'invalid', 'https://localhost/teletron', 'mysql://localhost', 'mysql:///teletron'])(
    'rejects invalid configuration without exposing its value',
    (value) => {
      expect(() => parseDatabaseUrl(value)).toThrow('Invalid DATABASE_URL');
    }
  );
});
