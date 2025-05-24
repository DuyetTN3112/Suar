import { useState, useEffect, useRef } from 'react'
import { router } from '@inertiajs/react'
import { Task } from '../types'

type FiltersType = {
  status?: string;
  priority?: string;
  label?: string;
  search?: string;
  assigned_to?: string;
  parent_task_id?: string;
};

type MetadataType = {
  statuses: Array<{ id: number; name: string; color: string }>;
  priorities: Array<{ id: number; name: string; color: string; value: number }>;
  labels: Array<{ id: number; name: string; color: string }>;
  users: Array<{
    id: number;
    username: string;
    email: string;
  }>;
};

type UseTaskFiltersProps = {
  initialFilters: FiltersType;
  metadata: MetadataType;
};

export function useTaskFilters({ initialFilters, metadata }: UseTaskFiltersProps) {
  const [searchQuery, setSearchQuery] = useState(initialFilters.search || '');
  const [selectedStatus, setSelectedStatus] = useState(initialFilters.status || 'all');
  const [selectedPriority, setSelectedPriority] = useState(initialFilters.priority || 'all');
  const [selectedAssignee, setSelectedAssignee] = useState(initialFilters.assigned_to || 'all');
  const [selectedLabel, setSelectedLabel] = useState(initialFilters.label || 'all');
  const [activeTab, setActiveTab] = useState('all');
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  // Tìm ID của trạng thái completed và pending
  const completedStatusId = metadata.statuses.find(
    status =>
      status.name.toLowerCase().includes('done') ||
      status.name.toLowerCase().includes('complete') ||
      status.name.toLowerCase().includes('hoàn thành')
  )?.id;

  const pendingStatusId = metadata.statuses.find(
    status =>
      status.name.toLowerCase().includes('pending') ||
      status.name.toLowerCase().includes('wait') ||
      status.name.toLowerCase().includes('chờ')
  )?.id;

  // Tìm kiếm tasks với debounce để tránh quá nhiều requests
  const handleSearch = (query: string) => {
    setSearchQuery(query);

    // Hủy timeout trước đó nếu có
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    // Nếu query rỗng, tìm kiếm ngay lập tức
    if (!query.trim()) {
      sendSearchRequest(query);
      return;
    }

    // Debounce search query
    searchTimeout.current = setTimeout(() => {
      sendSearchRequest(query);
    }, 300);
  };

  // Hàm gửi request tìm kiếm
  const sendSearchRequest = (query: string) => {
    router.get('/tasks', {
      ...initialFilters,
      search: query,
      page: 1
    }, {
      preserveState: true,
      only: ['tasks']
    });
  };

  // Dọn dẹp timeout khi component unmount
  useEffect(() => {
    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, []);

  // Lọc theo trạng thái
  const handleStatusChange = (status: string) => {
    setSelectedStatus(status);

    router.get('/tasks', {
      ...initialFilters,
      status: status === 'all' ? '' : status,
      page: 1
    }, {
      preserveState: true,
      only: ['tasks']
    });
  };

  // Lọc theo mức độ ưu tiên
  const handlePriorityChange = (priority: string) => {
    setSelectedPriority(priority);

    router.get('/tasks', {
      ...initialFilters,
      priority: priority === 'all' ? '' : priority,
      page: 1
    }, {
      preserveState: true,
      only: ['tasks']
    });
  };

  // Thay đổi tab
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);

    let statusParam = '';

    if (tab === 'completed' && completedStatusId) {
      statusParam = completedStatusId.toString();
    } else if (tab === 'pending' && pendingStatusId) {
      statusParam = pendingStatusId.toString();
    }

    router.get('/tasks', {
      ...initialFilters,
      status: statusParam,
      page: 1
    }, {
      preserveState: true,
      only: ['tasks']
    });
  };

  return {
    searchQuery,
    setSearchQuery,
    selectedStatus,
    selectedPriority,
    selectedAssignee,
    selectedLabel,
    activeTab,
    completedStatusId,
    pendingStatusId,
    handleSearch,
    handleStatusChange,
    handlePriorityChange,
    handleTabChange
  };
}
