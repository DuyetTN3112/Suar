type ProfileGroupStyle = {
  title: string
  badgeClass: string
  dotClass: string
  textClass: string
}

const PROFILE_GROUP_STYLES: Record<string, ProfileGroupStyle> = {
  technical: {
    title: 'Kỹ thuật (Technical)',
    badgeClass: 'neo-pill-magenta',
    dotClass: 'neo-dot-magenta',
    textClass: 'neo-text-magenta',
  },
  soft_skill: {
    title: 'Kỹ năng mềm (Soft Skills)',
    badgeClass: 'neo-pill-blue',
    dotClass: 'neo-dot-blue',
    textClass: 'neo-text-blue',
  },
  delivery: {
    title: 'Delivery',
    badgeClass: 'neo-pill-orange',
    dotClass: 'neo-dot-orange',
    textClass: 'neo-text-orange',
  },
  other: {
    title: 'Khác',
    badgeClass: 'neo-pill-ink',
    dotClass: 'neo-dot-ink',
    textClass: 'neo-text-ink',
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
  return levelCode || 'Unrated'
}

export function getProfileLevelClass(levelCode?: string | null): string {
  const code = normalizeLevelCode(levelCode)

  if (code.includes('begin')) {
    return 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100'
  }
  if (code.includes('jun')) {
    return 'bg-orange-100 text-orange-900 dark:bg-orange-950/60 dark:text-orange-100'
  }
  if (code.includes('mid')) {
    return 'bg-blue-100 text-blue-900 dark:bg-blue-950/60 dark:text-blue-100'
  }
  if (code.includes('sen')) {
    return 'bg-fuchsia-100 text-fuchsia-900 dark:bg-fuchsia-950/60 dark:text-fuchsia-100'
  }
  if (code.includes('lead')) {
    return 'bg-black text-white dark:bg-white dark:text-black'
  }
  if (code.includes('prin')) {
    return 'bg-rose-100 text-rose-900 dark:bg-rose-950/60 dark:text-rose-100'
  }
  if (code.includes('mas')) {
    return 'bg-orange-500 text-white dark:bg-orange-500 dark:text-white'
  }

  return 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100'
}
