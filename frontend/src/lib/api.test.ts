import type { Game } from '@tinder-bgg/shared';
import { describe, expect, it, vi } from 'vitest';

import { ApiError, createApiClient } from './api';

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

function setup(response: Response, getToken?: () => string | null) {
  const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(response);
  const options = { baseUrl: 'https://api.example.com', fetch };
  const client = createApiClient(getToken ? { ...options, getToken } : options);
  return { client, fetch };
}

describe('api client', () => {
  it('requests the base URL plus path and parses the JSON body', async () => {
    const { client, fetch } = setup(jsonResponse({ status: 'ok' }));

    await expect(client.health()).resolves.toEqual({ status: 'ok' });
    expect(fetch).toHaveBeenCalledWith(
      'https://api.example.com/health',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('returns the games from GET /games', async () => {
    const games = [{ bggId: 13, name: 'CATAN' }] as Game[];
    const { client, fetch } = setup(jsonResponse(games));

    await expect(client.listGames()).resolves.toEqual(games);
    expect(fetch.mock.calls[0]?.[0]).toBe('https://api.example.com/games');
  });

  it('sends the access token as a bearer token', async () => {
    const { client, fetch } = setup(jsonResponse([]), () => 'abc123');

    await client.listGames();

    const headers = fetch.mock.calls[0]?.[1]?.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer abc123');
  });

  it('omits the Authorization header when signed out', async () => {
    const { client, fetch } = setup(jsonResponse([]), () => null);

    await client.listGames();

    const headers = fetch.mock.calls[0]?.[1]?.headers as Headers;
    expect(headers.has('Authorization')).toBe(false);
  });

  it('sends a JSON body with a content type', async () => {
    const { client, fetch } = setup(jsonResponse({ ok: true }));

    await client.request('POST', '/games', { bggId: 13 });

    const init = fetch.mock.calls[0]?.[1];
    expect(init?.body).toBe('{"bggId":13}');
    expect((init?.headers as Headers).get('Content-Type')).toBe('application/json');
  });

  it('throws an ApiError with the status and server message', async () => {
    const { client } = setup(
      jsonResponse({ message: 'Already in your collection' }, { status: 409 }),
    );

    const error = await client.request('POST', '/games', { bggId: 13 }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 409, message: 'Already in your collection' });
  });

  it('falls back to the status text when the error body is not JSON', async () => {
    const { client } = setup(
      new Response('Bad gateway', { status: 502, statusText: 'Bad Gateway' }),
    );

    await expect(client.listGames()).rejects.toMatchObject({ status: 502, message: 'Bad Gateway' });
  });

  it('resolves with undefined for 204 responses', async () => {
    const { client } = setup(new Response(null, { status: 204 }));

    await expect(client.request('DELETE', '/games/13')).resolves.toBeUndefined();
  });
});
