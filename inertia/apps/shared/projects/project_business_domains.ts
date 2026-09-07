/**
 * Nhãn hiển thị cho các lĩnh vực được cấu hình ở Project.
 * Giá trị phải khớp với danh mục được máy chủ kiểm tra.
 */
export const PROJECT_BUSINESS_DOMAIN_OPTIONS = [
  { value: 'fintech', label: 'Tài chính – ngân hàng' },
  { value: 'ecommerce', label: 'Thương mại điện tử' },
  { value: 'saas', label: 'Phần mềm dịch vụ' },
  { value: 'edtech', label: 'Công nghệ giáo dục' },
  { value: 'healthtech', label: 'Công nghệ y tế' },
  { value: 'logistics', label: 'Vận hành – logistics' },
  { value: 'media', label: 'Nội dung – truyền thông' },
  { value: 'gaming', label: 'Trò chơi' },
  { value: 'security', label: 'An toàn thông tin' },
  { value: 'data_platform', label: 'Nền tảng dữ liệu' },
  { value: 'internal_tooling', label: 'Công cụ nội bộ' },
  { value: 'infrastructure', label: 'Hạ tầng kỹ thuật' },
  { value: 'other', label: 'Lĩnh vực khác' },
] as const

export type ProjectBusinessDomainValue = (typeof PROJECT_BUSINESS_DOMAIN_OPTIONS)[number]['value']

export function projectBusinessDomainLabel(value: string): string {
  return PROJECT_BUSINESS_DOMAIN_OPTIONS.find((option) => option.value === value)?.label ?? value
}
