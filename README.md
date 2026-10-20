# tinder-bgg

Rank your board game collection with 1v1 duels. Game data (players, play time, weight, categories) comes from the [BoardGameGeek](https://boardgamegeek.com) XML API, and each user's ranking is built from their duel results using Elo ratings.

## Repository layout

This is an npm workspaces monorepo:

| Path        | Package                | Purpose                                                       |
| ----------- | ---------------------- | ------------------------------------------------------------- |
| `shared/`   | `@tinder-bgg/shared`   | Types and constants used by both the frontend and the backend |
| `backend/`  | `@tinder-bgg/backend`  | API Gateway + Lambda (TypeScript), deployed with AWS SAM      |
| `frontend/` | `@tinder-bgg/frontend` | React + Vite + Tailwind single-page app                       |

`backend/` and `frontend/` are placeholders until they are scaffolded (#9 and #11).

## Requirements

- Node.js 22 or later (see `.nvmrc`)
- npm 10 or later

## Getting started

```sh
npm install
npm run check
```

## Scripts

Run from the repository root:

| Script                 | What it does                               |
| ---------------------- | ------------------------------------------ |
| `npm run lint`         | Lint every package with ESLint             |
| `npm run lint:fix`     | Lint and apply automatic fixes             |
| `npm run format`       | Format every file with Prettier            |
| `npm run format:check` | Check formatting without writing           |
| `npm run typecheck`    | Type-check every workspace                 |
| `npm run check`        | Lint, check formatting and type-check (CI) |

## Shared types

Import shared types from `@tinder-bgg/shared` in any workspace:

```ts
import { DEFAULT_ELO } from '@tinder-bgg/shared';
import type { Game } from '@tinder-bgg/shared';
```

The data model is multi-user:

- `CatalogGame`: data pulled from BGG, stored once per game and shared by every user who owns it.
- `UserGame`: a user's personal data for a game (`elo`, `duelCount`, `notes`, optional `stars`).
- `Game`: `CatalogGame & UserGame`, the shape the API returns for a game in a user's collection.
- `Duel`: a 1v1 result with the ratings before and after, so the last duel can be undone.
- `UserProfile`: per-user settings such as the linked BGG username.

The package exports its TypeScript source directly (`"exports": "./src/index.ts"`), so there is no build step; Vite and esbuild compile it as part of the consuming app.

To add a dependency on it from a new workspace, add `"@tinder-bgg/shared": "*"` to that workspace's `dependencies` and run `npm install`.
