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
import { act, render, waitFor } from '@testing-library/react'
import i18n from 'i18next'
import { useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'

import { DirectionProvider, useDirection } from '../direction-provider'

const DIRECTION_COOKIE = 'dir'

function readDirCookie(): string | undefined {
  if (typeof document === 'undefined') return undefined
  const match = document.cookie.split('; ').find((c) => c.startsWith(`${DIRECTION_COOKIE}=`))
  return match ? decodeURIComponent(match.split('=').slice(1).join('=')) : undefined
}

function clearDirCookie(): void {
  if (typeof document === 'undefined') return
  document.cookie = `${DIRECTION_COOKIE}=; path=/; max-age=0`
}

let capturedSetDir: ((d: 'ltr' | 'rtl') => void) | null = null

function DirectionProbe({ onDir }: { onDir?: (dir: string) => void }) {
  const { dir, setDir } = useDirection()
  useEffect(() => {
    onDir?.(dir)
  }, [dir, onDir])
  // Expose the setter so tests can drive it. The module-scoped holder is
  // reset between tests via `resetProbeHandles()`.
  useEffect(() => {
    capturedSetDir = setDir
    return () => {
      capturedSetDir = null
    }
  }, [setDir])
  return <div data-testid='probe' data-dir={dir} />
}

function resetProbeHandles(): void {
  capturedSetDir = null
}

describe('DirectionProvider', () => {
  beforeEach(() => {
    clearDirCookie()
    document.documentElement.removeAttribute('dir')
    i18n.language = 'en'
    resetProbeHandles()
  })

  afterEach(() => {
    clearDirCookie()
    document.documentElement.removeAttribute('dir')
    i18n.language = 'en'
    resetProbeHandles()
  })

  test('initializes from the dir cookie when present', async () => {
    document.cookie = `${DIRECTION_COOKIE}=rtl; path=/; max-age=3600`
    const { getByTestId } = render(
      <DirectionProvider>
        <DirectionProbe />
      </DirectionProvider>,
    )
    await waitFor(() => {
      expect(getByTestId('probe').getAttribute('data-dir')).toBe('rtl')
    })
  })

  test('defaults to ltr when no cookie is set and writes <html dir>', async () => {
    const { getByTestId } = render(
      <DirectionProvider>
        <DirectionProbe />
      </DirectionProvider>,
    )
    await waitFor(() => {
      expect(getByTestId('probe').getAttribute('data-dir')).toBe('ltr')
    })
    // The effect that mirrors dir to <html> runs after the state effect;
    // the auto-follow effect may also have flipped it based on the
    // initial i18n.language ('en' → ltr), so the attribute should be 'ltr'.
    expect(document.documentElement.getAttribute('dir')).toBe('ltr')
  })

  test('auto-flips to rtl when i18next changes language to Arabic', async () => {
    const { getByTestId } = render(
      <DirectionProvider>
        <DirectionProbe />
      </DirectionProvider>,
    )
    await waitFor(() => {
      expect(getByTestId('probe').getAttribute('data-dir')).toBe('ltr')
    })

    await act(async () => {
      i18n.emit('languageChanged', 'ar')
    })

    await waitFor(() => {
      expect(getByTestId('probe').getAttribute('data-dir')).toBe('rtl')
    })
    expect(readDirCookie()).toBe('rtl')
    expect(document.documentElement.getAttribute('dir')).toBe('rtl')
  })

  test('auto-flips back to ltr when i18next changes back to English', async () => {
    // Start in Arabic.
    const { getByTestId } = render(
      <DirectionProvider>
        <DirectionProbe />
      </DirectionProvider>,
    )
    await act(async () => {
      i18n.emit('languageChanged', 'ar')
    })
    await waitFor(() => {
      expect(getByTestId('probe').getAttribute('data-dir')).toBe('rtl')
    })

    // Switch back to English.
    await act(async () => {
      i18n.emit('languageChanged', 'en')
    })
    await waitFor(() => {
      expect(getByTestId('probe').getAttribute('data-dir')).toBe('ltr')
    })
    expect(readDirCookie()).toBe('ltr')
  })

  test('manual setDir persists via cookie', async () => {
    const { getByTestId } = render(
      <DirectionProvider>
        <DirectionProbe />
      </DirectionProvider>,
    )
    await waitFor(() => {
      expect(getByTestId('probe').getAttribute('data-dir')).toBe('ltr')
    })

    await act(async () => {
      capturedSetDir?.('rtl')
    })
    await waitFor(() => {
      expect(getByTestId('probe').getAttribute('data-dir')).toBe('rtl')
    })
    expect(readDirCookie()).toBe('rtl')
  })
})
