/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import i18n from 'i18next'
import dayjs from 'dayjs'

// Map i18next's internal language codes to dayjs locale codes. dayjs uses
// lowercase BCP-47 (e.g. "zh-cn"), while i18next uses camelCase project
// codes (e.g. "zhCN"). Keep this list tiny and only add entries when the
// mapping is non-trivial.
const I18N_TO_DAYJS: Record<string, string> = {
  zhCN: 'zh-cn',
  zhTW: 'zh-tw',
}

/**
 * Apply a language change to the bits of the runtime that aren't covered
 * by React state:
 *   - <html lang> — for screen-reader pronunciation and CSS :lang().
 *   - dayjs.locale() — so .fromNow() and locale-aware format tokens
 *     produce Arabic / Chinese / etc. strings instead of English.
 *
 * The DirectionProvider is responsible for <html dir>; this module
 * deliberately doesn't touch the dir attribute to keep responsibilities
 * split.
 */
export function syncHtmlLangAndDayjs(lang: string): void {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lang
  }
  const dayjsLocale = I18N_TO_DAYJS[lang] ?? lang
  // Only switch if the locale is actually loaded; otherwise leave dayjs
  // on the global default (English). This makes adding a new language a
  // single import in web/src/lib/dayjs.ts. dayjs exposes its loaded
  // locales as `dayjs.Ls` (a key→definition map); there is no public
  // `locales()` method in dayjs 1.x.
  const loadedLocales = (dayjs as unknown as { Ls?: Record<string, unknown> }).Ls
  if (loadedLocales && Object.hasOwn(loadedLocales, dayjsLocale)) {
    dayjs.locale(dayjsLocale)
  }
}

/**
 * Subscribe to i18next's languageChanged event and apply the sync once
 * on mount. Idempotent — calling it again replaces the previous
 * subscription.
 */
export function initLangSync(): () => void {
  syncHtmlLangAndDayjs(i18n.language)
  i18n.on('languageChanged', syncHtmlLangAndDayjs)
  return () => {
    i18n.off('languageChanged', syncHtmlLangAndDayjs)
  }
}
