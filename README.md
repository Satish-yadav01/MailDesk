# MailDesk

A React + TypeScript SaaS-style UI for the **Mail Service** REST API (from `Mail_Service_Controllers.postman_collection.json`).

Stack: Vite, React 18, TypeScript, React Router 6, Tailwind CSS 3, Radix primitives (shadcn-style components), Lucide, Axios, TanStack Query 5, React Hook Form + Zod, Sonner, Vitest + Testing Library.

## Quick start

```bash
npm install
cp .env.example .env.development   # edit to use local or deployed services
npm run dev                         # http://localhost:5173
```

Scripts: `npm run dev`, `npm run build`, `npm run preview`, `npm run typecheck`, `npm test`.

## Configuration

| Variable | Purpose | Default |
|---|---|---|
| `VITE_API_BASE_URL` | Mail Service base URL (no trailing slash) | `https://maildesk-service.onrender.com` |
| `VITE_AUTH_API_BASE_URL` | User Service base URL for login and registration (no trailing slash) | `https://user-service-9ilv.onrender.com` |
| `VITE_API_TIMEOUT_MS` | Default request timeout | `30000` |
| `VITE_GOOGLE_OAUTH_URL` | Google OAuth authorization URL | `https://user-service-9ilv.onrender.com/oauth2/authorization/google` |
All `VITE_*` values are bundled into the client and visible to users. **Never put secrets in them.**
Use `.env.development` / `.env.production` for per-environment values.

## API → UI mapping

| Endpoint | Where it is used |
|---|---|
| `GET /api/email-info/emailListHeaders` | Import page: "Expected columns" panel |
| `POST /api/emails/add` (JSON array, async, 202 + `tid`) | Create Single (array of one) and Create Multiple |
| `POST /api/emails/import-excel` (multipart `file`, async, 202 + `tid`) | Upload Excel File |
| `GET /api/emails/enquiry?tid=` | Status panel after add/import (polled every 2s, up to ~2 min) and the Transaction Status page |
| `GET /api/emails/list?page=&size=` | Email List, dashboard summary and recent records |
| `GET /api/mail/health` | Mail Sender and dashboard status badge |
| `POST /api/mail/resume/upload` | Mail Sender: resume upload |
| `POST /api/mail/resume/drive-link` | Mail Sender: Drive link |
| `POST /api/mail/send` | Mail Sender: test send (confirmation dialog) |
| `POST /api/mail/cold-email/trigger` | Mail Sender: danger zone (type `SEND` to confirm) |

Not in the API, so not in the UI: get-by-id, update, delete, server-side search/filter/sort. The list is read-only; search and sort act on the loaded page only.

## Assumptions to confirm (the collection has no saved example responses)

1. **Response shapes are inferred.** `src/services/normalizers.ts` accepts a bare array or a Spring-style page (`content`, `totalElements`, ...) for the list, and any `{status, message}`-like object for `enquiry`. Unknown fields are shown as text, never as HTML. Send real sample responses to tighten these.
2. **Transaction status vocabulary is unknown.** `COMPLETED/SUCCESS/DONE...` count as success and `FAILED/ERROR/REJECTED...` as failure; anything else keeps polling (capped). Edit `SUCCESS`/`FAILURE` in `normalizers.ts` once the real values are known.
3. **Required record fields are unknown;** only `email` is required in the forms. `emailStatus` is free text (default `UNVERIFIED`).
4. **Excel**: `.xlsx`/`.xls` accepted per the collection. Required columns and size limits are unspecified, so no template download is offered and there is no client-side size limit.
5. **Single create** sends a one-element array to `/api/emails/add`; **bulk** sends one array in one request (no per-record results are documented, so the full server response is shown).
6. **Authentication** uses `VITE_AUTH_API_BASE_URL`: `POST /auth/register` and `POST /auth/login` return a JWT token that is saved in browser local storage and sent as an `Authorization` header for Mail Service requests. Tokens expire after one hour; a `401` clears the saved session and returns users to sign-in because there is no refresh endpoint.
7. **Google OAuth**: the user service redirects successful login to `/auth/callback` with `token` and `tokenType` in the URL fragment. Configure `FRONTEND_OAUTH_CALLBACK_URL` on the user service to the deployed frontend callback URL, and set `VITE_GOOGLE_OAUTH_URL` to the deployed user-service authorization endpoint.

## Authentication and production notes

- **CORS**: the browser calls both services directly. Enable CORS on both services for your web origin, or serve them behind one reverse proxy. Don't disable browser security.
- **Google OAuth** redirects to `VITE_GOOGLE_OAUTH_URL`. The Google provider callback URI remains the user-service endpoint; separately set the user service's `FRONTEND_OAUTH_CALLBACK_URL` to `https://<frontend-domain>/auth/callback`. The callback token is returned in the URL fragment, consumed by the frontend, and removed from the address bar.
- `/api/mail/send` and `/api/mail/cold-email/trigger` can cause real-world effects. Enforce authorization and rate limits on the backend before exposing them publicly.
- If the API later requires a secret key, call it from a backend proxy; never ship it in this bundle.
- No request or response bodies, emails or headers are logged by the app.

## Structure

```
src/
  app/            router + providers
  components/     ui (primitives), layout, common
  features/       auth, dashboard, emails, email-import, mail-sender, landing
  hooks/          TanStack Query hooks
  lib/            api-client, api-errors, validators, utils
  services/       email-service, mail-service, normalizers
  types/ utils/ test/
```

## Tests

`npm test` covers validators, normalizers, error mapping, service contracts (including the multipart request without a manual Content-Type), and component tests for auth, create, list (loading/empty/error/retry/filter) and Excel import (validation/success/error).
