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
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  type LucideIcon,
  Sparkles,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Dialog } from '@/components/dialog'
import { NotificationPopover } from '@/components/notification-popover'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useNotifications } from '@/hooks/use-notifications'
import { useSystemConfig } from '@/hooks/use-system-config'
import { useTopNavLinks } from '@/hooks/use-top-nav-links'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'

import { defaultTopNavLinks } from '../config/top-nav.config'
import type { TopNavLink } from '../types'
import { NavLanguageSwitcher } from './nav-language-switcher'

const AUTH_PROMPT_SECONDS = 5

type AuthPromptTarget = {
  title: string
  href: string
}

type DropdownItem = {
  label: string
  to: string
  icon: LucideIcon
  hint: string
}

type NavLinkSpec = {
  label: string
  to: string
  // Optional dropdown shown on hover. When set, the link becomes a button.
  dropdown?: DropdownItem[]
}

// Static fallback used only when the backend returns no dynamic nav.
// Mirrors the openstarry visual order: Home / Models / Integrate (with
// dropdown) / Rankings / About.
const FALLBACK_LINKS: NavLinkSpec[] = [
  { label: 'Home', to: '/' },
  { label: 'Models', to: '/pricing' },
  {
    label: 'Integrate',
    to: '/about',
    dropdown: [
      {
        label: 'Quickstart',
        to: '/about',
        icon: ArrowRight,
        hint: '3-minute API integration',
      },
      {
        label: 'API Reference',
        to: '/about',
        icon: BookOpen,
        hint: 'OpenAI-compatible endpoints',
      },
    ],
  },
  { label: 'Rankings', to: '/rankings' },
  { label: 'About', to: '/about' },
]

export interface PublicHeaderProps {
  navLinks?: TopNavLink[]
  mobileLinks?: TopNavLink[]
  navContent?: React.ReactNode
  showThemeSwitch?: boolean
  showLanguageSwitcher?: boolean
  logo?: React.ReactNode
  siteName?: string
  homeUrl?: string
  leftContent?: React.ReactNode
  rightContent?: React.ReactNode
  showNavigation?: boolean
  showAuthButtons?: boolean
  showNotifications?: boolean
  className?: string
}

