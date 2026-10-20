import { describe, expect, it } from 'vitest';

import { handler } from './health';

describe('health handler', () => {
  it('returns 200 with a JSON body', () => {
    expect(handler()).toEqual({
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: '{"status":"ok"}',
    });
  });
});
