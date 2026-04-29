# API Rate Limit Design

## Goal

Add a basic global rate limit to the Books API to reduce abusive request bursts while keeping the configuration simple and environment-driven.

## Scope

In scope:

- Apply a global rate limit to all HTTP routes.
- Configure the limit through environment variables.
- Return `429 Too Many Requests` when the limit is exceeded.
- Add automated e2e coverage for the throttling behavior.
- Document the environment variables in `.env.example`.

Out of scope:

- Per-route limits.
- Separate stricter auth limits.
- Distributed rate limit storage for multi-instance deployments.
- Infrastructure-level rate limiting through a reverse proxy or gateway.

## Approach

Use `@nestjs/throttler`, the standard NestJS package for request throttling. Register `ThrottlerModule` in `AppModule` with `forRootAsync` so it can read values from the existing global `ConfigModule`.

Apply `ThrottlerGuard` globally through `APP_GUARD`. This keeps the implementation centralized and avoids decorating each controller manually.

## Configuration

Environment variables:

```env
RATE_LIMIT_TTL=60000
RATE_LIMIT_LIMIT=100
```

- `RATE_LIMIT_TTL`: Window duration in milliseconds.
- `RATE_LIMIT_LIMIT`: Maximum requests allowed per tracker within the window.

Defaults:

- `RATE_LIMIT_TTL`: `60000`
- `RATE_LIMIT_LIMIT`: `100`

## API Behavior

All Nest controller routes are subject to the same global limit, including public routes and protected book write routes.

Swagger UI and OpenAPI JSON are registered by `SwaggerModule` as middleware and are not covered by the global `ThrottlerGuard`.

When a client exceeds the configured limit, the API responds with `429 Too Many Requests` using the standard NestJS throttler response shape.

## Testing

Add an e2e test that starts the app with a very low limit, performs enough requests to exceed it, and asserts that a later request returns `429`.