export function PublicHeader(props: PublicHeaderProps) {
  const {
    navLinks = defaultTopNavLinks,
    showThemeSwitch = true,
    showLanguageSwitcher = true,
    logo: customLogo,
    homeUrl = '/',
    showAuthButtons = true,
    showNotifications = true,
  } = props

  const { t } = useTranslation()
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [authPromptTarget, setAuthPromptTarget] =
    useState<AuthPromptTarget | null>(null)
  const [authPromptSecondsLeft, setAuthPromptSecondsLeft] =
    useState(AUTH_PROMPT_SECONDS)
  const { auth } = useAuthStore()
  const { loading } = useSystemConfig()
  const dynamicLinks = useTopNavLinks()
  const notifications = useNotifications()
  const routerState = useRouterState()
  const pathname = routerState.location.pathname

  const user = auth.user
  const isAuthenticated = !!user

  // Dynamic backend links win; otherwise the consumer-supplied list; otherwise
  // the openstarry-style fallback so a misconfigured instance still renders
  // a sensible bar.
  const useDynamic = dynamicLinks.length > 0
  const useFallback = !useDynamic && navLinks.length === 0
  const activeDynamicLinks = useDynamic ? dynamicLinks : navLinks

  // The Console link is rendered as a separate right-side entry (openstarry
  // visual: outlined button as the first item in the right cluster), not
  // as a center nav link. We split by href so the same link coming from
  // the backend (HeaderNavModules.console) or the static fallback can be
  // lifted without changing its source.
  const CONSOLE_HREF = '/dashboard'
  const consoleLink = activeDynamicLinks.find(
    (link) => link.href === CONSOLE_HREF
  )
  const centerLinks = activeDynamicLinks.filter(
    (link) => link.href !== CONSOLE_HREF
  )

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  useEffect(() => {
    if (!authPromptTarget) return

    const intervalId = window.setInterval(() => {
      setAuthPromptSecondsLeft((seconds) => Math.max(seconds - 1, 0))
    }, 1000)

    const timeoutId = window.setTimeout(() => {
      const redirect = authPromptTarget.href
      setAuthPromptTarget(null)
      navigate({ to: '/sign-in', search: { redirect } })
    }, AUTH_PROMPT_SECONDS * 1000)

    return () => {
      window.clearInterval(intervalId)
      window.clearTimeout(timeoutId)
    }
  }, [authPromptTarget, navigate])

  const closeAuthPrompt = useCallback(() => {
    setAuthPromptTarget(null)
    setAuthPromptSecondsLeft(AUTH_PROMPT_SECONDS)
  }, [])

  const navigateToSignIn = useCallback(() => {
    const redirect = authPromptTarget?.href || '/'
    setAuthPromptTarget(null)
    navigate({ to: '/sign-in', search: { redirect } })
  }, [authPromptTarget?.href, navigate])

  const handleNavLinkClick = useCallback(
    (
      event: React.MouseEvent<HTMLAnchorElement>,
      link: TopNavLink,
      closeMobile = false
    ) => {
      if (link.disabled) {
        event.preventDefault()
        return
      }

      if (link.requiresAuth) {
        event.preventDefault()
        if (closeMobile) {
          setMobileOpen(false)
        }
        setAuthPromptSecondsLeft(AUTH_PROMPT_SECONDS)
        setAuthPromptTarget({
          title: t(link.title),
          href: link.href,
        })
        return
      }

      if (closeMobile) {
        setMobileOpen(false)
      }
    },
    [t]
  )

  const renderLogoBlock = (args: { loading: boolean; customLogo?: React.ReactNode }) => {
    const { loading, customLogo } = args
    if (loading) return <Skeleton className='size-7 rounded-lg' />
    if (customLogo) return customLogo
    return (
      <div className='flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow-[0_2px_8px_rgba(99,102,241,0.35)]'>
        <Sparkles className='size-4 text-white' strokeWidth={2.5} />
      </div>
    )
  }

  const renderAuthButton = () => {
    if (loading) return <Skeleton className='h-8 w-20 rounded-lg' />
    if (isAuthenticated) {
      return (
        <span className='inline-flex items-center rounded-md bg-slate-900 px-3 py-1.5 font-mono text-[11px] font-semibold tracking-wide text-white dark:bg-white dark:text-slate-900'>
          {t('Signed in')}
        </span>
      )
    }
    return (
      <Button
        size='sm'
        className='h-8 rounded-lg px-3.5 text-xs font-medium'
        render={<Link to='/sign-in' />}
      >
        {t('Sign in')}
      </Button>
    )
  }

  const renderDynamicLink = (link: TopNavLink) => {
    const isActive = pathname === link.href
    const baseClassName = cn(
      'flex h-15 items-center whitespace-nowrap px-5 text-[14px] font-normal transition-colors duration-150',
      isActive
        ? 'text-slate-900 dark:text-slate-50'
        : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-50',
      link.disabled && 'pointer-events-none opacity-50'
    )
    if (link.external) {
      return (
        <li key={link.href}>
          <a
            href={link.href}
            target='_blank'
            rel='noopener noreferrer'
            aria-disabled={link.disabled}
            tabIndex={link.disabled ? -1 : undefined}
            onClick={(event) => handleNavLinkClick(event, link)}
            className={baseClassName}
          >
            {t(link.title)}
          </a>
        </li>
      )
    }
    return (
      <li key={link.href}>
        <Link
          to={link.href}
          disabled={link.disabled}
          onClick={(event) => handleNavLinkClick(event, link)}
          className={baseClassName}
        >
          {t(link.title)}
        </Link>
      </li>
    )
  }

  // Right-side Console entry. The link is always rendered when the backend
  // exposes it, regardless of auth state — the dashboard route itself
  // redirects unauthenticated visitors to /sign-in.
  const renderConsoleButton = (link: TopNavLink) => {
    if (link.external) {
      return (
        <a
          key={`c-${link.href}`}
          href={link.href}
          target='_blank'
          rel='noopener noreferrer'
          aria-disabled={link.disabled}
          tabIndex={link.disabled ? -1 : undefined}
          onClick={(event) => handleNavLinkClick(event, link)}
          className={cn(
            'inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-700 transition-colors duration-150',
            'hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900',
            'dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-50',
            link.disabled && 'pointer-events-none opacity-50'
          )}
        >
          {t(link.title)}
        </a>
      )
    }
    return (
      <Link
        key={`c-${link.href}`}
        to={link.href}
        disabled={link.disabled}
        onClick={(event) => handleNavLinkClick(event, link)}
        className={cn(
          'inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-700 transition-colors duration-150',
          'hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900',
          'dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-50',
          link.disabled && 'pointer-events-none opacity-50'
        )}
      >
        {t(link.title)}
      </Link>
    )
  }

  const renderFallbackLink = (link: NavLinkSpec) => {
    if (link.dropdown) {
      return (
        <li
          key={link.label}
          className='group/nav relative'
        >
          <button
            type='button'
            className='flex h-15 items-center gap-1 px-5 text-[14px] font-normal text-slate-600 transition-colors duration-150 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-50'
          >
            <span>{t(link.label)}</span>
            <ChevronDown className='size-3 opacity-55 transition-transform duration-200 group-hover/nav:rotate-180' />
          </button>
          <div
            className={cn(
              'absolute top-[calc(100%+4px)] left-0 z-50',
              'min-w-64 overflow-hidden rounded-b-[10px] border border-slate-200/80 border-t-2 border-t-indigo-600 bg-white shadow-[0_8px_32px_rgba(15,23,42,0.10),0_2px_8px_rgba(15,23,42,0.05)]',
              'invisible opacity-0 -translate-y-2 transition-all duration-200',
              'group-hover/nav:visible group-hover/nav:opacity-100 group-hover/nav:translate-y-0',
              'dark:border-slate-800 dark:bg-slate-900'
            )}
          >
            {link.dropdown.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  className='flex items-start gap-3 border-b border-slate-200/60 px-4 py-3 text-slate-700 transition-[background,padding-left,color] duration-150 last:border-b-0 hover:bg-indigo-50 hover:pl-5 hover:text-indigo-700 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300'
                >
                  <Icon className='mt-0.5 size-4 shrink-0 text-slate-400 transition-colors duration-150 group-hover/nav:text-indigo-600 dark:text-slate-500' />
                  <span>
                    <strong className='mb-0.5 block text-[13.5px] font-semibold text-slate-900 dark:text-slate-50'>
                      {t(item.label)}
                    </strong>
                    <span className='block text-[11.5px] leading-snug text-slate-500 dark:text-slate-400'>
                      {t(item.hint)}
                    </span>
                  </span>
                </Link>
              )
            })}
          </div>
        </li>
      )
    }
    return (
      <li key={link.label}>
        <Link
          to={link.to}
          className='flex h-15 items-center px-5 text-[14px] font-normal text-slate-600 transition-colors duration-150 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-50'
        >
          {t(link.label)}
        </Link>
      </li>
    )
  }

  const renderCenterLinks = () => {
    if (props.leftContent) {
      return props.leftContent
    }
    if (useFallback) {
      return (
        <ul className='hidden flex-1 items-center md:flex'>
          {FALLBACK_LINKS.map(renderFallbackLink)}
        </ul>
      )
    }
    return (
      <ul className='hidden flex-1 items-center md:flex'>
        {centerLinks.map(renderDynamicLink)}
      </ul>
    )
  }

  return (
    <>
      <nav
        className={cn(
          // Mirrors openstarry's .nav: fixed top, full width, hairline border on scroll.
          'fixed inset-x-0 top-0 z-50',
          'flex h-15 items-center px-4 md:px-10',
          'bg-white/85 backdrop-blur-xl',
          'border-b border-transparent transition-[border-color,box-shadow] duration-300',
          'dark:bg-slate-950/80',
          scrolled &&
            'border-slate-200/80 shadow-[0_2px_16px_rgba(15,23,42,0.07)] dark:border-slate-800/80',
          props.className
        )}
      >
        {/* Logo (openstarry visual: indigo gradient square + Sparkles, with the
            branded "AToken Router" wordmark). system-config is honored when the
            host explicitly opts in via the `logo` or `siteName` props. */}
        <Link
          to={homeUrl}
          aria-label={t('AToken Router home')}
          className='mr-6 flex shrink-0 items-center gap-2.5 md:mr-10'
        >
          {renderLogoBlock({ loading, customLogo })}
          {loading ? (
            <Skeleton className='h-4 w-16' />
          ) : (
            <span className='text-[17px] font-bold leading-none tracking-tight text-slate-900 dark:text-slate-50'>
              AToken{' '}
              <em className='not-italic font-bold text-indigo-600 dark:text-indigo-400'>
                Router
              </em>
            </span>
          )}
        </Link>

        {/* Center links (desktop) */}
        {renderCenterLinks()}

        {/* Right side */}
        <div className='ml-auto flex shrink-0 items-center gap-1'>
          {props.rightContent}
          {/* Console entry: openstarry-style outlined button as the first
              item in the right cluster. Only shown on desktop — on mobile
              the link lives inside the hamburger menu. */}
          {consoleLink && (
            <div className='hidden md:inline-flex'>
              {renderConsoleButton(consoleLink)}
            </div>
          )}
          {showLanguageSwitcher && <NavLanguageSwitcher />}
          {showThemeSwitch && <ThemeSwitch />}
          {showNotifications && (
            <NotificationPopover
              open={notifications.popoverOpen}
              onOpenChange={notifications.setPopoverOpen}
              unreadCount={notifications.unreadCount}
              activeTab={notifications.activeTab}
              onTabChange={notifications.setActiveTab}
              notice={notifications.notice}
              announcements={notifications.announcements}
              loading={notifications.loading}
            />
          )}

          {showAuthButtons && (
            <>
              <div className='bg-border/40 mx-1 hidden h-4 w-px sm:block' />
              {renderAuthButton()}
            </>
          )}

          {/* Mobile menu toggle */}
          <button
            type='button'
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={t('Toggle menu')}
            className='ml-1 inline-flex size-9 items-center justify-center rounded-md border border-slate-200 text-slate-700 transition-colors hover:bg-slate-100 md:hidden dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800'
          >
            <span className='relative block size-4'>
              <span
                className={cn(
                  'absolute left-0 top-1 block h-0.5 w-4 bg-current transition-transform duration-200',
                  mobileOpen && 'translate-y-1.5 rotate-45'
                )}
              />
              <span
                className={cn(
                  'absolute left-0 top-1/2 block h-0.5 w-4 -translate-y-1/2 bg-current transition-opacity duration-200',
                  mobileOpen && 'opacity-0'
                )}
              />
              <span
                className={cn(
                  'absolute bottom-1 left-0 block h-0.5 w-4 bg-current transition-transform duration-200',
                  mobileOpen && '-translate-y-1.5 -rotate-45'
                )}
              />
            </span>
          </button>
        </div>
      </nav>

      {/* Mobile menu (only when no custom navContent is provided) */}
      {mobileOpen && !props.navContent && (
        <div className='fixed inset-x-0 top-15 z-40 max-h-[calc(100svh-60px)] overflow-y-auto border-b border-slate-200/80 bg-white/95 backdrop-blur-xl md:hidden dark:border-slate-800 dark:bg-slate-950/95'>
          <ul className='flex flex-col p-2'>
            {useFallback
              ? FALLBACK_LINKS.map((link) => (
                  <li key={`m-${link.label}`}>
                    {link.dropdown ? (
                      <details className='group/m'>
                        <summary className='flex cursor-pointer list-none items-center justify-between rounded-md px-4 py-3 text-[15px] text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'>
                          <span>{t(link.label)}</span>
                          <ChevronDown className='size-4 transition-transform group-open/m:rotate-180' />
                        </summary>
                        <ul className='pb-2 pl-2'>
                          {link.dropdown.map((item) => {
                            const Icon = item.icon
                            return (
                              <li key={`m-${link.label}-${item.label}`}>
                                <Link
                                  to={item.to}
                                  onClick={() => setMobileOpen(false)}
                                  className='flex items-start gap-3 rounded-md px-4 py-2.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                                >
                                  <Icon className='mt-0.5 size-4 shrink-0 text-slate-400' />
                                  <span>
                                    <strong className='block text-[13.5px] font-semibold text-slate-800 dark:text-slate-100'>
                                      {t(item.label)}
                                    </strong>
                                    <span className='block text-[11.5px] text-slate-500 dark:text-slate-400'>
                                      {t(item.hint)}
                                    </span>
                                  </span>
                                </Link>
                              </li>
                            )
                          })}
                        </ul>
                      </details>
                    ) : (
                      <Link
                        to={link.to}
                        onClick={() => setMobileOpen(false)}
                        className='block rounded-md px-4 py-3 text-[15px] text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
                      >
                        {t(link.label)}
                      </Link>
                    )}
                  </li>
                ))
              : [...centerLinks, ...(consoleLink ? [consoleLink] : [])].map(
                  (link) => {
                  const isActive = pathname === link.href
                  const linkClassName = cn(
                    'block rounded-md px-4 py-3 text-[15px] transition-colors',
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300'
                      : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800',
                    link.disabled && 'pointer-events-none opacity-50'
                  )
                  if (link.external) {
                    return (
                      <li key={`m-${link.href}`}>
                        <a
                          href={link.href}
                          target='_blank'
                          rel='noopener noreferrer'
                          onClick={(event) =>
                            handleNavLinkClick(event, link, true)
                          }
                          className={linkClassName}
                        >
                          {t(link.title)}
                        </a>
                      </li>
                    )
                  }
                  return (
                    <li key={`m-${link.href}`}>
                      <Link
                        to={link.href}
                        disabled={link.disabled}
                        onClick={(event) =>
                          handleNavLinkClick(event, link, true)
                        }
                        className={linkClassName}
                      >
                        {t(link.title)}
                      </Link>
                    </li>
                  )
                  }
                )}
          </ul>
        </div>
      )}

      <Dialog
        open={!!authPromptTarget}
        onOpenChange={(open) => {
          if (!open) {
            closeAuthPrompt()
          }
        }}
        title={t('Sign in required')}
        description={t('Please sign in to view {{module}}.', {
          module: authPromptTarget?.title || '',
        })}
        contentClassName='sm:max-w-md'
        contentHeight='auto'
        footer={
          <>
            <Button variant='outline' onClick={closeAuthPrompt}>
              {t('Cancel')}
            </Button>
            <Button onClick={navigateToSignIn}>{t('Sign in now')}</Button>
          </>
        }
      >
        <div className='bg-muted/40 text-muted-foreground rounded-lg px-3 py-2 text-sm'>
          {t('Redirecting to sign in in {{seconds}} seconds.', {
            seconds: authPromptSecondsLeft,
          })}
        </div>
      </Dialog>
    </>
  )
}
