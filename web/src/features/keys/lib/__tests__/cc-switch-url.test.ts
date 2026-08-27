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
import { beforeEach, describe, expect, test } from 'vitest'

import { APP_CONFIGS, buildCCSwitchURL } from '../cc-switch'

const SERVER = 'https://atoken.tech'

function parseParams(url: string): URLSearchParams {
  const ccUrl = new URL(url)
  expect(ccUrl.protocol).toBe('ccswitch:')
  return ccUrl.searchParams
}

beforeEach(() => {
  localStorage.setItem(
    'status',
    JSON.stringify({ server_address: 'https://atoken.tech' })
  )
})

describe('CC Switch import URL builder', () => {
  test('builds a ccswitch provider deep link with the server origin as base', () => {
    const url = buildCCSwitchURL(
      'claude',
      'atoken-Claude',
      { model: 'claude-sonnet-4-5' },
      'sk-test'
    )
    const params = parseParams(url)
    expect(params.get('resource')).toBe('provider')
    expect(params.get('app')).toBe('claude')
    expect(params.get('name')).toBe('atoken-Claude')
    expect(params.get('endpoint')).toBe(SERVER)
    expect(params.get('apiKey')).toBe('sk-test')
    expect(params.get('model')).toBe('claude-sonnet-4-5')
    expect(params.get('homepage')).toBe(SERVER)
    expect(params.get('enabled')).toBe('true')
  })

  test('uses the configured server address from status when present', () => {
    localStorage.setItem(
      'status',
      JSON.stringify({ server_address: 'https://api.example.com' })
    )
    const url = buildCCSwitchURL(
      'claude',
      'atoken-Claude',
      { model: 'claude-sonnet-4-5' },
      'sk-test'
    )
    const params = parseParams(url)
    expect(params.get('endpoint')).toBe('https://api.example.com')
    expect(params.get('homepage')).toBe('https://api.example.com')
  })

  test('appends /v1 only for OpenAI-compatible apps', () => {
    const cases: Array<[string, string]> = [
      ['claude', SERVER],
      ['codex', `${SERVER}/v1`],
      ['gemini', SERVER],
      ['grokbuild', `${SERVER}/v1`],
      ['opencode', `${SERVER}/v1`],
      ['openclaw', `${SERVER}/v1`],
      ['hermes', `${SERVER}/v1`],
    ]
    for (const [app, expectedEndpoint] of cases) {
      const url = buildCCSwitchURL(
        app,
        `atoken-${app}`,
        { model: 'deepseek-v4-flash' },
        'sk-test'
      )
      expect(parseParams(url).get('app')).toBe(app)
      expect(parseParams(url).get('endpoint')).toBe(expectedEndpoint)
    }
  })

  test('omits empty model fields from the URL', () => {
    const url = buildCCSwitchURL(
      'claude',
      'atoken-Claude',
      {
        model: 'claude-sonnet-4-5',
        haikuModel: '',
        sonnetModel: 'claude-sonnet-4-5',
        opusModel: '',
      },
      'sk-test'
    )
    const params = parseParams(url)
    expect(params.get('model')).toBe('claude-sonnet-4-5')
    expect(params.get('sonnetModel')).toBe('claude-sonnet-4-5')
    expect(params.get('haikuModel')).toBeNull()
    expect(params.get('opusModel')).toBeNull()
  })

  test('encodes the api key value into the deep link', () => {
    const url = buildCCSwitchURL(
      'opencode',
      'atoken-OpenCode',
      { model: 'deepseek-v4-flash' },
      'sk-abc 123/+'
    )
    expect(url).toContain('apiKey=sk-abc+123%2F%2B')
  })
})

describe('CC Switch app presets', () => {
  test('every preset has a non-empty atoken default name', () => {
    for (const config of Object.values(APP_CONFIGS)) {
      expect(config.defaultName).toMatch(/^atoken-/)
      expect(config.label).not.toHaveLength(0)
    }
  })

  test('app ids match the CC Switch supported identifiers', () => {
    const supported = new Set([
      'claude',
      'codex',
      'gemini',
      'grokbuild',
      'opencode',
      'openclaw',
      'hermes',
    ])
    for (const app of Object.keys(APP_CONFIGS)) {
      expect(supported.has(app)).toBe(true)
    }
  })
})
