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
import { DirectionProvider as BaseDirectionProvider } from '@base-ui/react/direction-provider'
import { createContext, useContext, useEffect, useRef, useState } from 'react'

import i18n from '@/i18n/config'
import { getDirection } from '@/i18n/direction'
import { getCookie, setCookie, removeCookie } from '@/lib/cookies'

export type Direction = 'ltr' | 'rtl'

const DEFAULT_DIRECTION = 'ltr'
const DIRECTION_COOKIE_NAME = 'dir'
const DIRECTION_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

type DirectionContextType = {
  defaultDir: Direction
  dir: Direction
  setDir: (dir: Direction) => void
  resetDir: () => void
}

const DirectionContext = createContext<DirectionContextType | null>(null)

export function DirectionProvider({ children }: { children: React.ReactNode }) {
  const [dir, _setDir] = useState<Direction>(
    () => (getCookie(DIRECTION_COOKIE_NAME) as Direction) || DEFAULT_DIRECTION
  )

  useEffect(() => {
    const htmlElement = document.documentElement
    htmlElement.setAttribute('dir', dir)
  }, [dir])

  // Auto-follow the active i18n language. On every `languageChanged`
  // event, compute the language's natural direction and apply it (the
  // effect above will write <html dir> and setDir persists the cookie).
  // The manual `dir` cookie override is preserved across page reloads
  // and across same-language navigation: the auto-follow only fires on
  // an explicit `languageChanged` event, not on mount, so a manual LTR
  // choice for Arabic survives a refresh.
  const dirRef = useRef(dir)
  useEffect(() => {
    dirRef.current = dir
  }, [dir])
  useEffect(() => {
    const handler = (lng: string) => {
      const next = getDirection(lng)
      if (next !== dirRef.current) {
        setDir(next)
      }
    }
    i18n.on('languageChanged', handler)
    return () => {
      i18n.off('languageChanged', handler)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setDir = (dir: Direction) => {
    _setDir(dir)
    setCookie(DIRECTION_COOKIE_NAME, dir, DIRECTION_COOKIE_MAX_AGE)
  }

  const resetDir = () => {
    _setDir(DEFAULT_DIRECTION)
    removeCookie(DIRECTION_COOKIE_NAME)
  }

  return (
    <DirectionContext
      value={{
        defaultDir: DEFAULT_DIRECTION,
        dir,
        setDir,
        resetDir,
      }}
    >
      <BaseDirectionProvider direction={dir}>{children}</BaseDirectionProvider>
    </DirectionContext>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDirection() {
  const context = useContext(DirectionContext)
  if (!context) {
    throw new Error('useDirection must be used within a DirectionProvider')
  }
  return context
}
