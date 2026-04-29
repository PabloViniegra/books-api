# Google Auth Design

## Goal

Add Google-based authorization to the Books API so write operations require an authenticated user while read operations remain public.

## Scope

In scope:

- Add an auth feature module.
- Add `POST /auth/google` to exchange a Google ID token for an API-issued JWT.
- Validate Google ID tokens against `GOOGLE_CLIENT_ID`.
- Reject Google accounts whose email is not verified.
- Protect `POST /books`, `PATCH /books/:id`, and `DELETE /books/:id`.
- Keep `GET /books`, `GET /books/:id`, Swagger UI, and OpenAPI JSON public.
- Document Bearer authentication in Swagger and README.
- Add environment examples and automated tests.

Out of scope:

- User persistence in MongoDB.
- Role-based authorization.
- Refresh tokens.
- Google OAuth browser redirects handled by the API.
- Domain allow-listing unless explicitly enabled later.

## Approach

The API will use Google only as an external identity provider. Clients authenticate with Google and send the resulting Google `id_token` to the API. The API verifies that token with `google-auth-library` and then issues its own short-lived JWT using `@nestjs/jwt`.

This avoids calling Google on every protected request and keeps future authorization decisions inside the API.

## API Contract

### `POST /auth/google`

Request body:

```json
{
  "idToken": "google-id-token"
}
```

Successful response:

```json
{
  "accessToken": "api-jwt",
  "tokenType": "Bearer",
  "expiresIn": "1h",
  "user": {
    "id": "google-sub",
    "email": "user@example.com",
    "name": "User Name",
    "picture": "https://example.com/avatar.png"
  }
}
```

Errors:

- `400 Bad Request` for invalid request body.
- `401 Unauthorized` for invalid Google token or unverified email.

### Protected Book Routes

These routes will require `Authorization: Bearer <accessToken>`:

- `POST /books`
- `PATCH /books/:id`
- `DELETE /books/:id`

Read routes remain public:

- `GET /books`
- `GET /books/:id`

## Components

- `AuthModule`: owns Google token validation and API JWT issuance.
- `AuthController`: exposes `POST /auth/google`.
- `AuthService`: coordinates Google validation and JWT signing.
- `GoogleTokenService`: wraps `OAuth2Client.verifyIdToken`.
- `JwtAuthGuard`: validates API Bearer JWTs and attaches the authenticated user to the request.
- `AuthUser` type: stable internal user payload shape.

## Configuration

New variables:

- `GOOGLE_CLIENT_ID`: OAuth client ID from Google Cloud Console.
- `JWT_SECRET`: strong private signing secret for API JWTs.
- `JWT_EXPIRES_IN`: token lifetime, defaulting to `1h` in local examples.

## Swagger

OpenAPI will declare Bearer authentication globally and annotate protected book write operations with `@ApiBearerAuth()` and `@ApiUnauthorizedResponse()`.

## Testing

Unit tests will cover:

- Google token exchange succeeds when Google returns a verified email.
- Token exchange fails when Google token validation fails.
- Token exchange fails when email is not verified.
- JWT guard rejects missing or invalid Bearer tokens.

E2E tests will cover:

- Public read endpoints still work without auth.
- Protected write endpoints reject unauthenticated requests.

Existing CRUD service tests remain unchanged because authorization belongs at controller/guard level.
