import type { CatalogGame, Duel, UserGame, UserProfile } from '@tinder-bgg/shared';

import type { Key } from './keys';

/** Shapes of the items stored in the table. See docs/data-model.md. */

export type CatalogGameItem = Key & CatalogGame & { type: 'CatalogGame' };

export type UserGameItem = Key & UserGame & { type: 'UserGame' };

export type DuelItem = Key & Duel & { type: 'Duel' };

export type UserProfileItem = Key & UserProfile & { type: 'UserProfile' };

export type Item = CatalogGameItem | UserGameItem | DuelItem | UserProfileItem;
