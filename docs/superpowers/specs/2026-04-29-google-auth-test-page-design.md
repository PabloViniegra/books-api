# Google Auth Test Page Design

## Goal

Add a development-only page that lets a developer sign in with Google, inspect the returned Google ID token, and optionally exchange it for the API JWT used by protected write endpoints.

## Scope

In scope:

- Add `GET /auth/google/test`.
- Render a minimal HTML page directly from the auth feature.
- Load Google Identity Services in the page.
- Use the configured `GOOGLE_CLIENT_ID` to initialize Google sign-in.
- Show the returned Google `idToken` (`response.credential`) on screen.
- Provide a copy button for the `idToken`.
- Provide a button to call `POST /auth/google` from the page and show the resulting API `accessToken`.
- Make the page available only when `NODE_ENV !== 'production'`.
- Document the page in `README.md`.

Out of scope:

- Persisting users.
- Styling beyond a clear utility page.
- Replacing Swagger auth flows.
- Exposing the page in production.

## Approach

The auth controller will expose a new public `GET /auth/google/test` route. When the application is not running in production, the route returns an HTML document with a small inline script that:

- loads `https://accounts.google.com/gsi/client`
- initializes Google sign-in with `GOOGLE_CLIENT_ID`
- renders a sign-in button
- captures `response.credential` as the Google ID token
- displays the token in a read-only text area
- allows copying the token
- optionally calls `POST /auth/google` with the ID token and displays the returned API JWT

If the route is requested in production, it should return `404 Not Found` to avoid advertising a testing utility.

## API Contract

### `GET /auth/google/test`

- `200 OK` with `text/html` when running outside production.
- `404 Not Found` when `NODE_ENV=production`.

### Page Behavior

The page will contain:

- a heading explaining it is a development-only helper
- a Google sign-in button
- an area that shows the Google ID token after login
- a button to copy the ID token
- a button to exchange the ID token through `POST /auth/google`
- an area that shows the returned API JWT or error message

## Components

- `AuthController`: exposes the new test page route.
- `AuthPageService` or helper: centralizes HTML generation to keep the controller small.
- Existing `AuthService`: remains responsible for `POST /auth/google` token exchange.

## Security

- The page is intentionally limited to non-production environments.
- The page uses the already configured `GOOGLE_CLIENT_ID`; no secrets are embedded client-side.
- The page is for manual developer testing only and is not linked from production flows.

## Testing

Add controller-level tests to verify:

- `GET /auth/google/test` returns HTML outside production.
- `GET /auth/google/test` returns `404` in production.

Existing auth and e2e tests remain in place.
