// Import necessary modules
import { Bot, GrammyError, HttpError, Context, session, SessionFlavor, MemorySessionStorage } from 'grammy';
import { I18n, I18nFlavor } from '@grammyjs/i18n'; 
import 'dotenv/config'; // Loads environment variables from .env file
import path from 'path'; // Import path module

// Get the bot token from environment variables
const botToken = process.env.BOT_TOKEN;

if (!botToken) {
  console.error('Error: BOT_TOKEN is not defined in your .env file.');
  console.error('Please create a .env file in the root of your project and add your bot token like this:');
  console.error('BOT_TOKEN=your_actual_bot_token_here');
  process.exit(1); // Exit if no token is found
}

// Define custom context type with i18n and session flavor
interface SessionData { 
  language_code?: string; // Store user's language preference
}
export type MyContext = Context & I18nFlavor & SessionFlavor<SessionData>;

// Create a new bot instance with the custom context
const bot = new Bot<MyContext>(botToken);

const DEFAULT_LOCALE = process.env.DEFAULT_LOCALE ?? 'ru';

// Initialize i18n
const localesPath = path.resolve(__dirname, '../locales');
console.log(`[i18n] Resolved locales directory path: ${localesPath}`);

const i18n: I18n<MyContext> = new I18n<MyContext>({
  directory: localesPath,
  defaultLocale: DEFAULT_LOCALE,
  useSession: true, // Use session to store language preference
  localeNegotiator: (ctx: MyContext): string => {
    const langFromSession = ctx.session.language_code;
    return langFromSession ?? DEFAULT_LOCALE; 
  },
});

// Initialize session middleware
// Note: session middleware must be installed BEFORE i18n middleware
bot.use(session({ 
  initial: (): SessionData => ({ language_code: undefined }), // Initialize session data
  storage: new MemorySessionStorage<SessionData>(), // Use MemorySessionStorage from 'grammy'
}));

// Use i18n middleware
bot.use(i18n);

// Log loaded locales
if (i18n.locales && i18n.locales.length > 0) {
  console.log(`[i18n] Successfully loaded locales: ${i18n.locales.join(', ')}`);
} else {
  console.log(`[i18n] Warning: No locales seem to be loaded. Check path and files.`);
}

// Start command handler
bot.command("start", async (ctx: MyContext) => {
  await ctx.reply(ctx.t('welcome_message'));
});

// Help command handler
bot.command("help", async (ctx: MyContext) => {
  const helpMessage = `${ctx.t('help_message_header')}\n${ctx.t('help_command_start')}\n${ctx.t('help_command_help')}\n${ctx.t('help_command_language')}`;
  await ctx.reply(helpMessage);
});

// Language command handler
bot.command("language", async (ctx: MyContext) => {
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
});

// Basic error handling
bot.catch((err) => {
  const ctx = err.ctx;
  console.error(`Error while handling update ${ctx.update.update_id}:`);
  const e = err.error;
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
  },
});
