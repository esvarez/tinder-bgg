# tinder-bgg

Rank your board game collection with 1v1 duels. Game data (players, play time, weight, categories) comes from the [BoardGameGeek](https://boardgamegeek.com) XML API, and each user's ranking is built from their duel results using Elo ratings.

## Repository layout

This is an npm workspaces monorepo:

| Path        | Package                | Purpose                                                       |
| ----------- | ---------------------- | ------------------------------------------------------------- |
| `shared/`   | `@tinder-bgg/shared`   | Types and constants used by both the frontend and the backend |
| `backend/`  | `@tinder-bgg/backend`  | API Gateway + Lambda (TypeScript), deployed with AWS SAM      |
| `frontend/` | `@tinder-bgg/frontend` | React + Vite + Tailwind single-page app                       |

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

| Script                 | What it does                                |
| ---------------------- | ------------------------------------------- |
| `npm run lint`         | Lint every package with ESLint              |
| `npm run lint:fix`     | Lint and apply automatic fixes              |
| `npm run format`       | Format every file with Prettier             |
| `npm run format:check` | Check formatting without writing            |
| `npm run typecheck`    | Type-check every workspace                  |
| `npm test`             | Run unit tests in every workspace           |
| `npm run check`        | Lint, check formatting, type-check and test |

## Backend

The backend is an AWS SAM application in `backend/`: an HTTP API (API Gateway) in front of TypeScript Lambda functions, plus the single DynamoDB table described in [docs/data-model.md](docs/data-model.md).

### Prerequisites

- [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)
- AWS credentials for the account you deploy to (`aws configure`, or SSO)
- Docker, only for `sam local`

### Build and deploy

Run SAM through the npm scripts. They put `esbuild` from `node_modules` on the `PATH`, which SAM needs to bundle the functions.

```sh
npm run build -w @tinder-bgg/backend      # sam build
cd backend && sam deploy --guided         # first deploy; saves answers to samconfig.toml
cd backend && sam deploy                  # later deploys
```

`sam deploy` prints the `ApiUrl` and `TableName` outputs. Check the deployment with `curl "$ApiUrl/health"`; it returns `{"status":"ok"}`.

Template parameters (`parameter_overrides` in `backend/samconfig.toml`, or `--parameter-overrides`):

| Parameter               | Default                     | Purpose                                                       |
| ----------------------- | --------------------------- | ------------------------------------------------------------- |
| `Stage`                 | `dev`                       | Deployment stage                                              |
| `FrontendOrigin`        | `http://localhost:5173`     | The only origin allowed by CORS; set to the CloudFront domain |
| `BggTokenParameterName` | `/tinder-bgg/dev/bgg-token` | SSM SecureString parameter holding the BGG token (#10)        |

The DynamoDB table has `DeletionPolicy: Retain`, so deleting the stack does not delete user data.

### Run locally

```sh
npm run local -w @tinder-bgg/backend      # sam build && sam local start-api
curl http://127.0.0.1:3000/health
```

`sam local` runs the functions in Docker, but they talk to the real AWS account. Functions that use DynamoDB need the deployed table's name, so deploy a dev stack first and pass `TABLE_NAME` with `sam local start-api --env-vars env.json`.

### Adding a function

1. Add a handler in `backend/src/handlers/`, with a unit test next to it.
2. Add an `AWS::Serverless::Function` to `backend/template.yaml`, copying `HealthFunction` and changing `EntryPoints`, `Handler` and the event.
3. Give it only the access it needs, for example `DynamoDBReadPolicy` or `DynamoDBCrudPolicy` on `!Ref Table`. Do not use broad policies.

Functions set `CodeUri: src/` so that SAM skips `npm install` and esbuild bundles everything, including `@tinder-bgg/shared`, straight from the workspace.

## Frontend

The frontend in `frontend/` is a React 19 single-page app built with Vite, TypeScript and Tailwind CSS 4. It uses React Router for navigation and TanStack Query for fetching and caching API data.

```sh
cp frontend/.env.example frontend/.env.local   # then edit it
npm run dev                                    # http://localhost:5173
npm run build -w @tinder-bgg/frontend          # production build in frontend/dist
```

Configuration comes from `VITE_*` variables (Vite exposes nothing else to the browser). Put them in `frontend/.env.local`, which is git-ignored:

| Variable                    | Purpose                                                             |
| --------------------------- | ------------------------------------------------------------------- |
| `VITE_API_URL`              | Base URL of the API: the `ApiUrl` output of the SAM stack           |
| `VITE_COGNITO_USER_POOL_ID` | Cognito User Pool id, from the stack outputs (#38); used by sign-in |
| `VITE_COGNITO_CLIENT_ID`    | Cognito app client id (#38)                                         |
| `VITE_COGNITO_DOMAIN`       | Cognito hosted UI domain (#38)                                      |

Layout:

- `src/App.tsx` defines the routes: `/` (Collection), `/add`, `/duel`, `/ranking`, `/stats`, and `/login` without the navigation. The pages are placeholders; each one names the issue that builds it.
- `src/lib/api.ts` is the typed API client. It reads `VITE_API_URL` and sends `Authorization: Bearer <token>` once sign-in (#37) calls `setTokenProvider`. Failed requests throw an `ApiError` carrying the HTTP status. Add one method per endpoint as its feature is built, using the types from `@tinder-bgg/shared`.
- `src/lib/queryClient.ts` configures TanStack Query. It doesn't retry 4xx errors, which would only repeat the same failure.
- Tests use Vitest, jsdom and Testing Library (`npm test -w @tinder-bgg/frontend`).

## Continuous integration

`.github/workflows/ci.yml` runs on every pull request and on pushes to `main`:

- **Lint, format, typecheck and test:** `npm ci`, then the same scripts as `npm run check`, then a production build of the frontend. Workspaces opt into tests by adding a `test` script.
- **Validate SAM template:** runs `sam validate --lint` and `sam build` on `backend/template.yaml`.

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
