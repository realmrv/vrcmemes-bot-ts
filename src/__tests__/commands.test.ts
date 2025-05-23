import { describe, it, expect, beforeEach, jest } from 'bun:test';
import type { MyContext, SessionData } from '../index'; // SessionData is now exported
import {
  handleStartCommand,
  handleHelpCommand,
  handlePingCommand,
  handleDebugCommand,
  handleLanguageCommand,
} from '../index';

// Mock parts of MyContext
// We'll expand this mock as needed for different tests
const mockCtx = (overrides: Partial<MyContext> = {}): MyContext => {
  const baseCtx: Partial<MyContext> = {
    reply: jest.fn(),
    t: jest.fn((key: string, params?: Record<string, any>) => {
      // Simple mock for t: returns key or key with params
      if (params) return `${key} ${JSON.stringify(params)}`;
      return key;
    }),
    session: { __language_code: 'ru' } as SessionData,
    i18n: {
      getLocale: jest.fn(async () => baseCtx.session?.__language_code ?? 'ru'),
      setLocale: jest.fn(async (locale: string) => {
        if (baseCtx.session) baseCtx.session.__language_code = locale;
      }),
      locales: ['en', 'ru'], // Add locales to the mock for testing
    } as any, // Cast to any to avoid full I18nFlavor mock initially
    me: {
      id: 123456789,
      is_bot: true,
      first_name: 'TestBot',
      username: 'TestBotUsername',
    } as any,
    match: '',
    from: {
      id: 123,
      is_bot: false,
      first_name: 'TestUser',
      username: 'testuser',
      language_code: 'en',
    } as any,
    chat: {
      id: 456,
      type: 'private',
    } as any,
    config: {
        defaultLocale: 'ru',
        botUsername: 'TestBotUsername',
        debug: false, // Add debug property with a default value
    },
    // Add other properties/methods as needed by handlers
  };
  return { ...baseCtx, ...overrides } as MyContext;
};

