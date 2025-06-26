import type { Component } from 'svelte'
import { lucideIconMap, type LucideIconName } from '@/components/lucide_icon_map'

/**
 * Hàm lấy component icon dựa trên tên
 * @param name Tên icon (khớp với tên trong thư viện Lucide Icons)
 * @returns Component icon tương ứng hoặc fallback nếu không tìm thấy
 */
export function getIconComponent(name: string): Component {
  if (name in lucideIconMap) {
    return lucideIconMap[name as LucideIconName]
  }

  return lucideIconMap.Boxes
}
