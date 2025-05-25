import React, { useState, useEffect } from 'react'
import { Link, router } from '@inertiajs/react'
import { Button } from '@/components/ui/button'
import { Building, Plus, ArrowRight, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import AppLayout from '@/layouts/app_layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import axios from 'axios'

interface Organization {
  id: number
  name: string
  description: string | null
  logo: string | null
  website: string | null
  plan: string | null
}

export default function RequireOrganization() {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const organizationsPerPage = 6 // 3 tổ chức mỗi hàng, 2 hàng mỗi trang

  // Tải danh sách tổ chức từ API
  useEffect(() => {
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

    void fetchOrganizations()
  }, [])

  // Xử lý việc tham gia tổ chức
  const handleJoinOrganization = (id: number) => {
    router.post(`/organizations/${id}/join`)
  }

  // Lọc tổ chức theo từ khóa tìm kiếm
  const filteredOrganizations = organizations.filter((org) =>
    org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (org.description && org.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  // Phân trang
  const indexOfLastOrg = currentPage * organizationsPerPage
  const indexOfFirstOrg = indexOfLastOrg - organizationsPerPage
  const currentOrganizations = filteredOrganizations.slice(indexOfFirstOrg, indexOfLastOrg)
  const totalPages = Math.ceil(filteredOrganizations.length / organizationsPerPage)

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber)

  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-12 bg-slate-50 dark:bg-slate-900">
      <div className="text-center w-full max-w-5xl px-4">
        <div className="flex justify-center mb-6">
          <div className="h-24 w-24 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
            <Building className="h-12 w-12 text-slate-500 dark:text-slate-400" />
          </div>
        </div>
        <h1 className="text-4xl font-extrabold text-slate-900 dark:text-slate-50">Cần có tổ chức</h1>
        <h2 className="text-xl font-medium text-slate-800 dark:text-slate-200 mt-4">
          Bạn cần tham gia hoặc tạo một tổ chức để truy cập tính năng này
        </h2>
        <p className="text-lg text-slate-600 dark:text-slate-400 mt-4">
          Để sử dụng đầy đủ tính năng của hệ thống, bạn cần phải là thành viên của ít nhất một tổ chức.
        </p>

        {/* Hiển thị danh sách các tổ chức */}
        <div className="mt-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200">Danh sách tổ chức có sẵn</h3>
            <div className="relative w-64">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Tìm kiếm tổ chức..."
                className="pl-8 pr-4"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1) // Reset về trang đầu khi tìm kiếm
                }}
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-800 dark:border-slate-200"></div>
            </div>
          ) : error ? (
            <div className="text-red-500 py-8">{error}</div>
          ) : filteredOrganizations.length === 0 ? (
            <Card className="mb-4 shadow-sm">
              <CardContent className="pt-6 pb-6">
                <p className="text-slate-600 dark:text-slate-400">Không có tổ chức nào phù hợp với tìm kiếm của bạn.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {currentOrganizations.map((org) => (
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
                    <CardContent className="py-4">
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
                        size="sm"
                        className="w-full"
                      >
                        Tham gia <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>

              {/* Phân trang */}
              {totalPages > 1 && (
                <div className="flex justify-center mt-8 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="w-10 h-10 p-0 rounded-full"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => paginate(page)}
                      className="w-10 h-10 p-0 rounded-full"
                    >
                      {page}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="w-10 h-10 p-0 rounded-full"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
          <Button asChild size="lg">
            <Link href="/organizations">
              <Building className="mr-2 h-5 w-5" />
              Xem tổ chức
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/organizations/create">
              <Plus className="mr-2 h-5 w-5" />
              Tạo tổ chức mới
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

RequireOrganization.layout = (page: React.ReactNode) => <AppLayout title="Cần tham gia tổ chức">{page}</AppLayout>
