# Data model

The app stores everything in a **single DynamoDB table**. It is multi-user: each user has their own collection, Elo ranking, duel history and notes, while game data from BoardGameGeek is stored once and shared by every user who owns the game.

## Table

| Setting                | Value                                                |
| ---------------------- | ---------------------------------------------------- |
| Partition key          | `PK` (string)                                        |
| Sort key               | `SK` (string)                                        |
| Billing                | On-demand                                            |
| Point-in-time recovery | Enabled                                              |
| TTL attribute          | `expiresAt` (epoch seconds; only used for imports)   |
| Secondary indexes      | None for now (see [Future indexes](#future-indexes)) |

Every item also has a `type` attribute naming its entity, so items are easy to tell apart in the console, in scans and in exports.

`userId` is the Cognito `sub` of the signed-in user. Handlers take it **only** from the verified JWT claims (#12), never from the path, query string or body.

## Items

| Entity      | `type`        | PK              | SK              | Attributes                                                                                                                                              |
| ----------- | ------------- | --------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BGG catalog | `CatalogGame` | `GAME#<bggId>`  | `META`          | `bggId`, `name`, `image`, `minPlayers`, `maxPlayers`, `minTime`, `maxTime`, `weight`, `categories`, `mechanics`, `bggRank`, `bggRating`, `bggFetchedAt` |
| Owned game  | `UserGame`    | `USER#<userId>` | `GAME#<bggId>`  | `bggId`, `elo`, `duelCount`, `notes`, `stars?`, `addedAt`                                                                                               |
| Duel        | `Duel`        | `USER#<userId>` | `DUEL#<ulid>`   | `id`, `winnerId`, `loserId`, `winnerEloBefore`, `winnerEloAfter`, `loserEloBefore`, `loserEloAfter`, `createdAt`                                        |
| Profile     | `UserProfile` | `USER#<userId>` | `PROFILE`       | `userId`, `displayName?`, `bggUsername?`, `createdAt`                                                                                                   |
| Import job  | `ImportJob`   | `USER#<userId>` | `IMPORT#<ulid>` | `status`, `bggUsername`, `total`, `imported`, `skipped`, `errors`, `createdAt`, `expiresAt` (#39)                                                       |

The attribute shapes match the types in `@tinder-bgg/shared`. Keys are built only through `backend/src/db/keys.ts`, which rejects a `userId` containing `#` and a `bggId` that isn't a positive integer, so a crafted value can't produce a key inside another user's partition or another entity's key range.

Duel and import ids are [ULIDs](https://github.com/ulid/spec), so sorting by `SK` sorts by creation time.

### Example items

```json
{ "PK": "GAME#13", "SK": "META", "type": "CatalogGame",
  "bggId": 13, "name": "CATAN", "image": "https://cf.geekdo-images.com/...",
  "minPlayers": 3, "maxPlayers": 4, "minTime": 60, "maxTime": 120, "weight": 2.29,
  "categories": ["Economic", "Negotiation"], "mechanics": ["Dice Rolling", "Trading"],
  "bggRank": 571, "bggRating": 7.1, "bggFetchedAt": "2026-10-19T16:00:00.000Z" }

{ "PK": "USER#3f1c...", "SK": "GAME#13", "type": "UserGame",
  "bggId": 13, "elo": 1532, "duelCount": 4, "notes": "Great with 4", "addedAt": "2026-10-19T16:01:00.000Z" }

{ "PK": "USER#3f1c...", "SK": "DUEL#01JAB3W5Q8X9V7M2N4P6R8T0YZ", "type": "Duel",
  "id": "01JAB3W5Q8X9V7M2N4P6R8T0YZ", "winnerId": 13, "loserId": 822,
  "winnerEloBefore": 1516, "winnerEloAfter": 1532, "loserEloBefore": 1500, "loserEloAfter": 1484,
  "createdAt": "2026-10-19T16:05:00.000Z" }
```

## Access patterns

| Pattern                                             | Operation                                                                                                                                                                                                                                           |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| List my games (`GET /games`)                        | `Query PK = USER#<userId> AND begins_with(SK, "GAME#")` (follow `LastEvaluatedKey`), then `BatchGetItem` the `GAME#<bggId>/META` items in chunks of 100 (retry `UnprocessedKeys`) and merge into `Game`.                                            |
| Get one of my games                                 | `GetItem USER#<userId>/GAME#<bggId>` + `GetItem GAME#<bggId>/META` (or one `BatchGetItem`).                                                                                                                                                         |
| Add a game to my collection (`POST /games`)         | `GetItem GAME#<bggId>/META`; if missing, fetch from BGG and `PutItem` with `attribute_not_exists(PK)` (a concurrent add by another user is harmless). Then `PutItem USER#<userId>/GAME#<bggId>` with `attribute_not_exists(PK)` (409 if it exists). |
| Edit notes (`PATCH /games/{bggId}`)                 | `UpdateItem USER#<userId>/GAME#<bggId>` with `attribute_exists(PK)`.                                                                                                                                                                                |
| Remove a game (`DELETE /games/{bggId}`)             | `DeleteItem USER#<userId>/GAME#<bggId>`. The shared catalog item stays.                                                                                                                                                                             |
| Submit a duel (`POST /duel`)                        | `TransactWriteItems`: `Update` both `USER#<userId>/GAME#<id>` items (set `elo`, `duelCount + 1`; condition `elo = :expected`) and `Put USER#<userId>/DUEL#<ulid>`.                                                                                  |
| Undo the last duel                                  | `Query PK = USER#<userId> AND begins_with(SK, "DUEL#")`, `ScanIndexForward = false`, `Limit = 1`; then `TransactWriteItems` restoring both games (condition `elo = :after`) and deleting the duel.                                                  |
| Duel history (stats, recent pairs)                  | Same query as undo with a larger `Limit`.                                                                                                                                                                                                           |
| Refresh a game from BGG                             | `UpdateItem GAME#<bggId>/META` (BGG fields and `bggFetchedAt` only). Every owner sees the new data; user items are untouched.                                                                                                                       |
| Stale catalog items for the scheduled refresh (#33) | `Scan` with `FilterExpression begins_with(PK, "GAME#")`, oldest `bggFetchedAt` first, in the Lambda.                                                                                                                                                |
| Profile                                             | `GetItem` / `PutItem USER#<userId>/PROFILE`.                                                                                                                                                                                                        |
| Import progress (#39)                               | `GetItem USER#<userId>/IMPORT#<ulid>`.                                                                                                                                                                                                              |

Every user-scoped operation has `USER#<userId>` as its partition key, built from the token's `sub`. There is no operation that reads or writes another user's partition, and the catalog items contain no personal data.

## Decisions

### Normalized catalog instead of copying BGG data into each user's item

The alternative is to copy the BGG fields into every `USER#…/GAME#…` item, so listing a collection is a single query. That makes every refresh fan out to every owner, which needs a GSI on `bggId` and many writes for popular games. Collections are small (hundreds of games at most), so the extra `BatchGetItem` on read is cheap. **Chosen: normalized.**

### Duel history when a game is removed

Duel records are kept. They are history and still make sense for stats; the catalog item they point to stays in the table, so names still resolve. If the last duel involves a removed game, undo's transaction condition fails and the API returns 409 with a message that the duel can't be undone.

### Optimistic concurrency on Elo

Duel and undo writes include a condition on each game's current `elo`. If the same user votes from two tabs at once, one transaction fails with `TransactionCanceledException` and the client fetches a new pair, instead of silently losing an update.

### Import jobs expire

Import job items set `expiresAt` 30 days after creation, and DynamoDB's TTL deletes them. Imported games themselves are ordinary `UserGame` items and never expire.

### Catalog items no one owns

They stay. They are small, and keeping them means the next user to add that game doesn't hit BGG. The scheduled refresh (#33) may skip or remove them later.

## Future indexes

None are needed at the expected scale. Add them when a pattern becomes too expensive; DynamoDB backfills new GSIs online.

- **Catalog by staleness:** a sparse GSI with `GSI1PK = "CATALOG"` and `GSI1SK = bggFetchedAt`, set only on catalog items, replaces the scan in the scheduled refresh once the catalog grows past a few thousand games.
- **Owners of a game:** only needed if BGG data is ever copied into user items. Not needed with the normalized design.

A single partition holds each user's collection and history. With no local secondary indexes there is no 10 GB item-collection limit, and per-user traffic is far below per-partition throughput limits.
