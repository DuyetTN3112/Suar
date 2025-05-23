import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Định dạng ngày tháng
 * @param dateString Chuỗi ngày tháng
 * @param options Tùy chọn định dạng
 * @returns Chuỗi ngày tháng đã định dạng
 */
export function formatDate(
  dateString: string,
  options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }
): string {
  const date = new Date(dateString)
  // Kiểm tra ngày hợp lệ
  if (Number.isNaN(date.getTime())) {
    return 'Không xác định'
  }
  return new Intl.DateTimeFormat('vi-VN', options).format(date)
}
