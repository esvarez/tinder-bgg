import type { IsoDateString, UserId } from './common';

export interface UserProfile {
  userId: UserId;
  displayName?: string;
  /** BGG account used to import the user's collection. */
  bggUsername?: string;
  createdAt: IsoDateString;
}
