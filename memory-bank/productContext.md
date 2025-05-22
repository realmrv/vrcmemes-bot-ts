# Product Context

## Problem Solved

- Provides a dedicated platform (Telegram bot) for VRChat users to easily share, find, and enjoy VRChat-related memes.
- Centralizes VRChat meme content within Telegram.
- Offers a localized experience for users through internationalization.

## How it Works

- The project is a Telegram bot (`vrcmemes-bot`) built using the grammY framework in TypeScript.
- It listens for commands and interactions within Telegram. Implemented commands include:
  - `/start`: Welcome message.
  - `/help`: Lists available commands.
  - `/language`: Allows users to view and set their preferred language for bot interactions. Language preference is stored in a session.
  - `/ping`: Checks bot responsiveness.
  - `/debug` (conditional): Shows debug information about the user, chat, and session.
- Uses Sentry for error monitoring and `dotenv` for configuration management.
- Leverages `@grammyjs/i18n` for internationalization, loading translations from a `/locales` directory. Default language is 'ru'.
- Uses in-memory session storage (`MemorySessionStorage`) for user-specific data like language preference.
- (The actual meme fetching/sharing logic is not yet apparent from `index.ts` and likely needs to be added).

## User Experience Goals

- Easy and intuitive interaction for discovering and sharing VRChat memes.
- Ability for users to interact with the bot in their preferred language.
- Reliable bot performance with minimal downtime, supported by Sentry error tracking.
- Clear feedback, help messages, and error messages, available in multiple languages.
- A simple way to check bot status (`/ping`) and manage language settings (`/language`).
- Potentially a fun and engaging experience for VRChat community members on Telegram.
