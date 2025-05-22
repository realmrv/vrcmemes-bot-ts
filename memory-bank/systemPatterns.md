# System Patterns

## System Architecture

- Event-driven architecture: The bot reacts to messages and commands from users on Telegram via the grammY framework.
- The entire core logic currently resides in `src/index.ts`. This includes Sentry initialization, bot setup, i18n configuration, session management, command handlers, and error handling.
- Internationalization is managed by `@grammyjs/i18n`, loading translation files from the `/locales` directory.
- Session data (primarily user language preference) is stored using `MemorySessionStorage`.

## Key Technical Decisions

- Use of TypeScript for type safety and better maintainability.
- Adoption of the grammY framework for Telegram bot development.
- Bun as the runtime and package manager.
- Sentry for proactive error monitoring.
- `dotenv` for managing environment-specific configurations.
- `@grammyjs/i18n` for internationalization, with 'ru' as the default language.
- In-memory session storage for simplicity in early development.

## Design Patterns

- **Command Pattern**: Explicitly used for handling bot commands (`bot.command('start', ...)`).
  - Commands include `/start`, `/help`, `/language`, `/ping`, `/debug`.
- **Middleware Pattern**: grammY extensively uses middleware. `session()` and `i18n.middleware()` are explicitly registered.
- **Session Management**: User-specific data (language) is stored in sessions (`ctx.session`).
- **Internationalization (i18n)**: Text strings are externalized and managed by `ctx.t('key')` calls, with translations in `/locales`.
- **Configuration Management**: Using `.env` files and `process.env` for bot token, Sentry DSN, debug flags, etc. A `ctx.config` object is also used for bot-specific config.
- **Error Handling**: Centralized error handling via `bot.catch()` which logs errors and reports to Sentry.

## Component Relationships

- `src/index.ts`: Main entry point. Initializes and configures Sentry, `dotenv`, `grammy` Bot instance, `i18n`, session middleware, and defines all command handlers and error handling logic.
- `grammy` (library): Handles communication with the Telegram Bot API, update processing, and command routing.
- `@grammyjs/i18n` (library): Manages translations and localization. Provides `ctx.t()` and middleware.
- `@sentry/node` (library): Sends error and performance data to Sentry.io.
- `dotenv` (library): Loads environment variables from `.env` file.
- `MemorySessionStorage` (from `grammy`): Provides in-memory storage for session data.
- `/locales/*.ftl` (or similar, e.g. `.yaml`, `.json`): Files containing translations for different languages (structure to be confirmed by listing `/locales`).
