// Import necessary modules
import { Bot, GrammyError, HttpError, Context, session, SessionFlavor, MemorySessionStorage } from 'grammy';
import { I18n, I18nFlavor } from '@grammyjs/i18n'; 
import 'dotenv/config'; // Loads environment variables from .env file
import path from 'path'; // Import path module
import * as Sentry from "@sentry/node";

export const debug = process.env.DEBUG === 'true';
const appEnv = process.env.APP_ENV ?? 'production';
const version = process.env.VERSION ?? 'dev';

// Initialize Sentry
const sentryDsn = process.env.SENTRY_DSN;
if (sentryDsn) {
  Sentry.init({
    debug: debug,
    environment: appEnv,
    release: version,
    dsn: sentryDsn,
    tracesSampleRate: 1.0,
  });
  console.log('[Sentry] Sentry initialized successfully.');
} else {
  console.warn('[Sentry] SENTRY_DSN not found in .env file. Sentry will not be initialized.');
}

// Get the bot token from environment variables
const botToken = process.env.BOT_TOKEN;

if (!botToken) {
  console.error('Error: BOT_TOKEN is not defined in your .env file.');
  console.error('Please create a .env file in the root of your project and add your bot token like this:');
  console.error('BOT_TOKEN=your_actual_bot_token_here');
  process.exit(1); // Exit if no token is found
}

// Define custom context type with i18n and session flavor
export interface SessionData { 
  __language_code?: string; // Store user's language preference using grammy-i18n default key
}

// Define AppConfig interface
interface AppConfig {
  defaultLocale: string;
  botUsername?: string; // Optional, as it's set onStart
}

export type MyContext = Context & I18nFlavor & SessionFlavor<SessionData> & { config: AppConfig };

// Create a new bot instance with the custom context
const bot = new Bot<MyContext>(botToken);

const DEFAULT_LOCALE = process.env.DEFAULT_LOCALE ?? 'ru';

// Initialize i18n
const localesPath = path.resolve(__dirname, '../locales');
console.log(`[i18n] Resolved locales directory path: ${localesPath}`);

const i18n: I18n<MyContext> = new I18n<MyContext>({
  directory: localesPath,
  defaultLocale: DEFAULT_LOCALE,
  useSession: true, // Store user language in session
  fluentBundleOptions: { useIsolating: false }, // Optional: for Fluent
});

// Middleware to add custom config to context
const configMiddleware = (ctx: MyContext, next: () => Promise<void>) => {
  ctx.config = {
    defaultLocale: DEFAULT_LOCALE,
    // botUsername will be set by bot.start's onStart or can be accessed via ctx.me.username
  };
  return next();
};

// --- Command Handlers ---
export const handleStartCommand = async (ctx: MyContext) => {
  await ctx.reply(ctx.t('welcome_message', { botUsername: ctx.me?.username ?? 'VRChatMemesBot' }));
};

export const handleHelpCommand = async (ctx: MyContext) => {
  let helpMessage = ctx.t('help_message_header');
  helpMessage += `\n- /start - ${ctx.t('help_command_start')}`;
  helpMessage += `\n- /help - ${ctx.t('help_command_help')}`;
  helpMessage += `\n- /language [code] - ${ctx.t('help_command_language')}`;
  helpMessage += `\n- /ping - ${ctx.t('help_command_ping')}`;
  if (debug) {
    helpMessage += `\n- /debug - ${ctx.t('help_command_debug')}`;
  }
  await ctx.reply(helpMessage);
};

export const handlePingCommand = async (ctx: MyContext) => {
  const startTime = Date.now();
  await ctx.reply(ctx.t('ping_pong'));
  const endTime = Date.now();
  await ctx.reply(ctx.t('ping_response_time', { time: endTime - startTime }));
};

export const handleDebugCommand = async (ctx: MyContext) => {
  if (!debug) { // Double check, though registration is conditional
    await ctx.reply('Debug mode is off.');
    return;
  }
  const userInfo = ctx.from ? `User: ${ctx.from.first_name} (@${ctx.from.username}, ID: ${ctx.from.id})` : 'No user info';
  const chatInfo = ctx.chat ? `Chat: Type ${ctx.chat.type}, ID: ${ctx.chat.id}` : 'No chat info';
  const sessionInfo = `Session: ${JSON.stringify(ctx.session)}`;
  const localeInfo = `Effective Locale: ${await ctx.i18n.getLocale()}`;
  await ctx.reply(`${userInfo}\n${chatInfo}\n${sessionInfo}\n${localeInfo}`);
};

export const handleLanguageCommand = async (ctx: MyContext) => {
  const initialEffectiveLocale = await ctx.i18n.getLocale();
  const availableLocales = i18n.locales;

  if (!ctx.match) { // No argument provided
    let message = ctx.t('language_current_is', { lang: initialEffectiveLocale });
    message += "\n" + ctx.t('language_available_languages');
    availableLocales.forEach((locale: string) => {
      let langName = ctx.t(`lang_name_${locale}`); 
      if (langName === `lang_name_${locale}`) { // Fallback if translation is missing
        langName = locale;
      }
      message += `\n- ${locale} (${langName})`;
    });
    message += "\n\n" + ctx.t('language_set_command_usage');
    await ctx.reply(message);
  } else {
    const targetLocale = (ctx.match as string).toLowerCase().trim();
    if (i18n.locales.includes(targetLocale)) {
      await ctx.i18n.setLocale(targetLocale); 
      await ctx.reply(ctx.t('language_set_to', { lang: targetLocale })); 
    } else {
      await ctx.reply(ctx.t('language_not_supported', { lang: targetLocale })); 
    }
  }
};

// --- Bot Setup & Middleware ---
// Apply session middleware
bot.use(session({ initial: (): SessionData => ({}) , storage: new MemorySessionStorage<SessionData>()})); // Session data type
// Apply i18n middleware
bot.use(i18n.middleware());
// Apply custom config middleware
bot.use(configMiddleware);

// --- Register Command Handlers ---
bot.command('start', handleStartCommand);
bot.command('help', handleHelpCommand);
bot.command('ping', handlePingCommand);

// Conditional command registration for /debug
if (debug) {
  bot.command('debug', handleDebugCommand);
}

bot.command('language', handleLanguageCommand);

// Basic error handling
bot.catch((err) => {
  const ctx = err.ctx;
  console.error(`Error while handling update ${ctx.update.update_id}:`);
  const e = err.error;

  // Capture exception with Sentry
  if (sentryDsn) {
    Sentry.captureException(e, {
      extra: {
        update_id: ctx.update.update_id,
        ...(ctx.chat && { chat_id: ctx.chat.id, chat_type: ctx.chat.type }),
        ...(ctx.from && { user_id: ctx.from.id, user_username: ctx.from.username }),
      },
    });
  }

  if (e instanceof GrammyError) {
    console.error('Error in request:', e.description);
  } else if (e instanceof HttpError) {
    console.error('Could not contact Telegram:', e);
  } else {
    console.error('Unknown error:', e);
  }
});

console.log('Bot instance created. Attempting to connect to Telegram...');

// Start the bot
bot.start({
  onStart: (botInfo) => {
    console.log(`Bot @${botInfo.username} has successfully started and is running.`);
    // Update botUsername in config for all contexts if needed, though ctx.me is preferred
    // This approach is complex with middleware. For now, ctx.me.username is sufficient.
  },
});
