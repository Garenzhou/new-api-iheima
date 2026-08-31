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
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'

import {
  SettingsForm,
  SettingsSwitchContent,
  SettingsSwitchItem,
} from '../components/settings-form-layout'
import { SettingsPageFormActions } from '../components/settings-page-context'
import { SettingsSection } from '../components/settings-section'
import {
  getFreeTopupStatus,
  triggerFreeTopupNow,
  type FreeTopupStatusPayload,
} from '../api'
import { useUpdateOption } from '../hooks/use-update-option'

// Match the backend defaults in setting/operation_setting/free_topup_setting.go
// so the form preview never looks empty in a fresh install.
const DEFAULT_TARGET_QUOTA = 5000
const DEFAULT_THRESHOLD_QUOTA = 5000
const DEFAULT_BATCH_SIZE = 200
const DEFAULT_DAILY_RUN_HOUR = 0
const DEFAULT_DAILY_RUN_MINUTE = 0

const schema = z.object({
  enabled: z.boolean(),
  targetQuota: z.coerce.number().int().min(0),
  thresholdQuota: z.coerce.number().int().min(0),
  batchSize: z.coerce.number().int().min(1),
  dailyRunHour: z.coerce.number().int().min(0).max(23),
  dailyRunMinute: z.coerce.number().int().min(0).max(59),
})

type Values = z.infer<typeof schema>

type FreeTopupSectionProps = {
  defaultValues: {
    enabled: boolean
    targetQuota: number
    thresholdQuota: number
    batchSize: number
    dailyRunHour: number
    dailyRunMinute: number
  }
}

// coalesceFinite picks the fallback only when `value` is not a finite number
// (undefined, null, NaN, +/-Inf). 0 is preserved as a legitimate persisted
// value, so an operator who sets target_quota=0 won't see it silently
// rebound to 5000 on the next page load.
const coalesceFinite = (value: number, fallback: number) =>
  Number.isFinite(value) ? value : fallback

// Compute the next run wall-clock time for the "Next run" preview in the UI.
// Mirrors service.timeUntilNextDailyRun so the operator sees the same
// schedule the backend will use.
function computeNextDailyRun(hour: number, minute: number): Date {
  const now = new Date()
  const next = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    hour,
    minute,
    0,
    0
  )
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1)
  }
  return next
}

