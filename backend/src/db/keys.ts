import type { BggId, UserId } from '@tinder-bgg/shared';

/**
 * Builders for every DynamoDB key in the table. Handlers must build keys only
 * through these functions so user-scoped items always live in the caller's
 * partition. See docs/data-model.md.
 */

export interface Key {
  PK: string;
  SK: string;
}

/** Partition key plus sort-key prefix, for `begins_with` queries. */
export interface KeyPrefix {
  PK: string;
  SKPrefix: string;
}

const GAME = 'GAME#';
const USER = 'USER#';
const DUEL = 'DUEL#';
const IMPORT = 'IMPORT#';
const META = 'META';
const PROFILE = 'PROFILE';

/** Crockford base32 ULID, as used for duel and import ids. */
const ULID_PATTERN = /^[0-9A-HJKMNP-TV-Z]{26}$/;

export class InvalidKeyError extends Error {
  override name = 'InvalidKeyError';
}

function userPk(userId: UserId): string {
  // `#` is the key separator: allowing it would let a crafted id reach into
  // another user's partition or another entity's key range.
  if (userId.length === 0 || userId.includes('#')) {
    throw new InvalidKeyError(`Invalid userId: ${JSON.stringify(userId)}`);
  }
  return `${USER}${userId}`;
}

function bggIdPart(bggId: BggId): string {
  if (!Number.isSafeInteger(bggId) || bggId <= 0) {
    throw new InvalidKeyError(`Invalid bggId: ${String(bggId)}`);
  }
  return String(bggId);
}

function ulidPart(id: string, kind: string): string {
  if (!ULID_PATTERN.test(id)) {
    throw new InvalidKeyError(`Invalid ${kind} id: ${JSON.stringify(id)}`);
  }
  return id;
}

/** Shared BGG data for a game. */
export function catalogGameKey(bggId: BggId): Key {
  return { PK: `${GAME}${bggIdPart(bggId)}`, SK: META };
}

/** A game in a user's collection. */
export function userGameKey(userId: UserId, bggId: BggId): Key {
  return { PK: userPk(userId), SK: `${GAME}${bggIdPart(bggId)}` };
}

/** All games in a user's collection. */
export function userGamesPrefix(userId: UserId): KeyPrefix {
  return { PK: userPk(userId), SKPrefix: GAME };
}

export function duelKey(userId: UserId, duelId: string): Key {
  return { PK: userPk(userId), SK: `${DUEL}${ulidPart(duelId, 'duel')}` };
}

/** A user's duels; query in descending order for the most recent first. */
export function userDuelsPrefix(userId: UserId): KeyPrefix {
  return { PK: userPk(userId), SKPrefix: DUEL };
}

export function profileKey(userId: UserId): Key {
  return { PK: userPk(userId), SK: PROFILE };
}

export function importJobKey(userId: UserId, importId: string): Key {
  return { PK: userPk(userId), SK: `${IMPORT}${ulidPart(importId, 'import')}` };
}

/** Reads the BGG id back from a `UserGame` sort key such as `GAME#13`. */
export function bggIdFromUserGameSk(sk: string): BggId {
  const bggId = sk.startsWith(GAME) ? Number(sk.slice(GAME.length)) : NaN;
  if (!Number.isSafeInteger(bggId) || bggId <= 0) {
    throw new InvalidKeyError(`Not a user game sort key: ${JSON.stringify(sk)}`);
  }
  return bggId;
}
