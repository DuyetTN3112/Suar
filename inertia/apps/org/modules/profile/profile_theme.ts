import {
  findFrontendCanonicalProficiencyLevelOption,
  getFrontendCanonicalProficiencyLevelLabel,
} from '@/apps/org/modules/profile/lib/proficiency_level_catalog'

interface ProfileGroupStyle {
  title: string
  badgeClass: string
  dotClass: string
  textClass: string
  surfaceClass: string
  borderClass: string
  strokeColor: string
  fillColor: string
}

const DEFAULT_PROFILE_GROUP_STYLE: ProfileGroupStyle = {
  title: 'Other',
  badgeClass: 'rounded-full px-3 py-1 text-xs font-medium bg-foreground text-background',
  dotClass: 'rounded-full bg-foreground',
  textClass: 'text-foreground',
  surfaceClass: 'bg-card',
  borderClass: 'border-border',
  strokeColor: '#18181b',
  fillColor: 'rgba(24, 24, 27, 0.14)',
}

const PROFILE_GROUP_STYLES: Record<string, ProfileGroupStyle> = {
  technology: {
    title: 'Technology',
    badgeClass: 'border border-border bg-primary text-primary-foreground',
    dotClass: 'rounded-full bg-teal-600',
    textClass: 'text-foreground',
    surfaceClass: 'bg-card',
    borderClass: 'border-border',
    strokeColor: '#0f766e',
    fillColor: 'rgba(15, 118, 110, 0.14)',
  },
  engineering: {
    title: 'Software engineering',
    badgeClass: 'border border-border bg-secondary text-foreground',
    dotClass: 'rounded-full bg-violet-500',
    textClass: 'text-foreground',
    surfaceClass: 'bg-card',
    borderClass: 'border-border',
    strokeColor: '#7c3aed',
    fillColor: 'rgba(124, 58, 237, 0.14)',
  },
  soft_skill: {
    title: 'Soft skills',
    badgeClass: 'border border-border bg-accent text-foreground',
    dotClass: 'rounded-full bg-foreground',
    textClass: 'text-foreground',
    surfaceClass: 'bg-card',
    borderClass: 'border-border',
    strokeColor: '#ff7a1a',
    fillColor: 'rgba(255, 122, 26, 0.12)',
  },
  delivery: {
    title: 'Delivery',
    badgeClass: 'border border-border bg-muted text-foreground',
    dotClass: 'rounded-full bg-orange',
    textClass: 'text-foreground',
    surfaceClass: 'bg-card',
    borderClass: 'border-border',
    strokeColor: '#ff7a1a',
    fillColor: 'rgba(255, 122, 26, 0.10)',
  },
  other: DEFAULT_PROFILE_GROUP_STYLE,
}

export function getProfileGroupStyle(code?: string | null): ProfileGroupStyle {
  if (!code) {
    return DEFAULT_PROFILE_GROUP_STYLE
  }

  return (
    PROFILE_GROUP_STYLES[code] ?? {
      ...DEFAULT_PROFILE_GROUP_STYLE,
      title: code,
    }
  )
}

export function getProfileCategoryLabel(code?: string | null): string {
  return getProfileGroupStyle(code).title
}

export function getProfileLevelLabel(levelCode?: string | null): string {
  return getFrontendCanonicalProficiencyLevelLabel(levelCode)
}

export function getProfileLevelClass(levelCode?: string | null): string {
  const order = findFrontendCanonicalProficiencyLevelOption(levelCode)?.order ?? 0

  if (order <= 2) {
    return 'bg-background text-foreground'
  }
  if (order <= 5) {
    return 'bg-accent text-foreground'
  }
  if (order <= 8) {
    return 'bg-accent/70 text-foreground'
  }
  if (order <= 11) {
    return 'bg-foreground text-background'
  }
  if (order === 12) {
    return 'bg-foreground text-background shadow-[3px_3px_0_var(--color-orange)]'
  }
  if (order === 13) {
    return 'bg-card text-foreground ring-1 ring-border'
  }
  if (order >= 14) {
    return 'bg-orange text-black'
  }

  return 'bg-background text-foreground'
}
