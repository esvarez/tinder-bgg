import type { Game } from '@tinder-bgg/shared';

import { env } from './env';

/** Returns the access token for the signed-in user, or `null` when signed out. */
export type TokenProvider = () => string | null | Promise<string | null>;

export class ApiError extends Error {
  override name = 'ApiError';

  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface ApiClientOptions {
  baseUrl: string;
  getToken?: TokenProvider;
  fetch?: typeof globalThis.fetch;
}

export function createApiClient({ baseUrl, getToken, fetch = globalThis.fetch }: ApiClientOptions) {
  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers = new Headers({ Accept: 'application/json' });
    const token = await getToken?.();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    if (body !== undefined) headers.set('Content-Type', 'application/json');

    const init: RequestInit = { method, headers };
    if (body !== undefined) init.body = JSON.stringify(body);
    const response = await fetch(`${baseUrl}${path}`, init);

    if (!response.ok) {
      throw new ApiError(response.status, await errorMessage(response));
    }
    return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
  }

  return {
    request,
    health: () => request<{ status: 'ok' }>('GET', '/health'),
    /** The signed-in user's collection. */
    listGames: () => request<Game[]>('GET', '/games'),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;

async function errorMessage(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { message?: unknown };
    if (typeof data.message === 'string') return data.message;
  } catch {
    // The body isn't JSON; fall back to the status text.
  }
  return response.statusText || `Request failed with status ${String(response.status)}`;
}

let tokenProvider: TokenProvider = () => null;

/** Sign-in (#37) registers how to get the current token; requests then carry it automatically. */
export function setTokenProvider(provider: TokenProvider): void {
  tokenProvider = provider;
}

export const api = createApiClient({
  baseUrl: env.apiUrl,
  getToken: () => tokenProvider(),
});
