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
import { describe, expect, test } from 'vitest'

import { getDirection } from '../direction'
import {
  convertDetectedLanguage,
  normalizeInterfaceLanguage,
  toIntlLocale,
} from '../languages'

describe('normalizeInterfaceLanguage', () => {
  test.each([
    // exact matches
    ['en', 'en'],
    ['zhCN', 'zhCN'],
    ['zhTW', 'zhTW'],
    ['fr', 'fr'],
    ['ru', 'ru'],
    ['ja', 'ja'],
    ['vi', 'vi'],
    ['ar', 'ar'],
    ['ko', 'ko'],
    // Chinese variants normalized to project codes
    ['zh-CN', 'zhCN'],
    ['zh-Hans', 'zhCN'],
    ['zh-TW', 'zhTW'],
    ['zh-HK', 'zhTW'],
    ['zh-MO', 'zhTW'],
    // case-insensitive for known project codes
    ['EN', 'en'],
    ['EN_us', 'en'],
    // unknown codes fall back to en
    ['fr-CA', 'en'],
    ['', 'en'],
    [null, 'en'],
    [undefined, 'en'],
  ])('normalizes %p → %p', (input, expected) => {
    expect(normalizeInterfaceLanguage(input as string | null | undefined)).toBe(
      expected,
    )
  })
})

describe('convertDetectedLanguage', () => {
  test.each([
    // Non-Chinese codes pass through unchanged so i18next's supportedLngs
    // can match (e.g. ar-SA → ar, en-US → en).
    ['ar', 'ar'],
    ['ar-SA', 'ar-SA'],
    ['ko', 'ko'],
    ['ko-KR', 'ko-KR'],
    ['en-US', 'en-US'],
    ['fr-FR', 'fr-FR'],
    ['ja', 'ja'],
    // Chinese codes are mapped to the project-internal codes.
    ['zh-CN', 'zhCN'],
    ['zh', 'zhCN'],
    ['zh-TW', 'zhTW'],
    ['zh-HK', 'zhTW'],
    ['zh-MO', 'zhTW'],
  ])('converts %p → %p', (input, expected) => {
    expect(convertDetectedLanguage(input)).toBe(expected)
  })
})

describe('toIntlLocale', () => {
  test.each([
    // Special-cased Chinese codes
    ['zhCN', 'zh-CN'],
    ['zhTW', 'zh-TW'],
    // Other BCP-47 codes pass through Intl.getCanonicalLocales
    ['en', 'en'],
    ['fr', 'fr'],
    ['ar', 'ar'],
    ['ko', 'ko'],
    ['', undefined],
    [null, undefined],
    [undefined, undefined],
  ])('maps %p → %p', (input, expected) => {
    expect(toIntlLocale(input as string | null | undefined)).toBe(expected)
  })
})

describe('getDirection', () => {
  test.each([
    // RTL languages
    ['ar', 'rtl'],
    ['ar-SA', 'rtl'],
    ['fa', 'rtl'],
    ['FA', 'rtl'],
    ['he', 'rtl'],
    // LTR default
    ['en', 'ltr'],
    ['en-US', 'ltr'],
    ['zhCN', 'ltr'],
    ['zh-TW', 'ltr'],
    ['fr', 'ltr'],
    ['ru', 'ltr'],
    ['ja', 'ltr'],
    ['ko', 'ltr'],
    ['vi', 'ltr'],
    // Edge cases
    ['', 'ltr'],
    [null, 'ltr'],
    [undefined, 'ltr'],
  ])('maps %p → %p', (input, expected) => {
    expect(getDirection(input as string | null | undefined)).toBe(expected)
  })
})