export function FreeTopupSection({ defaultValues }: FreeTopupSectionProps) {
  const { t } = useTranslation()
  const updateOption = useUpdateOption()
  const queryClient = useQueryClient()

  // Build the form's default-value map once, then keep the form in sync
  // when the parent's defaultValues reference changes. Single source of
  // truth — no copy-paste between useForm and the reset effect.
  const initialDefaults = useMemo(
    () => ({
      enabled: defaultValues.enabled,
      targetQuota: coalesceFinite(defaultValues.targetQuota, DEFAULT_TARGET_QUOTA),
      thresholdQuota: coalesceFinite(
        defaultValues.thresholdQuota,
        DEFAULT_THRESHOLD_QUOTA
      ),
      batchSize:
        coalesceFinite(defaultValues.batchSize, DEFAULT_BATCH_SIZE) ||
        DEFAULT_BATCH_SIZE,
      dailyRunHour: coalesceFinite(
        defaultValues.dailyRunHour,
        DEFAULT_DAILY_RUN_HOUR
      ),
      dailyRunMinute: coalesceFinite(
        defaultValues.dailyRunMinute,
        DEFAULT_DAILY_RUN_MINUTE
      ),
    }),
    [
      defaultValues.enabled,
      defaultValues.targetQuota,
      defaultValues.thresholdQuota,
      defaultValues.batchSize,
      defaultValues.dailyRunHour,
      defaultValues.dailyRunMinute,
    ]
  )

  const form = useForm<Values>({
    resolver: zodResolver(schema) as unknown as Resolver<Values>,
    defaultValues: initialDefaults,
  })

  useEffect(() => {
    form.reset(initialDefaults)
  }, [initialDefaults, form])

  const { isDirty, isSubmitting } = form.formState
  const enabled = form.watch('enabled')

  // Single fetch on mount, then refetch when the user explicitly clicks
  // "Run now". The previous 15s polling drove unnecessary round trips
  // on a page that admins typically leave open for minutes at a time.
  const statusQuery = useQuery({
    queryKey: ['free-topup', 'status'],
    queryFn: () => getFreeTopupStatus(),
  })
  const serverStatus: FreeTopupStatusPayload | undefined = useMemo(
    () => statusQuery.data?.data,
    [statusQuery.data]
  )

  // Prefer the form's in-progress value so the "Next run" preview updates
  // as the operator types; fall back to the last server-confirmed value.
  const watchedHour = form.watch('dailyRunHour')
  const watchedMinute = form.watch('dailyRunMinute')
  const effectiveHour = Number.isFinite(watchedHour)
    ? watchedHour
    : (serverStatus?.daily_run_hour ?? DEFAULT_DAILY_RUN_HOUR)
  const effectiveMinute = Number.isFinite(watchedMinute)
    ? watchedMinute
    : (serverStatus?.daily_run_minute ?? DEFAULT_DAILY_RUN_MINUTE)
  const nextRun = useMemo(
    () => computeNextDailyRun(effectiveHour, effectiveMinute),
    [effectiveHour, effectiveMinute]
  )

  // The shape of the per-field config update is identical for every field;
  // a table lets the loop below stay declarative.
  const fields: ReadonlyArray<{
    name: keyof Values
    key: string
    getValue: (v: Values) => string
  }> = [
    {
      name: 'enabled',
      key: 'free_topup_setting.enabled',
      getValue: (v) => String(v.enabled),
    },
    {
      name: 'targetQuota',
      key: 'free_topup_setting.target_quota',
      getValue: (v) => String(v.targetQuota),
    },
    {
      name: 'thresholdQuota',
      key: 'free_topup_setting.threshold_quota',
      getValue: (v) => String(v.thresholdQuota),
    },
    {
      name: 'batchSize',
      key: 'free_topup_setting.batch_size',
      getValue: (v) => String(v.batchSize),
    },
    {
      name: 'dailyRunHour',
      key: 'free_topup_setting.daily_run_hour',
      getValue: (v) => String(v.dailyRunHour),
    },
    {
      name: 'dailyRunMinute',
      key: 'free_topup_setting.daily_run_minute',
      getValue: (v) => String(v.dailyRunMinute),
    },
  ]

  async function onSubmit(values: Values) {
    const updates = fields
      .filter((f) => values[f.name] !== initialDefaults[f.name])
      .map((f) => ({ key: f.key, value: f.getValue(values) }))
    if (updates.length === 0) {
      toast.info(t('No changes to save'))
      return
    }
    // Backend accepts each key in a single PUT, so fire them concurrently
    // instead of paying RTT * N.
    await Promise.all(updates.map((u) => updateOption.mutateAsync(u)))
    form.reset(values)
  }

  async function handleRunNow() {
    try {
      const res = await triggerFreeTopupNow()
      if (res.success) {
        toast.success(res.message ?? t('Free topup task triggered'))
        queryClient.invalidateQueries({ queryKey: ['free-topup', 'status'] })
      } else {
        toast.error(res.message ?? t('Failed to trigger free topup'))
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t('Failed to trigger free topup')
      )
    }
  }

  return (
    <SettingsSection title={t('Daily Free Topup')}>
      <Form {...form}>
        <SettingsForm onSubmit={form.handleSubmit(onSubmit)}>
          <SettingsPageFormActions
            onSave={form.handleSubmit(onSubmit)}
            isSaving={updateOption.isPending || isSubmitting}
            isSaveDisabled={!isDirty}
            saveLabel={t('Save free topup settings')}
          />
          <FormField
            control={form.control}
            name='enabled'
            render={({ field }) => (
              <SettingsSwitchItem>
                <SettingsSwitchContent>
                  <FormLabel>{t('Enable daily free topup')}</FormLabel>
                  <FormDescription>
                    {t(
                      'Top up every enabled common user to the target quota once per day when their balance falls below the threshold. Root and admin accounts are skipped.'
                    )}
                  </FormDescription>
                </SettingsSwitchContent>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={updateOption.isPending || isSubmitting}
                  />
                </FormControl>
              </SettingsSwitchItem>
            )}
          />

          {enabled && (
            <>
              <div className='grid gap-6 sm:grid-cols-2'>
                <FormField
                  control={form.control}
                  name='targetQuota'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('Target quota (units)')}</FormLabel>
                      <FormControl>
                        <Input
                          type='number'
                          min={0}
                          placeholder={String(DEFAULT_TARGET_QUOTA)}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        {t(
                          'Top each user up to this many quota units. At the default QuotaPerUnit (500000), 5000 units ≈ $0.01 ≈ 200 calls of a 0.00005/request model.'
                        )}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='thresholdQuota'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('Threshold quota (units)')}</FormLabel>
                      <FormControl>
                        <Input
                          type='number'
                          min={0}
                          placeholder={String(DEFAULT_THRESHOLD_QUOTA)}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        {t(
                          'Only top up users whose current quota is below this value.'
                        )}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='batchSize'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('Batch size')}</FormLabel>
                      <FormControl>
                        <Input
                          type='number'
                          min={1}
                          placeholder={String(DEFAULT_BATCH_SIZE)}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        {t(
                          'How many low-balance users to scan and credit per pass.'
                        )}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className='grid grid-cols-2 gap-3'>
                  <FormField
                    control={form.control}
                    name='dailyRunHour'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('Daily run hour')}</FormLabel>
                        <FormControl>
                          <Input
                            type='number'
                            min={0}
                            max={23}
                            placeholder={String(DEFAULT_DAILY_RUN_HOUR)}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          {t('Hour of day in server local time, 0-23.')}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name='dailyRunMinute'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('Daily run minute')}</FormLabel>
                        <FormControl>
                          <Input
                            type='number'
                            min={0}
                            max={59}
                            placeholder={String(DEFAULT_DAILY_RUN_MINUTE)}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          {t('Minute of the hour, 0-59.')}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className='rounded-md border border-dashed p-4 text-sm'>
                <div className='mb-2 flex items-center justify-between gap-2'>
                  <div className='font-medium'>{t('Schedule')}</div>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={handleRunNow}
                    disabled={statusQuery.isFetching}
                  >
                    {t('Run now')}
                  </Button>
                </div>
                <div className='grid gap-1 text-muted-foreground'>
                  <div>
                    {t('Next run')}: {nextRun.toLocaleString()}
                  </div>
                  <div>
                    {t('Last run')}:{' '}
                    {serverStatus?.last_stats?.finished_at
                      ? new Date(
                          serverStatus.last_stats.finished_at * 1000
                        ).toLocaleString()
                      : t('No runs yet.')}
                  </div>
                  {serverStatus?.last_stats ? (
                    <>
                      <div>
                        {t('Users scanned')}:{' '}
                        {serverStatus.last_stats.users_scanned}
                      </div>
                      <div>
                        {t('Users topped up')}:{' '}
                        {serverStatus.last_stats.users_topped_up}
                      </div>
                      <div>
                        {t('Total quota granted')}:{' '}
                        {serverStatus.last_stats.total_granted}
                      </div>
                      {serverStatus.last_stats.err ? (
                        <div className='text-destructive'>
                          {t('Error')}: {serverStatus.last_stats.err}
                        </div>
                      ) : null}
                    </>
                  ) : null}
                </div>
              </div>
            </>
          )}
        </SettingsForm>
      </Form>
    </SettingsSection>
  )
}
