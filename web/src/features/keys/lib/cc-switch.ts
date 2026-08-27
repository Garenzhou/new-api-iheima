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
export type AppConfig = {
  label: string
  defaultName: string
  endpointSuffix: string
  modelFields: Array<{
    key: string
    labelKey: string
    required: boolean
  }>
}

/**
 * CC Switch app presets. The `app` query parameter values must match the
 * identifiers CC Switch accepts when parsing `ccswitch://v1/import` deep
 * links (see upstream `AppType::from_str`: claude, claude-desktop, codex,
 * gemini, grokbuild, opencode, openclaw, hermes, pi — pi is excluded here
 * because CC Switch refuses provider imports for it).
 *
 * Apps that consume the OpenAI-compatible HTTP API (`/chat/completions`)
 * need the `/v1` path suffix on the endpoint; the official CLI apps
 * (Claude, Gemini) take the bare base URL.
 */
export const APP_CONFIGS = {
  claude: {
    label: 'Claude',
    defaultName: 'atoken-Claude',
    endpointSuffix: '',
    modelFields: [
      { key: 'model', labelKey: 'Primary Model', required: true },
      { key: 'haikuModel', labelKey: 'Haiku Model', required: false },
      { key: 'sonnetModel', labelKey: 'Sonnet Model', required: false },
      { key: 'opusModel', labelKey: 'Opus Model', required: false },
    ],
  },
  codex: {
    label: 'Codex',
    defaultName: 'atoken-Codex',
    endpointSuffix: '/v1',
    modelFields: [{ key: 'model', labelKey: 'Primary Model', required: true }],
  },
  gemini: {
    label: 'Gemini',
    defaultName: 'atoken-Gemini',
    endpointSuffix: '',
    modelFields: [{ key: 'model', labelKey: 'Primary Model', required: true }],
  },
  grokbuild: {
    label: 'Grok Build',
    defaultName: 'atoken-GrokBuild',
    endpointSuffix: '/v1',
    modelFields: [{ key: 'model', labelKey: 'Primary Model', required: true }],
  },
  opencode: {
    label: 'OpenCode',
    defaultName: 'atoken-OpenCode',
    endpointSuffix: '/v1',
    modelFields: [{ key: 'model', labelKey: 'Primary Model', required: true }],
  },
  openclaw: {
    label: 'OpenClaw',
    defaultName: 'atoken-OpenClaw',
    endpointSuffix: '/v1',
    modelFields: [{ key: 'model', labelKey: 'Primary Model', required: true }],
  },
  hermes: {
    label: 'Hermes',
    defaultName: 'atoken-Hermes',
    endpointSuffix: '/v1',
    modelFields: [{ key: 'model', labelKey: 'Primary Model', required: true }],
  },
} as const satisfies Record<string, AppConfig>

export type AppType = keyof typeof APP_CONFIGS

function getServerAddress(): string {
  try {
    const raw = localStorage.getItem('status')
    if (raw) {
      const status = JSON.parse(raw)
      if (status.server_address) return status.server_address
    }
  } catch {
    /* empty */
  }
  return window.location.origin
}

export function buildCCSwitchURL(
  app: string,
  name: string,
  models: Record<string, string>,
  apiKey: string
): string {
  const serverAddress = getServerAddress()
  const appConfig = APP_CONFIGS[app as AppType]
  const endpoint = serverAddress + (appConfig?.endpointSuffix || '')
  const params = new URLSearchParams()
  params.set('resource', 'provider')
  params.set('app', app)
  params.set('name', name)
  params.set('endpoint', endpoint)
  params.set('apiKey', apiKey)
  for (const [k, v] of Object.entries(models)) {
    if (v) params.set(k, v)
  }
  params.set('homepage', serverAddress)
  params.set('enabled', 'true')
  return `ccswitch://v1/import?${params.toString()}`
}
