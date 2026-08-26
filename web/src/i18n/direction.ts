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
// Map an i18n language code to the text direction that the document should
// use. RTL languages auto-flip the layout (and the dir cookie/state) when
// the user picks them. LTR is the safe default for unknown inputs.
const RTL_LANGS = new Set(['ar', 'fa', 'he'])

export type TextDirection = 'ltr' | 'rtl'

export function getDirection(lang?: string | null): TextDirection {
  const base = (lang ?? '').toLowerCase().split('-')[0]
  return RTL_LANGS.has(base) ? 'rtl' : 'ltr'
}
