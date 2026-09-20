import {
  Building2,
  CalendarClock,
  Earth,
  Gauge,
  Languages,
  MapPin,
} from 'lucide-svelte'

import { formatPercent } from '../profile_view_helpers'

export interface SignalItem {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: any
  label: string
  value: string
}

export function formatAvailableDate(
  dateStr: string | null | undefined,
  locale: string
): string | null {
  if (!dateStr) return null
  try {
    const date = new Date(dateStr)
    if (Number.isNaN(date.getTime())) return dateStr
    return new Intl.DateTimeFormat(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date)
  } catch {
    return dateStr
  }
}

export function buildSignalItems(params: {
  user: Record<string, unknown>
  settings: {
    preferred_locations: string[]
    preferred_job_types: string[]
    available_from?: string | null
  }
  deliveryMetrics: {
    years_of_experience: number
    joined_at_formatted: string
    delivery: {
      estimate_accuracy_percentage: number | null
      avg_hours_over_estimate: number
    }
  }
  documentLocale: string
  t: (key: string, params?: Record<string, unknown>, fallback?: string) => string
}): SignalItem[] {
  const { user, settings, deliveryMetrics, documentLocale, t } = params
  const org = user.current_organization as { name?: string } | undefined

  return [
    {
      icon: Building2,
      label: t('user.profile_overview.current_organization', {}, 'Current organization'),
      value: org?.name ?? t('user.profile_overview.not_selected', {}, 'Not selected'),
    },
    {
      icon: CalendarClock,
      label: t('user.profile_overview.experience_joined', {}, 'Account age / joined'),
      value: t(
        'user.profile_overview.experience_value',
        { years: deliveryMetrics.years_of_experience, date: deliveryMetrics.joined_at_formatted },
        `${deliveryMetrics.years_of_experience} years · since ${deliveryMetrics.joined_at_formatted}`
      ),
    },
    {
      icon: Earth,
      label: t('user.profile_overview.timezone_language', {}, 'Timezone / language'),
      value: `${typeof user.timezone === 'string' && user.timezone ? user.timezone : 'N/A'} · ${typeof user.language === 'string' ? user.language : 'vi'}`,
    },
    {
      icon: MapPin,
      label: t('user.profile_overview.priority_region', {}, 'Preferred region'),
      value:
        settings.preferred_locations.length > 0
          ? settings.preferred_locations.join(', ')
          : t('user.profile_overview.not_declared', {}, 'Not declared'),
    },
    {
      icon: Gauge,
      label: t('user.profile_overview.estimate_accuracy', {}, 'Estimate accuracy'),
      value: t(
        'user.profile_overview.estimate_accuracy_value',
        {
          accuracy: formatPercent(deliveryMetrics.delivery.estimate_accuracy_percentage, 1),
          hours: deliveryMetrics.delivery.avg_hours_over_estimate,
        },
        `${formatPercent(deliveryMetrics.delivery.estimate_accuracy_percentage, 1)} · avg deviation ${
          deliveryMetrics.delivery.avg_hours_over_estimate
        } h/task`
      ),
    },
    {
      icon: Languages,
      label: t('user.profile_overview.job_type_available_from', {}, 'Job type / available from'),
      value: [
        settings.preferred_job_types.join(', '),
        settings.available_from
          ? t(
              'user.profile_overview.available_from',
              { date: formatAvailableDate(settings.available_from, documentLocale) ?? '' },
              `from ${formatAvailableDate(settings.available_from, documentLocale) ?? ''}`
            )
          : null,
      ]
        .filter((item): item is string => Boolean(item))
        .join(' · ') || t('user.profile_overview.not_declared', {}, 'Not declared'),
    },
  ].filter((item) => item.value && item.value !== ' · ')
}
