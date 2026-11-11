import { expect, it } from 'vitest';
import { parseTestDatabaseUrl } from './test-database-url.js';

it.each(['test', 'test_teletron', 'teletron_test', 'test-teletron', 'teletron-test'])(
  'accepts an explicit test database: %s',
  (name) => {
    expect(parseTestDatabaseUrl(`mysql://localhost/${name}`)).toBe(`mysql://localhost/${name}`);
  }
);

it.each([undefined, '', 'mysql://localhost/contest', 'mysql://localhost/latest_prod', 'https://localhost/test'])(
  'rejects missing, unrelated or non-MySQL database URLs',
  (value) => {
    expect(() => parseTestDatabaseUrl(value)).toThrow('An explicit test MySQL DATABASE_URL is required');
  }
);
