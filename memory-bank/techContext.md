# Tech Context

## Technologies Used

- **Programming Language**: TypeScript (version ^5.8.3)
- **Runtime Environment**: Node.js, executed with Bun (bun-types ^1.2.12)
- **Bot Framework**: grammY (version ^1.36.1)
  - **Session Management**: `grammy/sessions` with `MemorySessionStorage`.
- **Internationalization (i18n)**: @grammyjs/i18n (version ^1.1.2)
  - Translations stored in `/locales` directory using Fluent (`.ftl`) format.
  - Supported languages with existing translation files: English (`en.ftl`), Russian (`ru.ftl`).
  - Default locale: 'ru' (configurable via `DEFAULT_LOCALE` env var).
- **Error Monitoring**: Sentry (@sentry/node ^9.17.0, @sentry/profiling-node ^9.17.0)
- **Environment Variables**: dotenv (version ^16.5.0), `process.env` access.
- **Package Manager**: Bun (implied by `bun.lock` and run scripts).
- **Path Handling**: Node.js `path` module.

## Development Setup

- Code is written in TypeScript (`src/index.ts` is the main file) and run by Bun.
- Dependencies are managed via `package.json` and installed using Bun (`bun install`).
- Bot started for development: `bun --watch src/index.ts`.
- Production startup: `bun run src/index.ts`.
- A `.env` file is required in the project root to store `BOT_TOKEN`, `SENTRY_DSN`, and optionally `DEBUG`, `APP_ENV`, `VERSION`, `DEFAULT_LOCALE`.
  - An example is provided in `.env.example`.
- `tsconfig.json` for TypeScript configuration.
- Translation files (`en.ftl`, `ru.ftl`) are located in `/Users/mrv/Projects/js/vrcmemes-bot/locales`.

## Technical Constraints

- Requires Node.js environment compatible with Bun.
- Requires a valid Telegram Bot Token.
- Sentry DSN is optional but recommended for error tracking.
- Internet connectivity for Telegram API and Sentry.
- `MemorySessionStorage` is not persistent across restarts. For persistent sessions, a different storage adapter (e.g., database-backed) would be needed.

## Dependencies

### Production Dependencies:
- `@grammyjs/i18n`: ^1.1.2
- `@sentry/node`: ^9.17.0
- `@sentry/profiling-node`: ^9.17.0
- `dotenv`: ^16.5.0
- `grammy`: ^1.36.1 (includes session management tools)

### Development Dependencies:
- `@types/node`: ^22.15.17
- `bun-types`: ^1.2.12
- `typescript`: ^5.8.3
