(function () {
  const globalKey = '__PERBUG_TELEGRAM';
  const updateEvent = 'perbug:telegram:update';

  const coerceNumber = (value) => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const parseThemeColor = (value) => {
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  };

  const setCssVar = (name, value) => {
    if (value == null || value === '') {
      document.documentElement.style.removeProperty(name);
      return;
    }
    document.documentElement.style.setProperty(name, value);
  };

  const extractState = () => {
    const telegram = window.Telegram;
    const webApp = telegram && telegram.WebApp;
    const isTelegramMiniApp = Boolean(webApp);

    if (!isTelegramMiniApp) {
      return {
        isTelegramMiniApp: false,
        initData: null,
        initDataUnsafe: null,
        user: null,
        themeParams: {},
        colorScheme: null,
        viewportHeight: null,
        viewportStableHeight: null,
        isExpanded: false,
        platform: null,
        version: null,
        startParam: null,
      };
    }

    const initDataUnsafe = webApp.initDataUnsafe || null;

    return {
      isTelegramMiniApp: true,
      initData: webApp.initData || null,
      initDataUnsafe,
      user: initDataUnsafe && initDataUnsafe.user ? initDataUnsafe.user : null,
      themeParams: webApp.themeParams || {},
      colorScheme: webApp.colorScheme || null,
      viewportHeight: coerceNumber(webApp.viewportHeight),
      viewportStableHeight: coerceNumber(webApp.viewportStableHeight),
      isExpanded: Boolean(webApp.isExpanded),
      platform: webApp.platform || null,
      version: webApp.version || null,
      startParam: initDataUnsafe && typeof initDataUnsafe.start_param === 'string' ? initDataUnsafe.start_param : null,
    };
  };

  const applyTheme = (state) => {
    const theme = state.themeParams || {};
    const root = document.documentElement;

    root.classList.toggle('tg-mini-app', state.isTelegramMiniApp);

    setCssVar('--tg-bg-color', parseThemeColor(theme.bg_color));
    setCssVar('--tg-secondary-bg-color', parseThemeColor(theme.secondary_bg_color));
    setCssVar('--tg-text-color', parseThemeColor(theme.text_color));
    setCssVar('--tg-hint-color', parseThemeColor(theme.hint_color));
    setCssVar('--tg-link-color', parseThemeColor(theme.link_color));
    setCssVar('--tg-button-color', parseThemeColor(theme.button_color));
    setCssVar('--tg-button-text-color', parseThemeColor(theme.button_text_color));

    const bodyBg = parseThemeColor(theme.bg_color);
    const bodyText = parseThemeColor(theme.text_color);
    if (bodyBg) document.body.style.backgroundColor = bodyBg;
    if (bodyText) document.body.style.color = bodyText;
  };

  const publishState = () => {
    const state = extractState();
    window[globalKey] = state;
    applyTheme(state);
    window.dispatchEvent(new CustomEvent(updateEvent, { detail: state }));
  };

  const bootstrap = () => {
    const telegram = window.Telegram;
    const webApp = telegram && telegram.WebApp;

    if (webApp) {
      try {
        webApp.ready();
        webApp.expand();
        if (typeof webApp.disableVerticalSwipes === 'function') {
          webApp.disableVerticalSwipes();
        }
      } catch (_) {
        // Ignore API availability differences across Telegram clients.
      }

      try {
        webApp.onEvent('themeChanged', publishState);
        webApp.onEvent('viewportChanged', publishState);
      } catch (_) {
        // Ignore event registration failures.
      }
    }

    publishState();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
  } else {
    bootstrap();
  }
})();
