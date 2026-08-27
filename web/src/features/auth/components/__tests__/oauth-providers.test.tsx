import { render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

vi.mock('@/features/auth/hooks/use-oauth-login', () => ({
  useOAuthLogin: () => ({
    isLoading: false,
    githubButtonText: '',
    githubButtonDisabled: false,
    handleGitHubLogin: vi.fn(),
    handleGoogleLogin: vi.fn(),
    handleMicrosoftLogin: vi.fn(),
    handleDiscordLogin: vi.fn(),
    handleOIDCLogin: vi.fn(),
    handleLinuxDOLogin: vi.fn(),
    handleTelegramLogin: vi.fn(),
    handleCustomOAuthLogin: vi.fn(),
    isTelegramDialogOpen: false,
    isTelegramPending: false,
    handleTelegramAuthorization: vi.fn(),
    setIsTelegramDialogOpen: vi.fn(),
  }),
}))

import { OAuthProviders } from '@/features/auth/components/oauth-providers'
import type { SystemStatus } from '@/features/auth/types'

const baseStatus = {
  success: true,
  data: {},
  github_oauth: true,
  google_oauth: true,
  microsoft_oauth: true,
} as unknown as SystemStatus

describe('OAuthProviders', () => {
  test('renders Google and Microsoft buttons when enabled', () => {
    render(<OAuthProviders status={baseStatus} />)
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /continue with microsoft/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /continue with github/i })).toBeTruthy()
  })

  test('omits Google and Microsoft buttons when disabled', () => {
    render(
      <OAuthProviders
        status={
          {
            success: true,
            data: {},
            github_oauth: true,
          } as unknown as SystemStatus
        }
      />
    )
    expect(screen.queryByRole('button', { name: /continue with google/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /continue with microsoft/i })).toBeNull()
    expect(screen.getByRole('button', { name: /continue with github/i })).toBeTruthy()
  })
})
