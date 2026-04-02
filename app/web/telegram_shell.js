(function () {
  const globalKey = '__PERBUG_TELEGRAM';
  const apiKey = '__PERBUG_TELEGRAM_API';
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

  const getWebApp = () => {
    const telegram = window.Telegram;
    return telegram && telegram.WebApp ? telegram.WebApp : null;
  };

  const extractState = () => {
    const webApp = getWebApp();
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

    if (state.viewportStableHeight != null) {
      setCssVar('--tg-viewport-stable-height', `${state.viewportStableHeight}px`);
    } else {
      setCssVar('--tg-viewport-stable-height', null);
    }
  };

  const publishState = () => {
    const state = extractState();
    window[globalKey] = state;
    applyTheme(state);
    window.dispatchEvent(new CustomEvent(updateEvent, { detail: state }));
  };

  const safeCall = (fn) => {
    try {
      fn();
    } catch (_) {
      // Ignore API availability differences across Telegram clients.
    }
  };

  const installApi = () => {
    window[apiKey] = {
      expand() {
        const webApp = getWebApp();
        if (!webApp) return;
        safeCall(() => webApp.expand());
      },
      showMainButton(text) {
        const webApp = getWebApp();
        if (!webApp || !webApp.MainButton) return;
        safeCall(() => {
          if (typeof text === 'string' && text.trim()) {
            webApp.MainButton.setText(text.trim());
          }
          webApp.MainButton.show();
        });
      },
      hideMainButton() {
        const webApp = getWebApp();
        if (!webApp || !webApp.MainButton) return;
        safeCall(() => webApp.MainButton.hide());
      },
      showBackButton() {
        const webApp = getWebApp();
        if (!webApp || !webApp.BackButton) return;
        safeCall(() => webApp.BackButton.show());
      },
      hideBackButton() {
        const webApp = getWebApp();
        if (!webApp || !webApp.BackButton) return;
        safeCall(() => webApp.BackButton.hide());
      }
    };
  };

  const bootstrap = () => {
    const webApp = getWebApp();

    if (webApp) {
      safeCall(() => webApp.ready());
      safeCall(() => webApp.expand());
      safeCall(() => {
        if (typeof webApp.disableVerticalSwipes === 'function') {
          webApp.disableVerticalSwipes();
        }
      });

      safeCall(() => webApp.onEvent('themeChanged', publishState));
      safeCall(() => webApp.onEvent('viewportChanged', publishState));
    }

    installApi();
    publishState();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
  } else {
    bootstrap();
  }
})();
