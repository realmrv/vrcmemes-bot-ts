# Project Brief

## Core Requirements and Goals

- Develop a Telegram bot (`vrcmemes-bot`) for sharing and interacting with VRChat-related memes.
- Provide basic commands for user interaction: `/start`, `/help`, `/language`, `/ping`.
- Include a `/debug` command for development/troubleshooting purposes (conditional on `DEBUG` env var).
- Ensure the bot is robust and monitored for errors using Sentry.
- Support multiple languages using `@grammyjs/i18n` with session-based language preference.

## Scope

- Telegram bot functionality using the grammY framework.
- Core commands: `/start`, `/help`, `/language` (view and set), `/ping`, conditional `/debug`.
- Session management (in-memory) for storing user language preferences.
- Internationalization capabilities with translations stored in the `/locales` directory.
- Integration with Sentry for error tracking and performance monitoring.
- Management of bot token and other configurations via environment variables (`.env` file).
