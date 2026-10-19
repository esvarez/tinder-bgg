import type { BggId, IsoDateString } from './common';

/** Every game starts at this Elo rating until it has been dueled. */
export const DEFAULT_ELO = 1500;

/** Optional 1–5 star rating used to seed a game's starting Elo. */
export type StarRating = 1 | 2 | 3 | 4 | 5;

/**
 * Game data pulled from BoardGameGeek. Stored once per game and shared by every
 * user who owns it, so BGG is only called when a game is first added or refreshed.
 */
export interface CatalogGame {
  bggId: BggId;
  name: string;
  /** Image URL; `null` when BGG has no image for the game. */
  image: string | null;
  minPlayers: number;
  maxPlayers: number;
  /** Play time in minutes. */
  minTime: number;
  /** Play time in minutes. */
  maxTime: number;
  /** BGG average weight (complexity) from 1 to 5; `0` when nobody has voted. */
  weight: number;
  categories: string[];
  mechanics: string[];
  /** Overall board game rank; `null` when BGG lists the game as "Not Ranked". */
  bggRank: number | null;
  /** BGG average rating from 1 to 10; `null` when there are no ratings. */
  bggRating: number | null;
  /** When the data was last fetched from BGG. */
  bggFetchedAt: IsoDateString;
}

/** A user's personal data for a game in their collection. */
export interface UserGame {
  bggId: BggId;
  elo: number;
  duelCount: number;
  notes: string;
  stars?: StarRating;
  addedAt: IsoDateString;
}

/** A game in a user's collection, as returned by the API: shared BGG data plus personal fields. */
export type Game = CatalogGame & UserGame;
