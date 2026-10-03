// Обёртка над Telegram WebApp API. Вне Telegram всё деградирует до обычного сайта.

export const tg = window.Telegram?.WebApp;
export const inTelegram = Boolean(tg && tg.initData);
const atLeast = (v) => Boolean(tg?.isVersionAtLeast?.(v));

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function applyTheme() {
  const scheme = inTelegram
    ? tg.colorScheme
    : matchMedia('(prefers-color-scheme: light)').matches
      ? 'light'
      : 'dark';
  document.documentElement.dataset.theme = scheme === 'light' ? 'light' : 'dark';
  const bg = cssVar('--bg');
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg);
  if (!inTelegram) return;
  try {
    if (atLeast('6.1')) {
      tg.setHeaderColor(bg);
      tg.setBackgroundColor(bg);
    }
    if (atLeast('7.10')) tg.setBottomBarColor(bg);
  } catch {}
}

export function initTelegram() {
  applyTheme();
  if (!tg) {
    matchMedia('(prefers-color-scheme: light)').addEventListener?.('change', applyTheme);
    return;
  }
  tg.ready();
  tg.expand();
  try {
    if (atLeast('7.7')) tg.disableVerticalSwipes();
  } catch {}
  tg.onEvent('themeChanged', applyTheme);
}

export const haptic = {
  tap() {
    try { tg?.HapticFeedback?.selectionChanged(); } catch {}
  },
  impact(style = 'light') {
    try { tg?.HapticFeedback?.impactOccurred(style); } catch {}
  },
  ok() {
    try { tg?.HapticFeedback?.notificationOccurred('success'); } catch {}
  },
};

let backHandler = null;
export function setBack(visible, handler) {
  if (!inTelegram || !atLeast('6.1')) return;
  if (backHandler) tg.BackButton.offClick(backHandler);
  backHandler = null;
  if (visible) {
    backHandler = handler;
    tg.BackButton.onClick(backHandler);
    tg.BackButton.show();
  } else {
    tg.BackButton.hide();
  }
}

/** Поделиться через инлайн-режим бота: откроет выбор чата с «@бот запрос». */
export function shareInline(query) {
  if (inTelegram && atLeast('6.7')) {
    try {
      tg.switchInlineQuery(query, ['users', 'groups', 'channels']);
      return true;
    } catch {}
  }
  return false;
}

export function openLink(url) {
  if (inTelegram) tg.openLink(url);
  else window.open(url, '_blank', 'noopener');
}

export const startParam = () => tg?.initDataUnsafe?.start_param || new URLSearchParams(location.search).get('startapp') || '';

export const cloud = inTelegram && atLeast('6.9') ? tg.CloudStorage : null;
