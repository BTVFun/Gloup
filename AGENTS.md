# Repository Guidelines

## Project Structure & Modules
- `app/`: Expo Router screens (`_layout.tsx`, `(tabs)/`, `auth.tsx`).
- `components/ui/`: Reusable UI (e.g., `PostCard.tsx`, `MediaCarousel.tsx`).
- `hooks/`: React hooks (e.g., `useFeed.ts`, `useSupabaseAuth.ts`).
- `lib/`: Clients and utilities (`supabase.ts`, `supabase-admin.ts`, caching, analytics).
- `assets/`: Images, fonts, and static assets.
- `scripts/`: Maintenance scripts (Supabase verification, bucket setup).
- `supabase/migrations/`: SQL migrations for backend.
- `docs/`: Project guides and plans.

## Build, Test, and Dev Commands
- `npm run dev`: Start Expo dev server (iOS/Android/Web via QR or emulator).
- `npm run build:web`: Export static web build to `dist/`.
- `npm run lint`: Run ESLint (Expo preset) and report issues.
- Helpful: `npx expo start -c` to clear cache if metro/resolver acts up.

## Coding Style & Naming
- Language: TypeScript (`strict` mode; path alias `@/*`).
- Formatting: Prettier (2-space indent, single quotes, bracket spacing). Use your editor’s Prettier or run on save.
- Components: PascalCase `ComponentName.tsx` in `components/` or feature folder.
- Hooks: `useThing.ts` in `hooks/`.
- Files/dirs: kebab-case or relevant framework conventions (Expo Router).

## Testing Guidelines
- No formal unit tests yet. If adding tests, prefer Jest + React Native Testing Library.
- Naming: `*.test.tsx`/`*.test.ts` colocated or under `__tests__/`.
- Aim for critical hooks (`hooks/`) and lib utilities (`lib/`) first.

## Commit & Pull Requests
- Commits: Short, imperative summaries; group related changes. Conventional Commits encouraged (e.g., `feat: add post composer`, `fix: prevent duplicate reactions`).
- PRs: Include description, linked issues, screenshots/video for UI, steps to validate, and migration notes if touching `supabase/`.
- Pre-submit: `npm run lint`, run `node scripts/verify-backend.js` when backend-related, and ensure app starts with `npm run dev`.

## Security & Configuration
- Supabase config comes from `app.config.ts -> extra` (`SUPABASE_URL`, `SUPABASE_ANON_KEY`). Do not hardcode; prefer EAS secrets or local `.env` consumed by `app.config.ts`.
- Never commit real credentials. Review `.gitignore` before adding env files.
