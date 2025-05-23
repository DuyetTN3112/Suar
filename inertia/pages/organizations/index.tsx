import React, { useState, useEffect } from 'react'
import { Head, router, usePage } from '@inertiajs/react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Building, Plus, ArrowRight, Search, Info, Users, ChevronLeft, ChevronRight, Clock, AlertCircle } from 'lucide-react'
import AppLayout from '@/layouts/app_layout'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface Organization {
  id: number
  name: string
  description: string | null
  logo: string | null
  website: string | null
  plan: string | null
  founded_date: string | null
  owner: string | null
  employee_count: number | null
  project_count: number | null
  industry: string | null
  location: string | null
  membership_status?: 'pending' | 'approved' | 'rejected' | null
}

interface OrganizationIndexProps {
  organizations: Organization[]
  currentOrganizationId: number | null
  allOrganizations?: Organization[]
}

export default function OrganizationIndex({ organizations, currentOrganizationId, allOrganizations = [] }: OrganizationIndexProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [allOrgsPage, setAllOrgsPage] = useState(1)
  const [userOrgsPage, setUserOrgsPage] = useState(1)
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null)
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [localCurrentOrgId, setLocalCurrentOrgId] = useState<number | null>(currentOrganizationId)
  const [orgMembershipStatus, setOrgMembershipStatus] = useState<Record<number, { status: string | null }>>({})
  
  // Cập nhật localCurrentOrgId khi prop thay đổi
  useEffect(() => {
    setLocalCurrentOrgId(currentOrganizationId)
  }, [currentOrganizationId])
  
  // Số lượng tổ chức hiển thị trên mỗi trang (2 dòng x 5 cột)
  const ITEMS_PER_PAGE = 10
  
  // Hàm xử lý tham gia tổ chức
  const handleJoinOrganization = async (id: number) => {
    try {
      // Lấy CSRF token từ meta tag
      const csrfToken = document.head.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
      
      if (!csrfToken) {
        toast.error('Không tìm thấy CSRF token. Vui lòng tải lại trang.');
        return;
      }
      
      const response = await fetch(`/organizations/${id}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': csrfToken,
        },
        credentials: 'same-origin',
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Thông báo thành công
        toast.success(data.message || 'Đã gửi yêu cầu tham gia tổ chức thành công');
        
        // Cập nhật trạng thái membership của tổ chức này
        if (data.joinRequest) {
          setOrgMembershipStatus(prev => ({
            ...prev,
            [id]: { status: data.joinRequest.status || 'pending' }
          }));
        }
        
        // Đóng dialog chi tiết nếu đang mở
        if (showDetailDialog) {
          setShowDetailDialog(false);
        }
      } else {
        // Hiển thị lỗi nếu có
        toast.error(data.message || 'Không thể tham gia tổ chức');
        
        // Nếu đã có membership với trạng thái pending hoặc rejected, cập nhật UI
        if (data.membership && data.membership.status) {
          setOrgMembershipStatus(prev => ({
            ...prev,
            [id]: { status: data.membership.status }
          }));
        }
      }
    } catch (error) {
      console.error('Lỗi khi tham gia tổ chức:', error);
      toast.error('Đã xảy ra lỗi khi xử lý yêu cầu');
    }
  }

  // Hàm xử lý chuyển đổi tổ chức hiện tại
  const handleSwitchOrganization = async (id: number) => {
    try {
      // Lấy CSRF token từ meta tag
      const csrfToken = document.head.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
      
      if (!csrfToken) {
        toast.error('Không tìm thấy CSRF token. Vui lòng tải lại trang.');
        return;
      }
      
      // Sử dụng fetch API với endpoint API chính xác
      const response = await fetch(`/switch-organization`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'Accept': 'application/json',
          'X-CSRF-TOKEN': csrfToken,
        },
        body: JSON.stringify({
          organization_id: id,
          current_path: window.location.pathname
        }),
        credentials: 'same-origin',
      });
      
      // Kiểm tra trạng thái phản hồi
      if (!response.ok) {
        if (response.status === 302) {
          // Xử lý trường hợp chuyển hướng (thường là thành công nhưng API trả về redirect)
          // Cập nhật state local trước để UI phản hồi ngay lập tức
          setLocalCurrentOrgId(id);
          
          // Đóng dialog chi tiết nếu đang mở
          if (showDetailDialog) {
            setShowDetailDialog(false);
          }
          
          toast.success('Đã chuyển đổi tổ chức thành công');
          return;
        }
        
        // Xử lý các lỗi khác
        toast.error(`Lỗi: ${response.status} - ${response.statusText}`);
        return;
      }
      
      // Kiểm tra content-type
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        // Không phải JSON, có thể là HTML từ chuyển hướng
        setLocalCurrentOrgId(id);
        
        // Đóng dialog chi tiết nếu đang mở
        if (showDetailDialog) {
          setShowDetailDialog(false);
        }
        
        toast.success('Đã chuyển đổi tổ chức thành công');
        return;
      }
      
      // Phân tích JSON nếu phản hồi là JSON
      const data = await response.json();
      
      if (data.success) {
        // Cập nhật state local trước để UI phản hồi ngay lập tức
        setLocalCurrentOrgId(id);
        
        // Đóng dialog chi tiết nếu đang mở
        if (showDetailDialog) {
          setShowDetailDialog(false);
        }
        
        // Cập nhật props
        (usePage().props as any).currentOrganizationId = id;
        
        // Hiển thị thông báo thành công
        toast.success(data.message || 'Đã chuyển đổi tổ chức thành công');
      } else {
        toast.error(data.message || 'Có lỗi xảy ra khi chuyển đổi tổ chức');
      }
    } catch (error) {
      console.error('Lỗi khi chuyển đổi tổ chức:', error);
      toast.error('Có lỗi xảy ra khi chuyển đổi tổ chức');
    }
  };
  
  // Hàm xử lý hiển thị chi tiết tổ chức
  const handleShowDetails = (org: Organization) => {
    setSelectedOrg(org)
    setShowDetailDialog(true)
  }

  // Lọc tổ chức theo từ khóa tìm kiếm
  const filteredOrganizations = allOrganizations.filter((org) =>
    org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (org.description && org.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  // Phân trang cho tất cả tổ chức
  const totalAllOrgsPages = Math.ceil(filteredOrganizations.length / ITEMS_PER_PAGE)
  const paginatedAllOrgs = filteredOrganizations.slice(
    (allOrgsPage - 1) * ITEMS_PER_PAGE, 
    allOrgsPage * ITEMS_PER_PAGE
  )
  
  // Phân trang cho tổ chức của người dùng
  const totalUserOrgsPages = Math.ceil(organizations.length / ITEMS_PER_PAGE)
  const paginatedUserOrgs = organizations.slice(
    (userOrgsPage - 1) * ITEMS_PER_PAGE, 
    userOrgsPage * ITEMS_PER_PAGE
  )

  // Kiểm tra xem người dùng đã tham gia tổ chức nào chưa
  const hasOrganizations = organizations.length > 0

  // Hàm kiểm tra trạng thái thành viên
  const checkMembershipStatus = (orgId: number) => {
    // Kiểm tra nếu đã là thành viên được duyệt
    if (organizations.some(org => org.id === orgId)) {
      return { isMember: true, status: 'approved' };
    }
    
    // Kiểm tra trạng thái từ state (pending hoặc rejected)
    if (orgMembershipStatus[orgId]) {
      return { isMember: false, status: orgMembershipStatus[orgId].status };
    }
    
    // Kiểm tra membership_status từ dữ liệu tổ chức
    const org = allOrganizations?.find(o => o.id === orgId);
    if (org && org.membership_status) {
      return { isMember: org.membership_status === 'approved', status: org.membership_status };
    }
    
    return { isMember: false, status: null };
  }

  // Hàm render nút tham gia dựa trên trạng thái
  const renderJoinButton = (org: Organization) => {
    const { isMember, status } = checkMembershipStatus(org.id);
    
    if (isMember) {
      if (org.id === localCurrentOrgId) {
        return (
          <Button variant="outline" size="sm" className="flex-1 h-7 text-xs" disabled>
            Hiện tại
          </Button>
        );
      } else {
        return (
          <Button 
            size="sm" 
            className="flex-1 h-7 text-xs" 
            onClick={() => handleSwitchOrganization(org.id)}
          >
            Chuyển đổi
          </Button>
        );
      }
    }
    
    if (status === 'pending') {
      return (
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1 h-7 text-xs" 
          disabled
        >
          <Clock className="h-3 w-3 mr-1" />
          Đang chờ duyệt
        </Button>
      );
    }
    
    if (status === 'rejected') {
      return (
        <Button 
          variant="outline"
          size="sm" 
          className="flex-1 h-7 text-xs bg-amber-50" 
          onClick={() => handleJoinOrganization(org.id)}
        >
          <AlertCircle className="h-3 w-3 mr-1" />
          Gửi lại yêu cầu
        </Button>
      );
    }
    
    return (
      <Button 
        size="sm" 
        className="flex-1 h-7 text-xs" 
        onClick={() => handleJoinOrganization(org.id)}
      >
        Tham gia
      </Button>
    );
  }

  return (
    <>
      <Head title="Danh sách tổ chức" />
      <div className="container py-4 space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Danh sách tổ chức</h1>
          <Button asChild>
            <a href="/organizations/create">
              <Plus className="mr-2 h-4 w-4" />
              Tạo tổ chức mới
            </a>
          </Button>
        </div>

        {hasOrganizations && (
          <div>
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-xl font-semibold">Tổ chức của bạn</h2>
              
              {totalUserOrgsPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setUserOrgsPage(prev => Math.max(prev - 1, 1))}
                    disabled={userOrgsPage === 1}
                  >
                    <ChevronLeft className="h-3 w-3 mr-1" />
                    Trước
                  </Button>
                  
                  <div className="text-xs">
                    <span className="font-medium">{userOrgsPage}</span> / {totalUserOrgsPages}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setUserOrgsPage(prev => Math.min(prev + 1, totalUserOrgsPages))}
                    disabled={userOrgsPage === totalUserOrgsPages}
                  >
                    Sau
                    <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              )}
            </div>
            
            <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
              {paginatedUserOrgs.map((org) => (
                <Card 
                  key={org.id} 
                  className={`overflow-hidden transition-all duration-200 hover:shadow-md ${org.id === localCurrentOrgId ? 'ring-2 ring-primary' : ''}`}
                >
                  <CardHeader className="p-3 pb-1">
                    <CardTitle className="text-sm flex items-center gap-2">
                      {org.logo ? (
                        <img src={org.logo} alt={org.name} className="h-4 w-4 rounded-md" />
                      ) : (
                        <Building className="h-3 w-3" />
                      )}
                      <div className="truncate">{org.name}</div>
                    </CardTitle>
                    <CardDescription className="text-xs line-clamp-1">
                      {org.description || 'Không có mô tả'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 pb-1">
                    {org.plan && (
                      <p className="text-xs text-muted-foreground">
                        Gói: <span className="font-medium">{org.plan}</span>
                      </p>
                    )}
                  </CardContent>
                  <CardFooter className="p-3 pt-1 gap-1">
                    <div className="flex gap-1 w-full">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1 h-7 text-xs"
                        onClick={() => handleShowDetails(org)}
                      >
                        <Info className="h-3 w-3 mr-1" />
                        Chi tiết
                      </Button>
                      {org.id === localCurrentOrgId ? (
                        <Button variant="outline" size="sm" className="flex-1 h-7 text-xs" disabled>
                          Hiện tại
                        </Button>
                      ) : (
                        <Button size="sm" className="flex-1 h-7 text-xs" onClick={() => handleSwitchOrganization(org.id)}>
                          Chuyển đổi
                        </Button>
                      )}
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-semibold">Tất cả tổ chức có sẵn</h2>
            
            <div className="flex items-center gap-3">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Tìm kiếm tổ chức..." 
                  className="pl-10 h-8"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setAllOrgsPage(1) // Reset về trang 1 khi tìm kiếm
                  }}
                />
              </div>
              
              {totalAllOrgsPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setAllOrgsPage(prev => Math.max(prev - 1, 1))}
                    disabled={allOrgsPage === 1}
                  >
                    <ChevronLeft className="h-3 w-3 mr-1" />
                    Trước
                  </Button>
                  
                  <div className="text-xs">
                    <span className="font-medium">{allOrgsPage}</span> / {totalAllOrgsPages}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setAllOrgsPage(prev => Math.min(prev + 1, totalAllOrgsPages))}
                    disabled={allOrgsPage === totalAllOrgsPages}
                  >
                    Sau
                    <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {filteredOrganizations.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-muted-foreground">Không tìm thấy tổ chức nào</p>
            </div>
          ) : (
            <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
              {paginatedAllOrgs.map((org) => (
                <Card 
                  key={org.id} 
                  className="overflow-hidden transition-all duration-200 hover:shadow-md"
                >
                  <CardHeader className="p-3 pb-1">
                    <CardTitle className="text-sm flex items-center gap-2">
                      {org.logo ? (
                        <img src={org.logo} alt={org.name} className="h-4 w-4 rounded-md" />
                      ) : (
                        <Building className="h-3 w-3" />
                      )}
                      <div className="truncate">{org.name}</div>
                      {checkMembershipStatus(org.id).isMember && (
                        <Badge variant="outline" className="ml-auto text-xs py-0 h-4 font-normal">
                          Đã tham gia
                        </Badge>
                      )}
                      {!checkMembershipStatus(org.id).isMember && checkMembershipStatus(org.id).status === 'pending' && (
                        <Badge variant="outline" className="ml-auto text-xs py-0 h-4 font-normal bg-amber-50">
                          Đang chờ duyệt
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="text-xs line-clamp-1">
                      {org.description || 'Không có mô tả'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 pb-1">
                    {org.plan && (
                      <p className="text-xs text-muted-foreground">
                        Gói: <span className="font-medium">{org.plan}</span>
                      </p>
                    )}
                  </CardContent>
                  <CardFooter className="p-3 pt-1 gap-1">
                    <div className="flex gap-1 w-full">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1 h-7 text-xs"
                        onClick={() => handleShowDetails(org)}
                      >
                        <Info className="h-3 w-3 mr-1" />
                        Chi tiết
                      </Button>
                      
                      {renderJoinButton(org)}
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Dialog hiển thị chi tiết tổ chức */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedOrg?.logo ? (
                <img src={selectedOrg.logo} alt={selectedOrg.name} className="h-6 w-6 rounded-md" />
              ) : (
                <Building className="h-6 w-6" />
              )}
              <span className="text-xl">{selectedOrg?.name}</span>
              {selectedOrg && checkMembershipStatus(selectedOrg.id).isMember && (
                <Badge variant="outline" className="ml-2">Đã tham gia</Badge>
              )}
              {selectedOrg && !checkMembershipStatus(selectedOrg.id).isMember && 
                checkMembershipStatus(selectedOrg.id).status === 'pending' && (
                <Badge variant="outline" className="ml-2 bg-amber-50">Đang chờ duyệt</Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-3">
            {/* Mô tả */}
            <div>
              <h3 className="text-sm font-semibold mb-1">Mô tả:</h3>
              <p className="text-sm text-muted-foreground">
                {selectedOrg?.description || 'Chưa có mô tả'}
              </p>
            </div>

            <div className="border-t my-2"></div>
            
            {/* Thông tin chi tiết */}
            <div className="grid grid-cols-[120px_1fr] gap-3 items-center">
              {selectedOrg?.website && (
                <>
                  <span className="text-sm font-medium">Website:</span>
                  <a 
                    href={selectedOrg.website} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-sm text-blue-500 hover:underline truncate"
                  >
                    {selectedOrg.website}
                  </a>
                </>
              )}
              
              {selectedOrg?.plan && (
                <>
                  <span className="text-sm font-medium">Gói dịch vụ:</span>
                  <span className="text-sm">{selectedOrg.plan}</span>
                </>
              )}
              
              <span className="text-sm font-medium">Thành lập từ năm:</span>
              <span className="text-sm">
                {selectedOrg?.founded_date || 'Chưa có thông tin'}
              </span>
              
              <span className="text-sm font-medium">Chủ sở hữu:</span>
              <span className="text-sm">
                {selectedOrg?.owner || 'Chưa có thông tin'}
              </span>
              
              <span className="text-sm font-medium">Số nhân viên:</span>
              <span className="text-sm">
                {selectedOrg?.employee_count ? `${selectedOrg.employee_count} thành viên` : 'Chưa có thông tin'}
              </span>
              
              <span className="text-sm font-medium">Số dự án:</span>
              <span className="text-sm">
                {selectedOrg?.project_count ? `${selectedOrg.project_count} dự án` : 'Chưa có thông tin'}
              </span>
              
              {selectedOrg?.industry && (
                <>
                  <span className="text-sm font-medium">Lĩnh vực:</span>
                  <span className="text-sm">{selectedOrg.industry}</span>
                </>
              )}
              
              {selectedOrg?.location && (
                <>
                  <span className="text-sm font-medium">Địa điểm:</span>
                  <span className="text-sm">{selectedOrg.location}</span>
                </>
              )}
              
              <span className="text-sm font-medium">Trạng thái:</span>
              <span className="text-sm">
                {selectedOrg && checkMembershipStatus(selectedOrg.id).isMember 
                  ? <span className="text-green-500 font-medium">Đã tham gia</span> 
                  : <span className="text-amber-500 font-medium">Chưa tham gia</span>
                }
              </span>
            </div>
          </div>
          
          <DialogFooter className="gap-3 flex-row sm:justify-between border-t pt-4">
            {selectedOrg && (
              <>
                {checkMembershipStatus(selectedOrg.id).isMember ? (
                  selectedOrg.id === localCurrentOrgId ? (
                    <Button variant="outline" disabled>
                      <Building className="mr-2 h-4 w-4" />
                      Hiện tại
                    </Button>
                  ) : (
                    <Button onClick={() => handleSwitchOrganization(selectedOrg.id)}>
                      <Building className="mr-2 h-4 w-4" />
                      Chuyển đổi
                    </Button>
                  )
                ) : checkMembershipStatus(selectedOrg.id).status === 'pending' ? (
                  <Button variant="outline" disabled>
                    <Clock className="mr-2 h-4 w-4" />
                    Đang chờ duyệt
                  </Button>
                ) : (
                  <Button onClick={() => handleJoinOrganization(selectedOrg.id)}>
                    <Users className="mr-2 h-4 w-4" />
                    Tham gia tổ chức
                  </Button>
                )}
                
                <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
                  Đóng
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

OrganizationIndex.layout = (page: React.ReactNode) => <AppLayout title="Tổ chức">{page}</AppLayout> 