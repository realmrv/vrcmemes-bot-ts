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
  __language_code?: string; // Store user's language preference
}
export type MyContext = Context & I18nFlavor & SessionFlavor<SessionData>;

// Create a new bot instance with the custom context
const bot = new Bot<MyContext>(botToken);

// Initialize i18n
const localesPath = path.resolve(__dirname, '../locales');
console.log(`[i18n] Resolved locales directory path: ${localesPath}`);

const i18n = new I18n<MyContext>({
  directory: localesPath,
  defaultLocale: 'ru',
  useSession: true, // Use session to store language preference
  localeNegotiator: (ctx) => {
    const langFromSession = ctx.session.__language_code;
    console.log(`[i18n negotiator] Language from session (__language_code): ${langFromSession}`);
    // Explicitly return defaultLocale if session is undefined and defaultLocale is set
    return langFromSession || i18n.config.defaultLocale; 
  },
  setter: (ctx, code) => {
    ctx.session.__language_code = code;
    console.log(`[i18n setter] Language set in session (__language_code) to: ${code} for user ${ctx.from?.id}`);
  },
});

// Initialize session middleware
// Note: session middleware must be installed BEFORE i18n middleware
bot.use(session({ 
  initial: (): SessionData => ({ __language_code: undefined }), // Initialize session data
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
  console.log(`[start command] Effective locale for user ${ctx.from?.id}: ${await ctx.i18n.getLocale()}`);
  await ctx.reply(ctx.t('welcome_message'));
});

// Help command handler
bot.command("help", async (ctx: MyContext) => {
  const helpMessage = `${ctx.t('help_message_header')}\n${ctx.t('help_command_start')}\n${ctx.t('help_command_help')}`;
  await ctx.reply(helpMessage);
});

// Language command handler
bot.command("language", async (ctx: MyContext) => {
  const initialEffectiveLocale = await ctx.i18n.getLocale();
  console.log(`[/language] Entry point. Current effective locale: ${initialEffectiveLocale}. Session __language_code: ${ctx.session.__language_code}`);
  const availableLocales = i18n.locales;

  if (!ctx.match) { // No argument provided
    let message = ctx.t('language_current_is', { lang: initialEffectiveLocale });
    message += "\n" + ctx.t('language_available_languages');
    availableLocales.forEach(locale => {
      // Attempt to get the native name of the language or fallback to its code
      let langName = locale;
      try {
        langName = ctx.t(`lang_name_${locale}`); 
        if (langName === `lang_name_${locale}`) langName = locale; // Fallback if translation is missing
      } catch (e) {
        langName = locale;
      }
      message += `\n- ${locale} (${langName})`;
    });
    message += "\n\n" + ctx.t('language_set_command_usage');
    await ctx.reply(message);
  } else {
    const targetLocale = ctx.match.toLowerCase().trim();
    console.log(`[/language] Attempting to set locale to: ${targetLocale}`);
    if (i18n.locales.includes(targetLocale)) {
      console.log(`[/language] Target locale '${targetLocale}' is valid.`);
      console.log(`[/language] Session __language_code BEFORE setLocale: ${ctx.session.__language_code}`);
      console.log(`[/language] Effective locale BEFORE setLocale (using getLocale): ${await ctx.i18n.getLocale()}`);
      
      await ctx.i18n.setLocale(targetLocale); // This calls the setter, which logs "[i18n setter]..."
      
      console.log(`[/language] Session __language_code AFTER setLocale call: ${ctx.session.__language_code}`);
      const newEffectiveLocale = await ctx.i18n.getLocale(); // This uses the negotiator, which reads from session
      console.log(`[/language] Effective locale AFTER setLocale (using getLocale): ${newEffectiveLocale}`);
      
      if (newEffectiveLocale === targetLocale) {
        console.log(`[/language] Confirmation: Effective locale matches target locale.`);
      } else {
        console.warn(`[/language] WARNING: Effective locale '${newEffectiveLocale}' does NOT match target locale '${targetLocale}' after setLocale!`);
      }
      
      // Reply in the new language (hopefully)
      await ctx.reply(ctx.t('language_set_to', { lang: targetLocale })); 
    } else {
      console.log(`[/language] Target locale '${targetLocale}' is NOT valid.`);
      // Reply in the current language
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

// Start the bot
bot.start({
  onStart: (botInfo) => {
    console.log(`Bot @${botInfo.username} is starting... (initialized)`);
  },
});

console.log('Bot instance created. Attempting to connect to Telegram...');
