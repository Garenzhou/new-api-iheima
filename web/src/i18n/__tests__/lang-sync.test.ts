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
import dayjs from 'dayjs'
import i18n from 'i18next'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { syncHtmlLangAndDayjs } from '../lang-sync'

describe('syncHtmlLangAndDayjs', () => {
  let localeSpy: ReturnType<typeof vi.spyOn>

  beforeEach(async () => {
    // Load dayjs locales so the `loaded.includes(...)` check in the
    // production code can see them; this mirrors what the app does at
    // boot via `web/src/lib/dayjs.ts`.
    await import('@/lib/dayjs')
    localeSpy = vi.spyOn(dayjs, 'locale')
    document.documentElement.lang = 'en'
  })

  afterEach(() => {
    localeSpy.mockRestore()
  })

  test('sets <html lang> to the supplied language code', () => {
    syncHtmlLangAndDayjs('ar')
    expect(document.documentElement.lang).toBe('ar')

    syncHtmlLangAndDayjs('zhCN')
    expect(document.documentElement.lang).toBe('zhCN')
  })

  test('maps i18next codes to dayjs codes for known Chinese variants', () => {
    syncHtmlLangAndDayjs('zhCN')
    expect(localeSpy).toHaveBeenCalledWith('zh-cn')

    syncHtmlLangAndDayjs('zhTW')
    expect(localeSpy).toHaveBeenCalledWith('zh-tw')
  })

  test('passes through non-mapped codes and only switches if the dayjs locale is loaded', () => {
    // 'ar' is loaded via dayjs/locale/ar in web/src/lib/dayjs.ts
    syncHtmlLangAndDayjs('ar')
    expect(localeSpy).toHaveBeenCalledWith('ar')

    localeSpy.mockClear()
    // 'xyz' is not loaded; sync should leave dayjs on the previous locale
    // (we only assert that no `dayjs.locale(xyz)` call was made).
    syncHtmlLangAndDayjs('xyz')
    expect(localeSpy).not.toHaveBeenCalled()
  })

  test('handles a languageChanged event fired by i18next', () => {
    i18n.on('languageChanged', syncHtmlLangAndDayjs)
    try {
      i18n.emit('languageChanged', 'ar')
      expect(document.documentElement.lang).toBe('ar')
    } finally {
      i18n.off('languageChanged', syncHtmlLangAndDayjs)
    }
  })
})