describe('Bot Command Handlers', () => {
  let ctx: MyContext;

  beforeEach(() => {
    // Reset context and mocks before each test
    ctx = mockCtx();
    // Reset jest mocks
    (ctx.reply as jest.Mock).mockClear();
    (ctx.t as jest.Mock).mockClear();
    (ctx.i18n.getLocale as jest.Mock).mockClear();
    (ctx.i18n.setLocale as jest.Mock).mockClear();
    // Reset environment variables or other global states if necessary
    // For example, process.env.DEBUG for handleDebugCommand
  });

  describe('/start command (handleStartCommand)', () => {
    it('should reply with a welcome message including bot username', async () => {
      (ctx.t as jest.Mock).mockReturnValue('Welcome TestBotUsername!'); // Mock the translation
      await handleStartCommand(ctx);
      expect(ctx.reply).toHaveBeenCalledTimes(1);
      expect(ctx.reply).toHaveBeenCalledWith('Welcome TestBotUsername!');
      expect(ctx.t).toHaveBeenCalledWith('welcome_message', { botUsername: 'TestBotUsername' });
    });

    it('should reply with a fallback bot username if ctx.me is not available', async () => {
      const ctxWithoutMe = mockCtx({ me: undefined });
      (ctxWithoutMe.t as jest.Mock).mockReturnValue('Welcome VRChatMemesBot!'); // Mock the translation
      
      await handleStartCommand(ctxWithoutMe);
      
      expect(ctxWithoutMe.reply).toHaveBeenCalledTimes(1);
      expect(ctxWithoutMe.reply).toHaveBeenCalledWith('Welcome VRChatMemesBot!');
      expect(ctxWithoutMe.t).toHaveBeenCalledWith('welcome_message', { botUsername: 'VRChatMemesBot' });
    });
  });

  describe('/help command (handleHelpCommand)', () => {
    const mockTWithSpecifics = (
      specifics: Record<string, string>,
      defaultLang = 'ru', // Default to 'ru' as per original mockCtx
    ) => {
      return jest.fn((key: string, params?: Record<string, any>) => {
        if (key in specifics) {
          const translation = specifics[key];
          return params ? `${translation} ${JSON.stringify(params)}` : translation;
        }
        // Fallback for keys not in specifics, like language_current_is
        if (key === 'language_current_is') return `Текущий язык: ${params?.lang ?? defaultLang}.`;
        if (key === 'language_available_languages') return 'Доступные языки:';
        if (key.startsWith('lang_name_')) return key.split('_')[2].toUpperCase(); // e.g., lang_name_en -> EN

        return key; // Default mock behavior for unmocked keys
      });
    };

    it('should reply with the help message including debug command when debug is true', async () => {
      const specificTranslations = {
        help_message_header: 'Available commands:', // This comes directly from t()
        help_command_start: 'Start the bot',
        help_command_help: 'Show this help message',
        help_command_language:
          '[lang_code] - Change language (e.g., /language en). Available: en, ru. If no code, shows current and available languages.',
        help_command_ping: "Check bot's responsiveness",
        help_command_debug: 'Show debug information (for bot owner)',
      };
      // Use 'en' for this test to match the English translations provided
      ctx.t = mockTWithSpecifics(specificTranslations, 'en'); 
      ctx.config.debug = true; // Simulate debug mode ON
      (ctx.i18n.getLocale as jest.Mock).mockResolvedValue('en');

      await handleHelpCommand(ctx);

      let expectedMessage = specificTranslations.help_message_header;
      expectedMessage += `\n- /start - ${specificTranslations.help_command_start}`;
      expectedMessage += `\n- /help - ${specificTranslations.help_command_help}`;
      expectedMessage += `\n- /language [code] - ${specificTranslations.help_command_language}`;
      expectedMessage += `\n- /ping - ${specificTranslations.help_command_ping}`;
      expectedMessage += `\n- /debug - ${specificTranslations.help_command_debug}`;
      expect(ctx.reply).toHaveBeenCalledWith(expectedMessage);
    });

    it('should reply with the help message excluding debug command when debug is false', async () => {
      const specificTranslations = {
        help_message_header: 'Available commands:',
        help_command_start: 'Start the bot',
        help_command_help: 'Show this help message',
        help_command_language:
          '[lang_code] - Change language (e.g., /language en). Available: en, ru. If no code, shows current and available languages.',
        help_command_ping: "Check bot's responsiveness",
      };
      ctx.t = mockTWithSpecifics(specificTranslations, 'en');
      ctx.config.debug = false; // Simulate debug mode OFF
      (ctx.i18n.getLocale as jest.Mock).mockResolvedValue('en');

      await handleHelpCommand(ctx);

      let expectedMessage = specificTranslations.help_message_header;
      expectedMessage += `\n- /start - ${specificTranslations.help_command_start}`;
      expectedMessage += `\n- /help - ${specificTranslations.help_command_help}`;
      expectedMessage += `\n- /language [code] - ${specificTranslations.help_command_language}`;
      expectedMessage += `\n- /ping - ${specificTranslations.help_command_ping}`;
      expect(ctx.reply).toHaveBeenCalledWith(expectedMessage);
    });
  });

  describe('/ping command (handlePingCommand)', () => {
    it('should reply with pong and response time', async () => {
      const originalDateNow = Date.now;
      Date.now = jest.fn()
        .mockReturnValueOnce(1000) // Start time
        .mockReturnValueOnce(1050); // End time

      (ctx.t as jest.Mock).mockImplementation((key: string, params?: Record<string, any>) => {
        if (key === 'ping_pong') return 'Pong! Test';
        if (key === 'ping_response_time') return `Response time: ${params?.time ?? 0}ms Test`; // Safe access to params.time
        return key;
      });

      await handlePingCommand(ctx);

      expect(ctx.reply).toHaveBeenCalledTimes(2);
      expect(ctx.reply).toHaveBeenNthCalledWith(1, 'Pong! Test');
      expect(ctx.reply).toHaveBeenNthCalledWith(2, 'Response time: 50ms Test');
      Date.now = originalDateNow; // Restore Date.now
    });
  });

  describe('/language command (handleLanguageCommand)', () => {
    it('should show current and available languages if no argument is provided', async () => {
      const currentLocaleForTest = 'ru';
      const langKeyValues: Record<string, string> = {
        language_current_is: `Current language: ${currentLocaleForTest}`,
        language_available_languages: 'Available languages: ',
        lang_name_en: 'English',
        lang_name_ru: 'Русский',
        language_set_command_usage: 'Usage: /language [lang_code]',
      };
      // Mock ctx.t to return pre-formatted strings for this test case
      (ctx.t as jest.Mock).mockImplementation((key: string, params?: Record<string, any>) => {
        if (key === 'language_current_is') return langKeyValues.language_current_is; // Already has locale
        if (key === 'language_available_languages') return langKeyValues.language_available_languages; // Already formatted
        if (key === 'lang_name_ru') return langKeyValues.lang_name_ru;
        if (key === 'lang_name_en') return langKeyValues.lang_name_en;
        if (key === 'language_set_command_usage') return langKeyValues.language_set_command_usage;
        return key; // Fallback for any other keys
      });
      (ctx.i18n.getLocale as jest.Mock).mockResolvedValue(currentLocaleForTest);
      (ctx.i18n as any).locales = ['ru', 'en']; // Ensure consistent order for test

      await handleLanguageCommand(ctx);

      const expectedCurrentLang = langKeyValues.language_current_is;
      const expectedAvailableLangs = langKeyValues.language_available_languages;
      const expectedLangList = `- ru (${langKeyValues.lang_name_ru})\n- en (${langKeyValues.lang_name_en})`;
      const expectedUsage = langKeyValues.language_set_command_usage;
      const expectedMessage = `${expectedCurrentLang}\n${expectedAvailableLangs}\n${expectedLangList}\n\n${expectedUsage}`;

      expect(ctx.reply).toHaveBeenCalledWith(expectedMessage);
    });

    it('should show usage if language code is provided but invalid', async () => {
      ctx.match = 'invalid_lang';
      const langKeyValues: Record<string, string> = {
        language_set_command_usage: 'Usage: /language [lang_code]',
        language_not_supported: '{lang} is not supported.',
      };
      (ctx.t as jest.Mock).mockImplementation((key: string, params?: Record<string, any>) => {
        let message = langKeyValues[key] ?? key;
        if (params?.lang) message = message.replace('{lang}', params.lang);
        return message;
      });
      (ctx.i18n.getLocale as jest.Mock).mockResolvedValue('ru'); // Current locale doesn't change
      (ctx.i18n as any).locales = ['en', 'ru']; // Ensure 'invalid_lang' is not in locales

      await handleLanguageCommand(ctx);
      const expectedMessage = langKeyValues.language_not_supported.replace('{lang}', 'invalid_lang');
      expect(ctx.reply).toHaveBeenCalledWith(expectedMessage);
    });

    it('should set language and reply if a valid language code is provided', async () => {
      ctx.match = 'en';
      const langKeyValues: Record<string, string> = {
        language_set_to: 'Language set to {lang}.',
      };
      (ctx.t as jest.Mock).mockImplementation((key: string, params?: Record<string, any>) => {
        let message = langKeyValues[key] ?? key;
        if (params?.lang) message = message.replace('{lang}', params.lang);
        return message;
      });
      (ctx.i18n as any).locales = ['en', 'ru']; // Ensure 'en' is a valid locale by modifying the mock

      await handleLanguageCommand(ctx);

      expect(ctx.i18n.setLocale).toHaveBeenCalledWith('en');
      expect(ctx.reply).toHaveBeenCalledWith('Language set to en.');
    });

    it('should reply with not supported if language code is not in i18n.locales', async () => {
      ctx.match = 'es'; // Spanish, assuming not in our locales
      const langKeyValues: Record<string, string> = {
        language_not_supported: '{lang} is not supported.',
      };
      (ctx.t as jest.Mock).mockImplementation((key: string, params?: Record<string, any>) => {
        let message = langKeyValues[key] ?? key;
        if (params?.lang) message = message.replace('{lang}', params.lang);
        return message;
      });
      (ctx.i18n as any).locales = ['en', 'ru']; // Modify the mock for this test

      await handleLanguageCommand(ctx);
      expect(ctx.reply).toHaveBeenCalledWith('es is not supported.');
    });
  });

  describe('/debug command (handleDebugCommand)', () => {
    // Note: To properly test the conditional registration of /debug,
    // that would be an integration-style test ensuring the command
    // is or isn't added to the bot based on the debug flag.
    // These unit tests focus on the handler's logic, assuming it's called.

    it('should reply with user, chat, session, and locale info', async () => {
      // Override specific parts of ctx for this test
      const testCtx = mockCtx({
        from: {
          id: 987,
          is_bot: false,
          first_name: 'DebugUser',
          username: 'debuguser',
          language_code: 'ru',
        } as any,
        chat: { id: 654, type: 'group' } as any,
        session: { __language_code: 'ru' },
      });
      testCtx.config.debug = true; // Ensure debug mode is on for this test
      (testCtx.i18n.getLocale as jest.Mock).mockResolvedValue('ru');

      // We assume 'debug' is true for this handler to be called and for its internal check to pass.
      await handleDebugCommand(testCtx);

      const expectedUserInfo = 'User: DebugUser (@debuguser, ID: 987)';
      const expectedChatInfo = 'Chat: Type group, ID: 654';
      const expectedSessionInfo = 'Session: {"__language_code":"ru"}';
      const expectedLocaleInfo = 'Effective Locale: ru';
      const expectedFullMessage = `${expectedUserInfo}\n${expectedChatInfo}\n${expectedSessionInfo}\n${expectedLocaleInfo}`;

      expect(testCtx.reply).toHaveBeenCalledTimes(1);
      expect(testCtx.reply).toHaveBeenCalledWith(expectedFullMessage);
    });

    it('should handle missing user and chat info gracefully', async () => {
      const minimalCtx = mockCtx({
        from: undefined,
        chat: undefined,
        session: { __language_code: 'en' },
      });
      minimalCtx.config.debug = true; // Ensure debug mode is on for this test
      (minimalCtx.i18n.getLocale as jest.Mock).mockResolvedValue('en');

      await handleDebugCommand(minimalCtx);

      const expectedUserInfo = 'No user info';
      const expectedChatInfo = 'No chat info';
      const expectedSessionInfo = 'Session: {"__language_code":"en"}';
      const expectedLocaleInfo = 'Effective Locale: en';
      const expectedFullMessage = `${expectedUserInfo}\n${expectedChatInfo}\n${expectedSessionInfo}\n${expectedLocaleInfo}`;

      expect(minimalCtx.reply).toHaveBeenCalledTimes(1);
      expect(minimalCtx.reply).toHaveBeenCalledWith(expectedFullMessage);
    });

    // To test the 'Debug mode is off' path, we would need to simulate 'debug' being false
    // within the scope of the imported handleDebugCommand. As discussed for handleHelpCommand,
    // this is complex due to the module-level 'debug' const in index.ts.
    // The primary protection against running /debug when debug is off is its conditional registration.
    // However, now that handleDebugCommand uses ctx.config.debug, we can test this path.
    it('should reply that debug mode is off if ctx.config.debug is false', async () => {
      const testCtx = mockCtx();
      testCtx.config.debug = false; // Explicitly set debug mode to OFF

      await handleDebugCommand(testCtx);

      expect(testCtx.reply).toHaveBeenCalledTimes(1);
      expect(testCtx.reply).toHaveBeenCalledWith('Debug mode is off.');
    });
  });
});
