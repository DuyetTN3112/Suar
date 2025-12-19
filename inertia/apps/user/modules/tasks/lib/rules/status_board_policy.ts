import type { SliceItem } from '@/apps/user/modules/tasks/types/status_board_types'

export function canEditItem(item: SliceItem, role: string | null): boolean {
  void item

  if (!role) {
    return false
  }

  return role === 'org_owner' || role === 'org_admin'
}
