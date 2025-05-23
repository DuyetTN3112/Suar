import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle, CheckCircle } from 'lucide-react'
import axios from 'axios'
import { useToast } from '@/components/ui/use-toast'
import { router } from '@inertiajs/react'

export function OrganizationDebugTool() {
  const [loading, setLoading] = useState(false)
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [fixed, setFixed] = useState(false)
  const { toast } = useToast()

  const getDebugInfo = async () => {
    setLoading(true)
    setError(null)
    setFixed(false)
    
    try {
      const response = await axios.get('/api/debug-organization-info')
      if (response.data.success) {
        setDebugInfo(response.data.debug)
      } else {
        setError(response.data.message || 'Không thể lấy thông tin debug')
      }
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi khi lấy thông tin debug')
    } finally {
      setLoading(false)
    }
  }

  const fixOrganizationIssues = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Nếu người dùng chưa có tổ chức hiện tại nhưng có tổ chức trong danh sách
      if (debugInfo && !debugInfo.user_current_organization_id && !debugInfo.session_organization_id && debugInfo.organizations.length > 0) {
        const firstOrg = debugInfo.organizations[0]
        
        // Gọi API chuyển sang tổ chức đầu tiên
        const response = await axios.post('/switch-organization', {
          organization_id: firstOrg.id
        })
        
        if (response.data.success) {
          toast({
            title: 'Đã sửa thành công',
            description: `Đã chuyển sang tổ chức "${firstOrg.name}"`,
            type: 'success'
          })
          setFixed(true)
          
          // Tải lại trang để áp dụng thay đổi
          setTimeout(() => {
            router.reload()
          }, 1000)
        } else {
          setError(response.data.message || 'Không thể chuyển tổ chức')
        }
      } 
      // Nếu session và user model có sự khác biệt
      else if (debugInfo && debugInfo.user_current_organization_id !== debugInfo.session_organization_id) {
        // Sử dụng giá trị từ session nếu có, ngược lại dùng từ user
        const orgId = debugInfo.session_organization_id || debugInfo.user_current_organization_id
        
        // Gọi API để đồng bộ
        const response = await axios.post('/switch-organization', {
          organization_id: orgId
        })
        
        if (response.data.success) {
          toast({
            title: 'Đã đồng bộ thành công',
            description: 'Đã đồng bộ thông tin tổ chức hiện tại',
            type: 'success'
          })
          setFixed(true)
          
          setTimeout(() => {
            router.reload()
          }, 1000)
        } else {
          setError(response.data.message || 'Không thể đồng bộ thông tin tổ chức')
        }
      } else {
        toast({
          title: 'Không có vấn đề',
          description: 'Không phát hiện vấn đề với thông tin tổ chức hiện tại',
          type: 'info'
        })
      }
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi khi sửa vấn đề tổ chức')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Công cụ Kiểm tra Tổ chức</CardTitle>
        <CardDescription>
          Dùng để kiểm tra và sửa các vấn đề với thông tin tổ chức hiện tại
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Lỗi</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {fixed && (
          <Alert variant="default" className="mb-4 bg-green-50 text-green-800 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle>Đã sửa</AlertTitle>
            <AlertDescription>Vấn đề đã được sửa thành công. Đang tải lại trang...</AlertDescription>
          </Alert>
        )}
        
        {debugInfo && (
          <div className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-2 border-b pb-2">
              <div className="font-medium">User ID:</div>
              <div>{debugInfo.user_id}</div>
            </div>
            <div className="grid grid-cols-2 gap-2 border-b pb-2">
              <div className="font-medium">Tên người dùng:</div>
              <div>{debugInfo.user_name}</div>
            </div>
            <div className="grid grid-cols-2 gap-2 border-b pb-2">
              <div className="font-medium">Tổ chức từ user model:</div>
              <div>{debugInfo.user_current_organization_id || 'Chưa chọn'}</div>
            </div>
            <div className="grid grid-cols-2 gap-2 border-b pb-2">
              <div className="font-medium">Tổ chức từ session:</div>
              <div>{debugInfo.session_organization_id || 'Chưa chọn'}</div>
            </div>
            <div className="grid grid-cols-2 gap-2 border-b pb-2">
              <div className="font-medium">Đồng bộ:</div>
              <div>
                {debugInfo.user_current_organization_id === debugInfo.session_organization_id ? (
                  <span className="text-green-600">OK</span>
                ) : (
                  <span className="text-orange-600">Không đồng bộ</span>
                )}
              </div>
            </div>
            <div className="space-y-2 pt-2">
              <div className="font-medium">Tổ chức người dùng tham gia:</div>
              <div className="ml-2">
                {debugInfo.organizations.length > 0 ? (
                  <ul className="list-disc pl-5 space-y-1">
                    {debugInfo.organizations.map((org: any) => (
                      <li key={org.id}>
                        {org.name} (ID: {org.id})
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="italic text-gray-500">Chưa tham gia tổ chức nào</span>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={getDebugInfo}
          disabled={loading}
        >
          {loading && !fixed ? 'Đang tải...' : 'Kiểm tra'}
        </Button>
        
        <Button
          onClick={fixOrganizationIssues}
          disabled={loading || !debugInfo}
        >
          {loading && fixed ? 'Đang sửa...' : 'Sửa vấn đề'}
        </Button>
      </CardFooter>
    </Card>
  )
}

export default OrganizationDebugTool 