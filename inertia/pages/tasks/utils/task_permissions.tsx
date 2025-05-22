import { Task } from '../types'

/**
 * Kiểm tra xem người dùng có quyền xóa task hay không
 */
export const canDeleteTask = (task: Task, currentUser: any): boolean => {
  // Không có thông tin người dùng
  if (!currentUser || !currentUser.id) {
    return false
  }
  
  // Kiểm tra xem người dùng là superadmin không
  const userRole = currentUser.role || ''
  const isSuperAdmin = userRole === 'superadmin'
  
  // Superadmin luôn có quyền xóa task
  if (isSuperAdmin) {
    return true
  }
  
  // Kiểm tra task và tổ chức
  const taskOrgId = task.organization_id
  const userOrgId = currentUser.organization_id
  
  // Kiểm tra nếu không cùng tổ chức
  if (taskOrgId && userOrgId && taskOrgId !== userOrgId) {
    return false
  }
  
  // Là admin trong cùng tổ chức
  if (userRole === 'admin') {
    return true
  }
  
  // Là người tạo task
  const creatorId = task.creator_id || (task.creator && task.creator.id)
  const isCreator = creatorId && Number(creatorId) === Number(currentUser.id)
  
  if (isCreator) {
    return true
  }
  
  return false
}

/**
 * Lấy thông tin role từ đối tượng auth
 */
export const getRoleFromAuth = () => {
  const authUser = (window as any).auth?.user;
  if (!authUser) {
    console.log('Debug - getRoleFromAuth: No auth user found');
    return '';
  }
  
  // In chi tiết dữ liệu người dùng để debug
  console.log('Debug - getRoleFromAuth Full auth:', JSON.stringify(authUser, null, 2));
  
  // Kiểm tra userRole từ middleware
  if (authUser.userRole) {
    console.log('Debug - userRole từ middleware:', authUser.userRole);
    return authUser.userRole;
  }
  
  // Trường hợp role là string
  if (typeof authUser.role === 'string') {
    console.log('Debug - getRoleFromAuth - Role is string:', authUser.role);
    return authUser.role.toLowerCase();
  }
  
  // Trường hợp role là object
  if (typeof authUser.role === 'object' && authUser.role) {
    console.log('Debug - getRoleFromAuth - Role is object:', JSON.stringify(authUser.role, null, 2));
    
    // Trường hợp có role.name
    if (authUser.role.name) {
      console.log('Debug - getRoleFromAuth - Role has name:', authUser.role.name);
      return authUser.role.name.toLowerCase();
    }
    
    // Trường hợp có role.id
    if (authUser.role.id === 1) {
      console.log('Debug - getRoleFromAuth - Role has id 1');
      return 'superadmin';
    }
    if (authUser.role.id === 2) {
      console.log('Debug - getRoleFromAuth - Role has id 2');
      return 'admin';
    }
  }
  
  // Kiểm tra username
  if (authUser.username === 'superadmin') {
    console.log('Debug - Username is superadmin');
    return 'superadmin';
  }
  
  if (authUser.username === 'admin') {
    console.log('Debug - Username is admin');
    return 'admin';
  }
  
  // Kiểm tra cả role_id của user
  if (authUser.role_id === 1) {
    console.log('Debug - getRoleFromAuth - User has role_id 1');
    return 'superadmin';
  }
  
  if (authUser.role_id === 2) {
    console.log('Debug - getRoleFromAuth - User has role_id 2');
    return 'admin';
  }
  
  // Trường hợp có isAdmin trong user
  if (authUser.isAdmin === true) {
    console.log('Debug - getRoleFromAuth - User has isAdmin=true');
    return 'admin';
  }
  
  console.log('Debug - getRoleFromAuth - Could not determine role');
  return ''
}

/**
 * Lấy thông tin người dùng hiện tại
 */
export const getCurrentUserInfo = () => {
  return {
    id: (window as any).auth?.user?.id,
    role: getRoleFromAuth(),
    organization_id: (window as any).auth?.user?.current_organization_id || 
                    (window as any).auth?.user?.organization_id
  }
}

export const canEditTask = (task: any, currentUser: any) => {
  if (!currentUser || !currentUser.id) {
    return false;
  }
  
  const isAdmin = ['admin', 'superadmin'].includes(String(currentUser.role).toLowerCase());
  const isSuperadmin = String(currentUser.role).toLowerCase() === 'superadmin';
  const isSameOrganization = currentUser.organization_id === task?.organization_id;
  const isCreator = Number(currentUser.id) === Number(task?.created_by);
  const isAssignee = Number(currentUser.id) === Number(task?.assigned_to);
  
  return isAdmin || isSuperadmin || (isSameOrganization && (isCreator || isAssignee));
}; 

/**
 * Kiểm tra người dùng có quyền tạo task không
 * Chỉ có admin và superadmin mới có quyền tạo task
 */
export const canCreateTask = () => {
  const authUser = (window as any).auth?.user;
  if (!authUser) {
    console.log('Debug - No auth user found');
    return false;
  }
  
  console.log('Debug - Auth user:', JSON.stringify(authUser, null, 2));
  
  // Check 1: Trường hợp role và isAdmin từ server middleware đã gán
  // Đây là trường hợp phổ biến khi server trả về userRole
  if (authUser.userRole === 'superadmin' || authUser.userRole === 'admin') {
    console.log('Debug - User has userRole admin/superadmin');
    return true;
  }
  
  // Check 2: Kiểm tra thuộc tính isAdmin
  if (authUser.isAdmin === true) {
    console.log('Debug - User has isAdmin=true');
    return true;
  }
  
  // Check 3: Kiểm tra role từ role object
  if (authUser.role) {
    console.log('Debug - Checking role object:', authUser.role);
    
    // Nếu role là string
    if (typeof authUser.role === 'string' && 
        (authUser.role.toLowerCase() === 'admin' || authUser.role.toLowerCase() === 'superadmin')) {
      console.log('Debug - Role string is admin/superadmin');
      return true;
    }
    
    // Nếu role là object
    if (typeof authUser.role === 'object' && authUser.role !== null) {
      // Kiểm tra role.name
      if (authUser.role.name && 
          (authUser.role.name.toLowerCase() === 'admin' || 
           authUser.role.name.toLowerCase() === 'superadmin')) {
        console.log('Debug - Role object name is admin/superadmin');
        return true;
      }
      
      // Kiểm tra role.id
      if (authUser.role.id === 1 || authUser.role.id === 2) {
        console.log('Debug - Role id is 1 or 2');
        return true;
      }
    }
  }
  
  // Check 4: Kiểm tra role_id trực tiếp
  if (authUser.role_id === 1 || authUser.role_id === 2) {
    console.log('Debug - User role_id is 1 or 2');
    return true;
  }
  
  // Check 5: Kiểm tra theo username
  if (authUser.username === 'superadmin' || authUser.username === 'admin') {
    console.log('Debug - Username is admin/superadmin');
    return true;
  }
  
  console.log('Debug - All checks failed, user does not have permission');
  return false;
} 