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

const PROFILE_GROUP_STYLES: Record<string, ProfileGroupStyle> = {
  technical: {
    title: 'Kỹ thuật (Technical)',
    badgeClass: 'border border-black bg-black text-white shadow-[3px_3px_0_#ff7a1a]',
    dotClass: 'rounded-full bg-orange',
    textClass: 'text-foreground',
    surfaceClass: 'bg-white',
    borderClass: 'border-border',
    strokeColor: '#ff7a1a',
    fillColor: 'rgba(255, 122, 26, 0.14)',
  },
  soft_skill: {
    title: 'Kỹ năng mềm (Soft Skills)',
    badgeClass: 'border border-black bg-accent text-foreground',
    dotClass: 'rounded-full bg-black',
    textClass: 'text-foreground',
    surfaceClass: 'bg-[color-mix(in_srgb,var(--color-orange)_4%,white)]',
    borderClass: 'border-border',
    strokeColor: '#ff7a1a',
    fillColor: 'rgba(255, 122, 26, 0.12)',
  },
  delivery: {
    title: 'Delivery',
    badgeClass: 'border border-black bg-white text-foreground',
    dotClass: 'rounded-full bg-orange',
    textClass: 'text-foreground',
    surfaceClass: 'bg-[color-mix(in_srgb,var(--color-black)_2%,white)]',
    borderClass: 'border-border',
    strokeColor: '#ff7a1a',
    fillColor: 'rgba(255, 122, 26, 0.10)',
  },
  other: {
    title: 'Khác',
    badgeClass: 'rounded-full px-3 py-1 text-xs font-medium bg-black text-white',
    dotClass: 'rounded-full bg-black',
    textClass: 'text-foreground',
    surfaceClass: 'bg-white',
    borderClass: 'border-border',
    strokeColor: '#18181b',
    fillColor: 'rgba(24, 24, 27, 0.14)',
  },
}

export function getProfileGroupStyle(code?: string | null): ProfileGroupStyle {
  if (!code) {
    return PROFILE_GROUP_STYLES.other
  }

  return (
    PROFILE_GROUP_STYLES[code] ?? {
      ...PROFILE_GROUP_STYLES.other,
      title: code,
    }
  )
}

function normalizeLevelCode(levelCode?: unknown): string {
  if (typeof levelCode !== 'string') {
    return ''
  }

  return levelCode.trim().toLowerCase()
}

export function getProfileLevelLabel(levelCode?: string | null): string {
  const code = normalizeLevelCode(levelCode)
  if (!code) return 'Unrated'
  if (code.includes('begin')) return 'Beginner'
  if (code.includes('jun')) return 'Junior'
  if (code.includes('mid')) return 'Middle'
  if (code.includes('sen')) return 'Senior'
  if (code.includes('lead')) return 'Lead'
  if (code.includes('prin')) return 'Principal'
  if (code.includes('mas')) return 'Master'
  return levelCode ?? 'Unrated'
}

export function getProfileLevelClass(levelCode?: string | null): string {
  const code = normalizeLevelCode(levelCode)

  if (code.includes('begin')) {
    return 'bg-background text-foreground'
  }
  if (code.includes('jun')) {
    return 'bg-accent text-foreground'
  }
  if (code.includes('mid')) {
    return 'bg-[color-mix(in_srgb,var(--color-orange)_10%,white)] text-foreground'
  }
  if (code.includes('sen')) {
    return 'bg-black text-white'
  }
  if (code.includes('lead')) {
    return 'bg-black text-white shadow-[3px_3px_0_#ff7a1a]'
  }
  if (code.includes('prin')) {
    return 'bg-white text-foreground ring-1 ring-black'
  }
  if (code.includes('mas')) {
    return 'bg-orange text-black'
  }

  return 'bg-background text-foreground'
}
