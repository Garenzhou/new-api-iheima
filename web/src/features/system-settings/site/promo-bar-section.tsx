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
import { useEffect } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'

import {
  SettingsForm,
  SettingsSwitchContent,
  SettingsSwitchItem,
} from '../components/settings-form-layout'
import { SettingsPageFormActions } from '../components/settings-page-context'
import { SettingsSection } from '../components/settings-section'
import { useUpdateOption } from '../hooks/use-update-option'

// Match the backend default in setting/operation_setting/promo_setting.go so
// the form preview never looks empty in a fresh install.
const DEFAULT_PROMO_BAR_TEXT = '注册即可解锁每日200次的免费请求'

const schema = z.object({
  enabled: z.boolean(),
  text: z.string().max(200, 'Promo bar text is too long'),
})

type Values = z.infer<typeof schema>

type PromoBarSectionProps = {
  defaultValues: {
    enabled: boolean
    text: string
  }
}

export function PromoBarSection({ defaultValues }: PromoBarSectionProps) {
  const { t } = useTranslation()
  const updateOption = useUpdateOption()

  const form = useForm<Values>({
    resolver: zodResolver(schema) as unknown as Resolver<Values>,
    defaultValues: {
      enabled: defaultValues.enabled,
      text: defaultValues.text || DEFAULT_PROMO_BAR_TEXT,
    },
  })

  // Re-sync the form when the settings cache reloads (e.g. after the user
  // saves from a sibling section, or after a remote change).
  useEffect(() => {
    form.reset({
      enabled: defaultValues.enabled,
      text: defaultValues.text || DEFAULT_PROMO_BAR_TEXT,
    })
  }, [defaultValues.enabled, defaultValues.text, form])

  const { isDirty, isSubmitting } = form.formState
  const enabled = form.watch('enabled')

  async function onSubmit(values: Values) {
    const normalizedText = values.text.trim()
    const updates: Array<{ key: string; value: string }> = []
    if (values.enabled !== defaultValues.enabled) {
      updates.push({ key: 'promo_setting.enabled', value: String(values.enabled) })
    }
    if (normalizedText !== (defaultValues.text || '')) {
      updates.push({ key: 'promo_setting.text', value: normalizedText })
    }
    if (updates.length === 0) {
      toast.info(t('No changes to save'))
      return
    }
    await Promise.all(updates.map((u) => updateOption.mutateAsync(u)))
    form.reset({ enabled: values.enabled, text: normalizedText })
  }

  return (
    <SettingsSection title={t('Promo Bar')}>
      <Form {...form}>
        <SettingsForm onSubmit={form.handleSubmit(onSubmit)}>
          <SettingsPageFormActions
            onSave={form.handleSubmit(onSubmit)}
            isSaving={updateOption.isPending || isSubmitting}
            isSaveDisabled={!isDirty}
            saveLabel={t('Save promo bar')}
          />
          <FormField
            control={form.control}
            name='enabled'
            render={({ field }) => (
              <SettingsSwitchItem>
                <SettingsSwitchContent>
                  <FormLabel>{t('Enable promo bar')}</FormLabel>
                  <FormDescription>
                    {t(
                      'Show a dismissible promo bar to visitors who are not signed in. A bar that is closed will not reappear for 3 days.'
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
            <FormField
              control={form.control}
              name='text'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Promo bar text')}</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={2}
                      maxLength={200}
                      placeholder={DEFAULT_PROMO_BAR_TEXT}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {t('Plain text shown in the bar. Keep it short.')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </SettingsForm>
      </Form>
    </SettingsSection>
  )
}
