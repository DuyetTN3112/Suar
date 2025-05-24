import { useState } from 'react'
import axios from 'axios'
import { Task } from '../types'

export function useTaskModals() {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isCheckingPermission, setIsCheckingPermission] = useState(false);

  // Mở modal tạo task mới
  const handleCreateClick = async () => {
    try {
      setIsCheckingPermission(true);

      // Gọi API để kiểm tra quyền
      const response = await axios.get('/api/tasks/check-create-permission');

      if (response.data.success && response.data.canCreate) {
        setCreateModalOpen(true);
      } else {
        alert('Bạn không có quyền tạo nhiệm vụ mới. Chỉ admin và superadmin mới có quyền này.');
      }
    } catch (error) {
      console.error('Error checking permission:', error);

      // Fallback: Hiển thị modal trong trường hợp lỗi
      setCreateModalOpen(true);
    } finally {
      setIsCheckingPermission(false);
    }
  };

  // Mở modal import task
  const handleImportClick = () => {
    setImportModalOpen(true);
  };

  // Mở modal chi tiết task
  const handleDetailClick = (task: Task) => {
    try {
      // Cập nhật state trước khi mở modal
      setSelectedTask(task);
      setSelectedTaskId(task.id);
      // Đảm bảo modal được hiển thị
      setTimeout(() => {
        setDetailModalOpen(true);
      }, 0);
    } catch (error) {
      console.error('Error opening task detail modal:', error);
    }
  };

  // Reset trạng thái khi đóng modal
  const handleDetailClose = () => {
    setDetailModalOpen(false);
    // Không xóa selectedTask và selectedTaskId ngay lập tức để tránh hiệu ứng "flash"
    setTimeout(() => {
      setSelectedTask(null);
      setSelectedTaskId(null);
    }, 300);
  };

  return {
    // Modal states
    createModalOpen,
    setCreateModalOpen,
    importModalOpen,
    setImportModalOpen,
    detailModalOpen,
    setDetailModalOpen,

    // Task selection
    selectedTaskId,
    setSelectedTaskId,
    selectedTask,
    setSelectedTask,

    // Action handlers
    handleCreateClick,
    handleImportClick,
    handleDetailClick,
    handleDetailClose,

    // Other states
    isCheckingPermission
  };
}
