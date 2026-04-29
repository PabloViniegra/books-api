# Redis Cache Design

## Goal

Add Redis-backed read caching to the API so public book reads become faster, while keeping MongoDB as the source of truth and preserving the current HTTP contract.

## Scope

In scope:
- Add Redis to `docker-compose.yml`
- Add Redis connection and cache TTL configuration through environment variables
- Cache `GET /books`
- Cache `GET /books/:id`
- Invalidate book cache entries on `POST /books`, `PATCH /books/:id`, and `DELETE /books/:id`
- Keep cache failures non-fatal for request handling
- Update tests and `README.md`

Out of scope:
- Caching auth endpoints
- Caching future modules beyond `books`
- Running the API itself inside Docker Compose
- Selective invalidation of paginated list variants
- Distributed locking, stampede protection, or advanced cache warming

## API Behavior

No endpoint contract changes are required.

The following endpoints will become cache-backed internally:
- `GET /books`
- `GET /books/:id`

Response payloads, status codes, validation behavior, and authorization rules remain unchanged.

## Cache Policy

### TTL

- Default TTL: `60` seconds
- Configured through `CACHE_TTL_SECONDS`

### Cached Resources

- `GET /books` caches the full paginated response for a validated query
- `GET /books/:id` caches the serialized book document for a validated id

### Cache Keys

- `books:item:<id>` for book detail responses
- `books:list:<fingerprint>` for paginated list responses
- `books:list:keys` for tracking active list cache keys that must be invalidated on writes

The `fingerprint` must be derived from a stable serialization of the validated query object:
- `page`
- `limit`
- `search`
- `sortBy`
- `sortOrder`

This ensures logically identical requests map to the same Redis key.

## Internal Design

### Application Configuration

`AppModule` will register the Redis cache infrastructure globally using environment-based configuration.

New configuration values:
- `REDIS_URL`
- `CACHE_TTL_SECONDS`

Recommended defaults for local development:
- `REDIS_URL=redis://localhost:6379`
- `CACHE_TTL_SECONDS=60`

For this iteration, Redis is treated as a required infrastructure dependency for local development and normal application startup.

### Service Design

`BooksService` will own all cache interaction for the `books` domain.

Read flow for `findAll(query)`:
1. Build the validated query fingerprint
2. Try Redis with `books:list:<fingerprint>`
3. If a cached value exists, deserialize and return it
4. If not, query MongoDB as today
5. Store the response in Redis with TTL
6. Add the list key to `books:list:keys`
7. Return the fresh response

Read flow for `findOne(id)`:
1. Validate the id as today
2. Try Redis with `books:item:<id>`
3. If a cached value exists, deserialize and return it
4. If not, query MongoDB as today
5. If the book exists, store it in Redis with TTL
6. Return the book or the existing `404`

Write flow:
- `create(createBookDto)` writes to MongoDB, then invalidates all cached lists
- `update(id, updateBookDto)` writes to MongoDB, then invalidates `books:item:<id>` and all cached lists
- `remove(id)` writes to MongoDB, then invalidates `books:item:<id>` and all cached lists

### Invalidating List Cache

On any successful write, the service will:
1. Read the members of `books:list:keys`
2. Delete each registered list key
3. Delete or clear `books:list:keys`

This intentionally favors correctness and simplicity over selective invalidation. Since the only cached collection today is `books` and the TTL is short, the cost is acceptable.

## Failure Semantics

Redis is an optimization layer, not the source of truth.

Behavior on Redis failures:
- failed cache reads fall back to MongoDB
- failed cache writes do not fail the HTTP request
- failed invalidations do not roll back MongoDB writes

This means MongoDB operations continue to define success, while Redis issues may temporarily reduce cache freshness or cache hit ratio.

## Docker Compose

`docker-compose.yml` will include a new `redis` service alongside `mongo`.

Planned characteristics:
- image: `redis:7-alpine` or equivalent lightweight official image
- exposed port: `6379:6379`
- named volume for persistence: `redis_data`
- healthcheck using `redis-cli ping`

The Compose file will continue to provision only infrastructure services for local development.

## Environment and Documentation

The following files must be updated:
- `.env.example`
- `README.md`
- `docker-compose.yml`

`README.md` should document:
- Redis as part of the local stack
- new environment variables
- local startup expectations
- that public book reads are cached for 60 seconds by default and invalidated on writes

## Testing

### Unit Tests

Update `BooksService` tests to cover:
- returning cached `findAll` responses without querying MongoDB
- returning cached `findOne` responses without querying MongoDB
- cache miss behavior for `findAll` and `findOne`
- writing fresh responses into Redis after a miss
- invalidation after `create`, `update`, and `remove`
- Redis read or write failures not breaking successful MongoDB-backed responses

### Integration and E2E Validation

Keep existing HTTP behavior verification through the current test suite.

Validation commands:
- `pnpm test`
- `pnpm test:e2e`

Manual local validation should also confirm that:
- `docker compose up -d` starts both MongoDB and Redis
- `GET /books` remains functionally identical
- `GET /books/:id` remains functionally identical
- writes still invalidate subsequent reads

## Notes

- This design keeps cache logic in `BooksService` to avoid spreading key and invalidation rules across controllers or generic interceptors.
- Full list invalidation on writes is intentional for this first version because it is harder to get wrong than query-aware invalidation.
- Future modules can reuse the same pattern if Redis proves useful in production-like workloads.
