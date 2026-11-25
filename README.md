# Multisynq backend

Express API for Gemini chat, text generation, and typing-game scores. Scores use PostgreSQL, including Supabase Postgres. Chat and generation do not depend on the leaderboard database.

## Local setup

1. Run `npm install`.
2. Copy `.env.example` to `.env` only when no `.env` exists. Preserve the existing `GEMINI_API_KEY`.
3. Set `DATABASE_URL` to a PostgreSQL connection string.
4. Run `npm run db:migrate` to create the `multisynq.scores` table.
5. Run `npm start`.

`GEMINI_MODEL` defaults to `gemini-3.1-flash-lite`. Set it to another model available to your Gemini API project when needed.

For Supabase, create a dedicated project and use **Connect → Session pooler** for this persistent backend. Copy the URL and replace the password placeholder with the URL-encoded database password. Keep the URL on the server. See [Supabase connection documentation](https://supabase.com/docs/guides/database/connecting-to-postgres).

Configure TLS using the connection URL and the provider's certificate instructions. Local PostgreSQL can use a localhost URL without TLS. Do not disable certificate verification to resolve connection errors.

The SQL migration can also run in the Supabase SQL Editor. It uses a separate `multisynq` schema and enables row-level security without browser policies. Connect as the table owner or an explicitly authorized server role. Do not expose this schema through the Supabase Data API.

## API and availability

- `GET /health` checks process liveness independently of PostgreSQL.
- `POST /api/chat` accepts `{ context, messages, lang }`. The Next.js server builds the context from the latest portfolio content, including all experience, projects, skills, education, and certificates. The backend owns the AI identity and grounding rules. Legacy `{ system, messages, lang }` payloads remain accepted during rollout.
- Chat and the existing generation endpoint use Gemini, with at most three attempts for temporary provider failures.
- `GET /api/leaderboard` returns five scores ranked by `score * 2 + accuracy + wpm * 1.5`. Missing optional metrics count as zero.
- `POST /api/leaderboard` saves a score. `DELETE /api/leaderboard/:id` deletes one.
- An unconfigured or unreachable database returns `503` for leaderboard requests without stopping chat.
- Response fields remain `_id`, `initials`, `score`, `avatarUrl`, `wpm`, `accuracy`, `timestamp`, and `compositeScore`. New IDs are UUID strings.

Run `npm test` for checks. For the optional PostgreSQL integration test, set `TEST_DATABASE_URL` to an **empty disposable database**; that test creates and removes the `multisynq` schema.

## Existing scores

This migration creates the PostgreSQL schema; it does not copy or recover old MongoDB scores. Preserve the old MongoDB configuration and backups until those records are recovered. Text IDs can retain MongoDB ObjectIds during a later import.

## Heroku rollout after review

Set `DATABASE_URL` in Config Vars, preserve `GEMINI_API_KEY`, deploy the reviewed code, and run `heroku run npm run db:migrate --app multisynq-backend`. Check health, chat, and leaderboard requests. `MONGO_URI` is unused by this version and need not be removed before review.
