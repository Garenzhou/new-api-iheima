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
import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const PROTOCOLS = [
  { id: 'openai', label: 'OpenAI API' },
  { id: 'openai-chat', label: 'OpenAI Chat API' },
  { id: 'anthropic', label: 'Anthropic API' },
  { id: 'gemini', label: 'Gemini API' },
] as const

// Full base URLs (server + path) per protocol, so the chip shows the
// distinctive path tail for each provider at a glance. Paths mirror the
// project's canonical request routes (see
// src/features/models/constants.ts: anthropic.path, gemini.path).
//   - OpenAI HTTP API:  /v1
//   - OpenAI Chat:      /v1/chat/completions
//   - Anthropic:        /v1/messages
//   - Gemini:           /v1beta/models (the {model}:generateContent
//                       segment is appended per-request by the caller,
//                       so the bare prefix is the most useful constant
//                       to copy here)
const ENDPOINT_BY_PROTOCOL: Record<(typeof PROTOCOLS)[number]['id'], string> = {
  openai: 'https://atoken.tech/v1',
  'openai-chat': 'https://atoken.tech/v1/chat/completions',
  anthropic: 'https://atoken.tech/v1/messages',
  gemini: 'https://atoken.tech/v1beta/models',
}

interface HeroEndpointProps {
  className?: string
}

export function HeroEndpoint({ className }: HeroEndpointProps) {
  const { t } = useTranslation()
  const [protocol, setProtocol] = useState<(typeof PROTOCOLS)[number]['id']>(
    'openai'
  )
  const [copied, setCopied] = useState(false)
  const url = ENDPOINT_BY_PROTOCOL[protocol]
  const protocolLabel =
    PROTOCOLS.find((p) => p.id === protocol)?.label ?? PROTOCOLS[0].label

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div
      className={cn(
        'tr-endpoint tr-hero-part flex w-full max-w-xl items-stretch overflow-hidden rounded-lg border border-black/10 bg-white/80 backdrop-blur-sm',
        className
      )}
      style={{ '--hero-delay': '500ms' }}
    >
      <div className='relative flex shrink-0 items-center border-r border-black/10'>
        <select
          aria-label={t('API protocol')}
          value={protocol}
          onChange={(e) =>
            setProtocol(e.target.value as (typeof PROTOCOLS)[number]['id'])
          }
          className='h-full cursor-pointer appearance-none bg-transparent py-2.5 pr-7 pl-3 text-sm font-medium text-neutral-700 outline-none'
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6' fill='none'><path d='M1 1l4 4 4-4' stroke='%23555' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/></svg>\")",
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 0.6rem center',
            backgroundSize: '10px 6px',
          }}
        >
          {PROTOCOLS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <code className='flex flex-1 items-center truncate px-3 py-2.5 font-mono text-[13px] text-neutral-800'>
        {/* "Endpoint" prefix nudges new users who might otherwise wonder
         * what this URL is for. Muted so it doesn't compete with the URL. */}
        <span className='mr-1.5 shrink-0 font-sans text-[11px] font-medium tracking-wide text-neutral-400 uppercase'>
          {t('Endpoint')}
        </span>
        <span className='truncate'>{url}</span>
      </code>

      <Button
        size='icon'
        variant='ghost'
        aria-label={copied ? t('Copied') : t('Copy endpoint')}
        onClick={onCopy}
        className='m-1 size-9 rounded-md text-neutral-500 hover:bg-black/5 hover:text-neutral-900'
      >
        {copied ? (
          <Check className='tr-copy-check size-4 text-emerald-600' />
        ) : (
          <Copy className='size-4' />
        )}
      </Button>
    </div>
  )
}
