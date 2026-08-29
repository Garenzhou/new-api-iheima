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
import { Check, Globe } from 'lucide-react'
import { useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  INTERFACE_LANGUAGE_OPTIONS,
  normalizeInterfaceLanguage,
} from '@/i18n/languages'
import { api } from '@/lib/api'
import { ROLE } from '@/lib/roles'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'

// 2-letter code shown next to the globe icon. CJK locales collapse to "中"
// because the switcher is too small to distinguish zhCN / zhTW at a glance
// (the dropdown itself shows the full label).
const SHORT_CODE: Record<string, string> = {
  en: 'EN',
  fr: 'FR',
  ru: 'RU',
  ja: 'JA',
  vi: 'VI',
  zhCN: '中',
  zhTW: '中',
  ar: 'AR',
  ko: 'KO',
}

// Simplified Chinese is reserved for admins. Non-admin users cannot select
// it from the switcher and we also force-switch away from it if it got
// applied through a stored preference before this restriction existed.
const ADMIN_ONLY_LANGUAGE = 'zhCN'

export function NavLanguageSwitcher() {
  const { i18n, t } = useTranslation()
  const user = useAuthStore((s) => s.auth.user)
  const isAdmin = user != null && user.role >= ROLE.ADMIN
  const currentLanguage = normalizeInterfaceLanguage(i18n.language)

  useEffect(() => {
    if (!isAdmin && i18n.language === ADMIN_ONLY_LANGUAGE) {
      void i18n.changeLanguage('en')
    }
  }, [isAdmin, i18n])

  const visibleOptions = isAdmin
    ? INTERFACE_LANGUAGE_OPTIONS
    : INTERFACE_LANGUAGE_OPTIONS.filter(
        (lang) => lang.code !== ADMIN_ONLY_LANGUAGE
      )

  const handleChangeLanguage = useCallback(
    async (code: string) => {
      await i18n.changeLanguage(code)
      if (user) {
        try {
          await api.put('/api/user/self', { language: code })
        } catch {
          // Best-effort persistence; don't block the UI on failure
        }
      }
    },
    [i18n, user]
  )

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        render={
          <Button
            variant='ghost'
            size='sm'
            className='h-9 gap-1.5 rounded-md px-2.5 text-xs font-medium'
          />
        }
      >
        <Globe className='size-[1.05rem]' />
        <span className='font-mono text-[11px] tracking-wide'>
          {SHORT_CODE[currentLanguage] ?? currentLanguage.toUpperCase()}
        </span>
        <span className='sr-only'>{t('Change language')}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        {visibleOptions.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleChangeLanguage(lang.code)}
          >
            {lang.label}
            <Check
              size={14}
              className={cn(
                'ms-auto',
                currentLanguage !== lang.code && 'hidden'
              )}
            />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
