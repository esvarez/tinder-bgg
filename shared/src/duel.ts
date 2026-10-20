import type { BggId, IsoDateString } from './common';

/** A 1v1 comparison between two games in a user's collection, kept so it can be undone. */
export interface Duel {
  /** ULID, so duels sort by creation time. */
  id: string;
  winnerId: BggId;
  loserId: BggId;
  winnerEloBefore: number;
  winnerEloAfter: number;
  loserEloBefore: number;
  loserEloAfter: number;
  createdAt: IsoDateString;
}
