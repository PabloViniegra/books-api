import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthPageService {
  constructor(private readonly configService: ConfigService) {}

  getGoogleTestPage(): string {
    if (this.configService.get<string>('NODE_ENV') === 'production') {
      throw new NotFoundException();
    }

    const googleClientId = this.configService.get<string>('GOOGLE_CLIENT_ID');

    if (!googleClientId) {
      throw new InternalServerErrorException(
        'GOOGLE_CLIENT_ID is not configured',
      );
    }

    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Google Auth Test</title>
    <style>
      :root {
        color-scheme: light dark;
        font-family: Inter, system-ui, sans-serif;
      }

      body {
        margin: 0;
        background: #0f172a;
        color: #e2e8f0;
      }

      main {
        max-width: 900px;
        margin: 0 auto;
        padding: 40px 20px 64px;
      }

      h1 {
        margin: 0 0 12px;
        font-size: 2rem;
      }

      p {
        color: #cbd5e1;
        line-height: 1.5;
      }

      .panel {
        margin-top: 24px;
        padding: 20px;
        border: 1px solid #334155;
        border-radius: 16px;
        background: #111827;
      }

      .label {
        display: block;
        margin-bottom: 8px;
        font-weight: 600;
      }

      textarea {
        width: 100%;
        min-height: 150px;
        padding: 12px;
        border: 1px solid #475569;
        border-radius: 12px;
        background: #020617;
        color: #e2e8f0;
        resize: vertical;
        box-sizing: border-box;
      }

      .actions {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        margin-top: 12px;
      }

      button {
        border: 0;
        border-radius: 999px;
        padding: 10px 16px;
        font: inherit;
        font-weight: 600;
        cursor: pointer;
        background: #2563eb;
        color: white;
      }

      button[disabled] {
        opacity: 0.55;
        cursor: not-allowed;
      }

      .secondary {
        background: #334155;
      }

      .status {
        margin-top: 12px;
        color: #93c5fd;
        min-height: 24px;
      }

      code {
        background: #1e293b;
        border-radius: 8px;
        padding: 2px 6px;
      }
    </style>
    <script src="https://accounts.google.com/gsi/client" async defer></script>
  </head>
  <body>
    <main>
      <h1>Google Auth Test Page</h1>
      <p>
        Development-only helper to obtain a Google <code>idToken</code> and test
        the API exchange endpoint.
      </p>

      <section class="panel">
        <p><strong>Client ID:</strong> <code>${googleClientId}</code></p>
        <div id="google-signin-button"></div>
        <div class="status" id="signin-status">Waiting for Google sign-in.</div>
      </section>

      <section class="panel">
        <label class="label" for="google-id-token">Google ID token</label>
        <textarea id="google-id-token" readonly placeholder="The Google ID token will appear here after login."></textarea>
        <div class="actions">
          <button id="copy-id-token" class="secondary" disabled>Copy ID token</button>
          <button id="exchange-id-token" disabled>Exchange for API token</button>
        </div>
      </section>

      <section class="panel">
        <label class="label" for="api-access-token">API access token</label>
        <textarea id="api-access-token" readonly placeholder="The API access token will appear here after exchanging the Google token."></textarea>
        <div class="actions">
          <button id="copy-access-token" class="secondary" disabled>Copy API token</button>
        </div>
        <div class="status" id="exchange-status"></div>
      </section>
    </main>

    <script>
      (() => {
        const googleIdToken = document.getElementById('google-id-token');
        const apiAccessToken = document.getElementById('api-access-token');
        const signinStatus = document.getElementById('signin-status');
        const exchangeStatus = document.getElementById('exchange-status');
        const copyIdTokenButton = document.getElementById('copy-id-token');
        const exchangeIdTokenButton = document.getElementById('exchange-id-token');
        const copyAccessTokenButton = document.getElementById('copy-access-token');

        const setStatus = (element, message, isError = false) => {
          element.textContent = message;
          element.style.color = isError ? '#fca5a5' : '#93c5fd';
        };

        const copyText = async (value, successMessage) => {
          if (!value) {
            return;
          }

          await navigator.clipboard.writeText(value);
          setStatus(exchangeStatus, successMessage);
        };

        copyIdTokenButton.addEventListener('click', async () => {
          await copyText(googleIdToken.value, 'Google ID token copied.');
        });

        copyAccessTokenButton.addEventListener('click', async () => {
          await copyText(apiAccessToken.value, 'API access token copied.');
        });

        exchangeIdTokenButton.addEventListener('click', async () => {
          exchangeIdTokenButton.disabled = true;
          setStatus(exchangeStatus, 'Exchanging Google token for API token...');

          try {
            const response = await fetch('/auth/google', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ idToken: googleIdToken.value }),
            });

            const payload = await response.json();

            if (!response.ok) {
              const message = payload.message ?? 'Token exchange failed.';
              throw new Error(Array.isArray(message) ? message.join(', ') : message);
            }

            apiAccessToken.value = payload.accessToken ?? '';
            copyAccessTokenButton.disabled = !apiAccessToken.value;
            setStatus(exchangeStatus, 'API access token ready.');
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Token exchange failed.';
            setStatus(exchangeStatus, message, true);
          } finally {
            exchangeIdTokenButton.disabled = !googleIdToken.value;
          }
        });

        window.handleGoogleCredential = (response) => {
          googleIdToken.value = response.credential ?? '';
          copyIdTokenButton.disabled = !googleIdToken.value;
          exchangeIdTokenButton.disabled = !googleIdToken.value;
          apiAccessToken.value = '';
          copyAccessTokenButton.disabled = true;
          setStatus(signinStatus, 'Google ID token captured.');
          setStatus(exchangeStatus, 'You can now exchange the Google token for an API token.');
        };

        window.onload = () => {
          if (!window.google?.accounts?.id) {
            setStatus(signinStatus, 'Google Identity Services failed to load.', true);
            return;
          }

          window.google.accounts.id.initialize({
            client_id: '${googleClientId}',
            callback: window.handleGoogleCredential,
          });

          window.google.accounts.id.renderButton(
            document.getElementById('google-signin-button'),
            {
              theme: 'outline',
              size: 'large',
              shape: 'pill',
              text: 'signin_with',
              width: 260,
            },
          );
        };
      })();
    </script>
  </body>
</html>`;
  }
}
