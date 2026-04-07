export type KanbanLaneToken = {
  label: string
  surfaceClass: string
  markerClass: string
}

export type PriorityToken = {
  label: string
  badgeClass: string
  dotClass: string
}

export type LevelToken = {
  label: string
  surfaceClass: string
  meterClass: string
}

export const KANBAN_LANE_TOKENS = {
  backlog: {
    label: 'Backlog',
    surfaceClass: 'border-border bg-muted/50 text-muted-foreground',
    markerClass: 'bg-muted-foreground/50',
  },
  todo: {
    label: 'To do',
    surfaceClass: 'border-border bg-background text-foreground',
    markerClass: 'bg-foreground/50',
  },
  in_progress: {
    label: 'In progress',
    surfaceClass: 'border-primary/30 bg-primary/10 text-primary',
    markerClass: 'bg-primary',
  },
  review: {
    label: 'Review',
    surfaceClass: 'border-accent bg-accent/60 text-accent-foreground',
    markerClass: 'bg-accent-foreground/70',
  },
  blocked: {
    label: 'Blocked',
    surfaceClass: 'border-destructive/30 bg-destructive/10 text-destructive',
    markerClass: 'bg-destructive',
  },
  done: {
    label: 'Done',
    surfaceClass: 'border-secondary bg-secondary text-secondary-foreground',
    markerClass: 'bg-secondary-foreground/70',
  },
} as const satisfies Record<string, KanbanLaneToken>

export const PRIORITY_TOKENS = {
  low: {
    label: 'Low',
    badgeClass: 'border-border bg-muted/50 text-muted-foreground',
    dotClass: 'bg-muted-foreground/50',
  },
  medium: {
    label: 'Medium',
    badgeClass: 'border-primary/25 bg-primary/10 text-primary',
    dotClass: 'bg-primary/70',
  },
  high: {
    label: 'High',
    badgeClass: 'border-destructive/25 bg-destructive/10 text-destructive',
    dotClass: 'bg-destructive/80',
  },
  urgent: {
    label: 'Urgent',
    badgeClass: 'border-destructive bg-destructive text-destructive-foreground',
    dotClass: 'bg-destructive',
  },
} as const satisfies Record<string, PriorityToken>

export const LEVEL_SCALE_TOKENS = {
  L0: { label: 'L0', surfaceClass: 'bg-muted text-muted-foreground', meterClass: 'bg-muted-foreground/30' },
  L1: { label: 'L1', surfaceClass: 'bg-muted text-muted-foreground', meterClass: 'bg-muted-foreground/35' },
  L2: { label: 'L2', surfaceClass: 'bg-muted text-muted-foreground', meterClass: 'bg-muted-foreground/40' },
  L3: { label: 'L3', surfaceClass: 'bg-secondary text-secondary-foreground', meterClass: 'bg-secondary-foreground/35' },
  L4: { label: 'L4', surfaceClass: 'bg-secondary text-secondary-foreground', meterClass: 'bg-secondary-foreground/40' },
  L5: { label: 'L5', surfaceClass: 'bg-secondary text-secondary-foreground', meterClass: 'bg-secondary-foreground/45' },
  L6: { label: 'L6', surfaceClass: 'bg-primary/10 text-primary', meterClass: 'bg-primary/45' },
  L7: { label: 'L7', surfaceClass: 'bg-primary/10 text-primary', meterClass: 'bg-primary/50' },
  L8: { label: 'L8', surfaceClass: 'bg-primary/10 text-primary', meterClass: 'bg-primary/55' },
  L9: { label: 'L9', surfaceClass: 'bg-primary/15 text-primary', meterClass: 'bg-primary/60' },
  L10: { label: 'L10', surfaceClass: 'bg-primary/15 text-primary', meterClass: 'bg-primary/65' },
  L11: { label: 'L11', surfaceClass: 'bg-primary/15 text-primary', meterClass: 'bg-primary/70' },
  L12: { label: 'L12', surfaceClass: 'bg-primary text-primary-foreground', meterClass: 'bg-primary-foreground/70' },
  L13: { label: 'L13', surfaceClass: 'bg-primary text-primary-foreground', meterClass: 'bg-primary-foreground/80' },
  L14: { label: 'L14', surfaceClass: 'bg-primary text-primary-foreground', meterClass: 'bg-primary-foreground' },
} as const satisfies Record<`L${number}`, LevelToken>

export type KanbanLaneKey = keyof typeof KANBAN_LANE_TOKENS
export type PriorityKey = keyof typeof PRIORITY_TOKENS
export type LevelScaleKey = keyof typeof LEVEL_SCALE_TOKENS

export function levelScaleKey(level: number): LevelScaleKey {
  const normalized = Math.max(0, Math.min(14, Math.round(level)))
  return `L${normalized}` as LevelScaleKey
}

export function levelScaleToken(level: number): LevelToken {
  return LEVEL_SCALE_TOKENS[levelScaleKey(level)]
}
