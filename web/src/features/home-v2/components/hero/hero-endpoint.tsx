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
  { id: 'anthropic', label: 'Anthropic API' },
  { id: 'gemini', label: 'Gemini API' },
] as const

const ENDPOINT_BY_PROTOCOL: Record<(typeof PROTOCOLS)[number]['id'], string> = {
  openai: 'https://api.atokenrouter.cn/v1',
  anthropic: 'https://api.atokenrouter.cn/anthropic',
  gemini: 'https://api.atokenrouter.cn/gemini',
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
        'flex w-full max-w-xl items-stretch overflow-hidden rounded-lg border border-black/10 bg-white/80 shadow-[0_1px_2px_rgba(15,15,15,0.04)] backdrop-blur-sm',
        className
      )}
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
        <span className='truncate'>{url}</span>
        <span className='ml-1 inline-block shrink-0 font-semibold text-pink-500'>
          /v1
        </span>
      </code>

      <Button
        size='icon'
        variant='ghost'
        aria-label={copied ? t('Copied') : t('Copy endpoint')}
        onClick={onCopy}
        className='m-1 size-9 rounded-md text-neutral-500 hover:bg-black/5 hover:text-neutral-900'
      >
        {copied ? (
          <Check className='size-4 text-emerald-600' />
        ) : (
          <Copy className='size-4' />
        )}
      </Button>
    </div>
  )
}
