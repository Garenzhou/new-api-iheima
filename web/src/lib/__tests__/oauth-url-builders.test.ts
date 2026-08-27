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
import { afterEach, describe, expect, test } from 'vitest'

import {
  buildGitHubOAuthUrl,
  buildGoogleOAuthUrl,
  buildMicrosoftOAuthUrl,
} from '../oauth'

const ORIGINAL_ORIGIN = window.location.origin

afterEach(() => {
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: { ...window.location, origin: ORIGINAL_ORIGIN },
  })
})

function withOrigin(origin: string) {
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: { ...window.location, origin },
  })
}

describe('OAuth URL builders', () => {
  test('builds a Google authorization URL with code flow, scopes, and CSRF state', () => {
    withOrigin('https://gateway.example.com')

    const url = new URL(buildGoogleOAuthUrl('client-123', 'flow-state'))
    expect(url.origin + url.pathname).toBe(
      'https://accounts.google.com/o/oauth2/v2/auth'
    )
    expect(url.searchParams.get('client_id')).toBe('client-123')
    expect(url.searchParams.get('response_type')).toBe('code')
    expect(url.searchParams.get('scope')).toBe('openid email profile')
    expect(url.searchParams.get('state')).toBe('flow-state')
    expect(url.searchParams.get('redirect_uri')).toBe(
      'https://gateway.example.com/oauth/google'
    )
  })

  test('builds a Microsoft authorization URL against the common tenant', () => {
    withOrigin('https://gateway.example.com')

    const url = new URL(
      buildMicrosoftOAuthUrl('client-456', 'flow-state-2')
    )
    expect(url.origin + url.pathname).toBe(
      'https://login.microsoftonline.com/common/oauth2/v2.0/authorize'
    )
    expect(url.searchParams.get('client_id')).toBe('client-456')
    expect(url.searchParams.get('response_type')).toBe('code')
    expect(url.searchParams.get('scope')).toBe(
      'openid email profile User.Read'
    )
    expect(url.searchParams.get('response_mode')).toBe('query')
    expect(url.searchParams.get('state')).toBe('flow-state-2')
    expect(url.searchParams.get('redirect_uri')).toBe(
      'https://gateway.example.com/oauth/microsoft'
    )
  })

  test('uses the current window origin as the provider redirect target', () => {
    withOrigin('https://other.example.com')

    const google = new URL(buildGoogleOAuthUrl('c1', 's1'))
    const microsoft = new URL(buildMicrosoftOAuthUrl('c2', 's2'))

    expect(google.searchParams.get('redirect_uri')).toBe(
      'https://other.example.com/oauth/google'
    )
    expect(microsoft.searchParams.get('redirect_uri')).toBe(
      'https://other.example.com/oauth/microsoft'
    )
  })

  test('keeps the existing GitHub builder contract unchanged', () => {
    const url = new URL(buildGitHubOAuthUrl('gh-client', 'gh-state'))
    expect(url.origin + url.pathname).toBe(
      'https://github.com/login/oauth/authorize'
    )
    expect(url.searchParams.get('client_id')).toBe('gh-client')
    expect(url.searchParams.get('state')).toBe('gh-state')
    expect(url.searchParams.get('scope')).toBe('user:email')
  })
})
