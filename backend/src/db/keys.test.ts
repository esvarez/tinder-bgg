import { describe, expect, it } from 'vitest';

import {
  bggIdFromUserGameSk,
  catalogGameKey,
  duelKey,
  importJobKey,
  InvalidKeyError,
  profileKey,
  userDuelsPrefix,
  userGameKey,
  userGamesPrefix,
} from './keys';

const ALICE = '3f1c2a7e-0000-4000-8000-000000000001';
const BOB = '9b8d4e2f-0000-4000-8000-000000000002';
const ULID = '01JAB3W5Q8X9V7M2N4P6R8T0YZ';

describe('key builders', () => {
  it('builds the documented keys', () => {
    expect(catalogGameKey(13)).toEqual({ PK: 'GAME#13', SK: 'META' });
    expect(userGameKey(ALICE, 13)).toEqual({ PK: `USER#${ALICE}`, SK: 'GAME#13' });
    expect(userGamesPrefix(ALICE)).toEqual({ PK: `USER#${ALICE}`, SKPrefix: 'GAME#' });
    expect(duelKey(ALICE, ULID)).toEqual({ PK: `USER#${ALICE}`, SK: `DUEL#${ULID}` });
    expect(userDuelsPrefix(ALICE)).toEqual({ PK: `USER#${ALICE}`, SKPrefix: 'DUEL#' });
    expect(profileKey(ALICE)).toEqual({ PK: `USER#${ALICE}`, SK: 'PROFILE' });
    expect(importJobKey(ALICE, ULID)).toEqual({ PK: `USER#${ALICE}`, SK: `IMPORT#${ULID}` });
  });

  it('shares the catalog item between users', () => {
    expect(catalogGameKey(13)).toEqual(catalogGameKey(13));
    expect(catalogGameKey(13).PK).not.toMatch(/^USER#/);
  });
});

describe('user isolation', () => {
  const userScoped = [
    (userId: string) => userGameKey(userId, 13).PK,
    (userId: string) => userGamesPrefix(userId).PK,
    (userId: string) => duelKey(userId, ULID).PK,
    (userId: string) => userDuelsPrefix(userId).PK,
    (userId: string) => profileKey(userId).PK,
    (userId: string) => importJobKey(userId, ULID).PK,
  ];

  it.each(userScoped.map((build, i) => [i, build] as const))(
    'puts user-scoped key #%i in the caller’s own partition',
    (_, build) => {
      expect(build(ALICE)).toBe(`USER#${ALICE}`);
      expect(build(BOB)).toBe(`USER#${BOB}`);
      expect(build(ALICE)).not.toBe(build(BOB));
    },
  );

  it.each([
    ['empty', ''],
    ['separator', `${ALICE}#GAME#13`],
    ['other user via separator', `${BOB}#`],
  ])('rejects a userId that is %s', (_, userId) => {
    expect(() => userGameKey(userId, 13)).toThrow(InvalidKeyError);
    expect(() => userGamesPrefix(userId)).toThrow(InvalidKeyError);
    expect(() => duelKey(userId, ULID)).toThrow(InvalidKeyError);
    expect(() => userDuelsPrefix(userId)).toThrow(InvalidKeyError);
    expect(() => profileKey(userId)).toThrow(InvalidKeyError);
    expect(() => importJobKey(userId, ULID)).toThrow(InvalidKeyError);
  });
});

describe('id validation', () => {
  it.each([0, -1, 1.5, Number.NaN, Number.MAX_SAFE_INTEGER + 1])('rejects bggId %s', (bggId) => {
    expect(() => catalogGameKey(bggId)).toThrow(InvalidKeyError);
    expect(() => userGameKey(ALICE, bggId)).toThrow(InvalidKeyError);
  });

  it.each(['', 'not-a-ulid', `${ULID}#X`, ULID.toLowerCase()])('rejects ULID %j', (id) => {
    expect(() => duelKey(ALICE, id)).toThrow(InvalidKeyError);
    expect(() => importJobKey(ALICE, id)).toThrow(InvalidKeyError);
  });
});

describe('bggIdFromUserGameSk', () => {
  it('reads the BGG id', () => {
    expect(bggIdFromUserGameSk(userGameKey(ALICE, 822).SK)).toBe(822);
  });

  it.each(['META', 'DUEL#13', 'GAME#', 'GAME#abc', 'GAME#-4'])('rejects %j', (sk) => {
    expect(() => bggIdFromUserGameSk(sk)).toThrow(InvalidKeyError);
  });
});
