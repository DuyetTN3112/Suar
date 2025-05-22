import { router } from '@inertiajs/react';

// Trong component
const handleSwitchOrganization = async (organizationId: string | number) => {
  try {
    // Lấy đường dẫn hiện tại
    const currentPath = window.location.pathname;
    
    // Đảm bảo organizationId là chuỗi
    const orgId = String(organizationId);
    
    console.log('Chuyển đổi tổ chức:', {
      id: organizationId,
      type: typeof organizationId,
      stringValue: orgId,
      currentPath
    });
    
    // Sử dụng router.post của Inertia với cấu hình để đảm bảo refresh
    router.post('/switch-organization', {
      organization_id: orgId,
      current_path: currentPath
    }, {
      preserveState: false,
      onSuccess: (page) => {
        console.log('Đã chuyển đổi tổ chức, đang tải lại trang...', page);
        
        // Tạo thời gian chờ ngắn để đảm bảo session được cập nhật trên server
        setTimeout(() => {
          // Tải lại trang hiện tại với hard refresh để đảm bảo dữ liệu mới
          window.location.href = currentPath;
        }, 100);
      }
    });
  } catch (error) {
    console.error('Lỗi khi gửi request chuyển đổi tổ chức:', error);
  }
};