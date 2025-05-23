'use client'

import React, { useState, useEffect } from 'react'
import { router } from '@inertiajs/react'
import axios from 'axios'
import { Building, Plus, ArrowRight, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

interface Organization {
  id: number
  name: string
  description: string | null
  logo: string | null
  website: string | null
  plan: string | null
}

interface OrganizationRequiredDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function OrganizationRequiredDialog({
  open,
  onOpenChange,
}: OrganizationRequiredDialogProps) {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  // Tải danh sách tổ chức từ API
  useEffect(() => {
    if (open) {
      const fetchOrganizations = async () => {
        try {
          setLoading(true)
          const response = await axios.get('/api/organizations')
          setOrganizations(response.data)
          setLoading(false)
        } catch (err) {
          console.error('Lỗi khi tải danh sách tổ chức:', err)
          setError('Không thể tải danh sách tổ chức')
          setLoading(false)
        }
      }
      fetchOrganizations()
    }
  }, [open])

  // Xử lý việc tham gia tổ chức
  const handleJoinOrganization = (id: number) => {
    // Sử dụng Inertia router để gửi request
    router.post(`/organizations/${id}/join`)
  }

  // Lọc tổ chức theo từ khóa tìm kiếm
  const filteredOrganizations = organizations.filter((org) =>
    org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (org.description && org.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[95%] md:max-w-[80%] lg:max-w-[65%] xl:max-w-[50%] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
              <Building className="h-8 w-8 text-slate-500 dark:text-slate-400" />
            </div>
          </div>
          <DialogTitle className="text-center text-2xl">Cần có tổ chức</DialogTitle>
          <DialogDescription className="text-center">
            Bạn cần tham gia hoặc tạo một tổ chức để truy cập tính năng này.<br />
            Để sử dụng đầy đủ tính năng của hệ thống, bạn cần phải là thành viên của ít nhất một tổ chức.
          </DialogDescription>
        </DialogHeader>
        
        {/* Tìm kiếm */}
        <div className="relative mt-4 mb-6">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Tìm kiếm tổ chức..."
            className="pl-8 pr-4"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Danh sách tổ chức */}
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-800 dark:border-slate-200"></div>
          </div>
        ) : error ? (
          <div className="text-red-500 py-4 text-center">{error}</div>
        ) : filteredOrganizations.length === 0 ? (
          <Card className="mb-4 shadow-sm">
            <CardContent className="pt-6 pb-6 text-center">
              <p className="text-slate-600 dark:text-slate-400">Không có tổ chức nào phù hợp với tìm kiếm của bạn.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[50vh] overflow-y-auto pr-1">
            {filteredOrganizations.map((org) => (
              <Card
                key={org.id}
                className="overflow-hidden transition-all duration-200 hover:shadow-lg border border-slate-200 dark:border-slate-700 rounded-xl"
              >
                <CardHeader className="pb-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    {org.logo ? (
                      <img src={org.logo} alt={org.name} className="h-6 w-6 rounded-md" />
                    ) : (
                      <Building className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                    )}
                    {org.name}
                  </CardTitle>
                  <CardDescription className="line-clamp-2 h-10">
                    {org.description || 'Không có mô tả'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="py-3">
                  {org.website && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                      Website: <a href={org.website} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{org.website}</a>
                    </p>
                  )}
                  {org.plan && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      Gói: <span className="font-medium">{org.plan}</span>
                    </p>
                  )}
                </CardContent>
                <CardFooter className="pt-0 flex justify-end border-t border-slate-100 dark:border-slate-700">
                  <Button
                    onClick={() => handleJoinOrganization(org.id)}
                    className="w-full"
                  >
                    Tham gia <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        <DialogFooter className="sm:justify-center gap-3 mt-6">
          <Button asChild variant="default" size="lg">
            <a href="/organizations">
              <Building className="mr-2 h-5 w-5" />
              Xem tổ chức
            </a>
          </Button>
          <Button asChild variant="outline" size="lg">
            <a href="/organizations/create">
              <Plus className="mr-2 h-5 w-5" />
              Tạo tổ chức mới
            </a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 