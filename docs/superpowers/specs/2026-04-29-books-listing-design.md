# Books Listing Design

## Goal

Extend `GET /books` so the API can return paginated results, support free-text search across multiple fields, allow explicit sorting, and start with a larger dataset suitable for manual testing.

## Scope

In scope:
- Update `GET /books` contract
- Add validated query parameters for pagination, search, and sorting
- Return paginated response metadata
- Expand initial seed data to roughly 25-30 books
- Add or update tests for the new listing behavior

Out of scope:
- New endpoints
- Field-specific filters beyond `search`
- Cursor pagination
- Any behavior changes to `POST`, `GET /books/:id`, `PATCH`, or `DELETE`

## API Contract

### Endpoint

- `GET /books`

### Query Parameters

- `page`: optional integer, default `1`, minimum `1`
- `limit`: optional integer, default `10`, minimum `1`, maximum `50`
- `search`: optional string, trimmed; when empty after trimming it is ignored
- `sortBy`: optional enum, default `createdAt`
- `sortOrder`: optional enum, default `desc`

Allowed `sortBy` values:
- `title`
- `author`
- `year`
- `genre`
- `price`
- `createdAt`

### Response Shape

`GET /books` will return a JSON envelope instead of a bare array.

```json
{
  "items": [],
  "total": 28,
  "page": 1,
  "limit": 10,
  "totalPages": 3,
  "hasNextPage": true,
  "hasPreviousPage": false
}
```

## Search Behavior

`search` will perform case-insensitive partial matching against these fields:
- `title`
- `author`
- `genre`
- `isbn`

Implementation behavior:
- Trim incoming `search`
- If the trimmed value is empty, do not add a filter
- Otherwise build a MongoDB `$or` query using case-insensitive regex matching over the allowed fields

## Sorting Behavior

Sorting will only be allowed on a fixed whitelist to prevent arbitrary field access and keep the contract explicit.

- `sortBy` selects the field
- `sortOrder` selects `asc` or `desc`
- Defaults: `sortBy=createdAt`, `sortOrder=desc`

## Internal Design

### Controller

- Replace the current parameterless `findAll()` controller method with a query-aware version
- Bind a dedicated query DTO using Nest validation and transformation
- Keep Swagger documentation aligned with the new query parameters and response shape

### DTOs

Add a query DTO for `GET /books` with:
- numeric coercion for `page` and `limit`
- enum validation for `sortBy` and `sortOrder`
- optional trimmed `search`

Add a paginated response DTO for Swagger clarity and a stable API contract.

### Service

Change `findAll()` to accept the validated query DTO and:
- build a safe MongoDB filter for `search`
- compute `skip` from `page` and `limit`
- build a whitelisted `sort` object
- execute `countDocuments` for the filtered total
- fetch the current page with `find`, `sort`, `skip`, and `limit`
- compute `totalPages`, `hasNextPage`, and `hasPreviousPage`

## Error Handling

- Invalid `page`, `limit`, `sortBy`, or `sortOrder` will return `400 Bad Request` via the global `ValidationPipe`
- Empty or whitespace-only `search` will be treated as absent, not as an error
- Existing error handling for other endpoints remains unchanged

## Seed Data

Increase the initial seed dataset from 3 books to roughly 25-30 books.

Dataset characteristics:
- varied authors
- varied genres
- varied publication years
- varied prices
- unique ISBN values

The seed should remain idempotent under the current bootstrap rule: seed only when the collection is empty.

## Testing

Add or update tests to cover:
- default paginated response behavior
- `search` filtering across the supported fields
- `sortBy` and `sortOrder` combinations
- pagination metadata calculations
- invalid query params returning `400`

The existing CRUD tests should remain unaffected except where the `GET /books` response contract changes.

## Notes

- This design intentionally uses page-based pagination because it is simple, predictable, and appropriate for the current scale.
- Field-specific filters can be added later without breaking the chosen response envelope.
