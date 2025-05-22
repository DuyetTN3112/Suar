import { format, parseISO } from 'date-fns'
import { vi } from 'date-fns/locale'

/**
 * Định dạng ngày tháng từ chuỗi ISO sang định dạng Việt Nam
 * @param dateString Chuỗi ngày tháng định dạng ISO
 * @returns Chuỗi ngày tháng đã định dạng
 */
export const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  
  try {
    const date = parseISO(dateString);
    return format(date, 'dd/MM/yyyy', { locale: vi });
  } catch (error) {
    console.error('Lỗi định dạng ngày tháng:', error);
    return dateString;
  }
};

/**
 * Định dạng ngày tháng đầy đủ với giờ phút
 * @param dateString Chuỗi ngày tháng định dạng ISO
 * @returns Chuỗi ngày tháng đã định dạng
 */
export const formatDateTime = (dateString: string): string => {
  if (!dateString) return '';
  
  try {
    const date = parseISO(dateString);
    return format(date, 'dd/MM/yyyy HH:mm', { locale: vi });
  } catch (error) {
    console.error('Lỗi định dạng ngày giờ:', error);
    return dateString;
  }
};

/**
 * Định dạng thời gian ước tính sang giờ:phút
 * @param minutes Số phút
 * @returns Chuỗi thời gian đã định dạng
 */
export const formatEstimatedTime = (minutes: number): string => {
  if (!minutes || minutes <= 0) return '0';
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (hours > 0) {
    return remainingMinutes > 0 
      ? `${hours}h ${remainingMinutes}p` 
      : `${hours}h`;
  }
  
  return `${remainingMinutes}p`;
};

/**
 * Tính phần trăm hoàn thành của task
 * @param completedSubtasks Số lượng subtask đã hoàn thành
 * @param totalSubtasks Tổng số subtask
 * @returns Phần trăm hoàn thành
 */
export const calculateCompletionPercentage = (
  completedSubtasks: number,
  totalSubtasks: number
): number => {
  if (totalSubtasks === 0) return 0;
  return Math.round((completedSubtasks / totalSubtasks) * 100);
};

/**
 * Lấy màu trạng thái mặc định dựa trên tên
 * @param statusName Tên trạng thái
 * @returns Chuỗi màu HEX
 */
export const getDefaultStatusColor = (statusName: string): string => {
  const name = statusName.toLowerCase();
  
  if (name.includes('todo') || name.includes('open') || name.includes('mới')) {
    return '#3498db';
  }
  
  if (name.includes('progress') || name.includes('đang')) {
    return '#f39c12';
  }
  
  if (name.includes('done') || name.includes('completed') || name.includes('hoàn thành')) {
    return '#2ecc71';
  }
  
  if (name.includes('cancel') || name.includes('hủy')) {
    return '#e74c3c';
  }
  
  return '#95a5a6';
};

/**
 * Lấy tên viết tắt từ họ tên đầy đủ
 * @param fullName Họ tên đầy đủ
 * @returns Chuỗi viết tắt (1-2 ký tự)
 */
export const getInitials = (fullName: string): string => {
  if (!fullName) return '';
  
  const names = fullName.trim().split(' ');
  
  if (names.length <= 1) {
    return names[0].charAt(0).toUpperCase();
  }
  
  return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
}; 