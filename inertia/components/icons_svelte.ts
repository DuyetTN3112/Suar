import * as LucideIcons from 'lucide-svelte'
import type { Component } from 'svelte'

/**
 * Hàm lấy component icon dựa trên tên
 * @param name Tên icon (khớp với tên trong thư viện Lucide Icons)
 * @returns Component icon tương ứng hoặc fallback nếu không tìm thấy
 */
export function getIconComponent(name: string): Component {
  // Kiểm tra xem icon có tồn tại trong thư viện Lucide không
  const icons = LucideIcons as Record<string, Component | undefined>
  const IconComponent = icons[name]

  // Trả về icon hoặc fallback nếu không tìm thấy
  return IconComponent ?? LucideIcons.Boxes
}
