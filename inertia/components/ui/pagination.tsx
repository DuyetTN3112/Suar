import React from 'react'
import { Link } from '@inertiajs/react'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

type PaginationProps = {
  currentPage: number
  totalPages: number
  baseUrl: string
  queryParams?: Record<string, any>
}

export const Pagination: React.FC<PaginationProps> = ({ 
  currentPage, 
  totalPages, 
  baseUrl,
  queryParams = {}
}) => {
  const pages = []
  
  // Xây dựng query string từ các tham số
  const buildQueryString = (page: number) => {
    const params = new URLSearchParams()
    
    // Thêm trang hiện tại
    params.append('page', page.toString())
    
    // Thêm các tham số khác
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null && key !== 'page') {
        params.append(key, value.toString())
      }
    })
    
    return params.toString()
  }
  
  // Tạo URL cho từng trang
  const createPageUrl = (page: number) => {
    const queryString = buildQueryString(page)
    return `${baseUrl}?${queryString}`
  }
  
  // Logic tạo danh sách trang
  const maxVisiblePages = 3
  
  if (totalPages <= maxVisiblePages) {
    // Hiển thị tất cả các trang nếu tổng số trang nhỏ hơn hoặc bằng số trang tối đa hiển thị
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i)
    }
  } else {
    // Luôn hiển thị trang đầu
    pages.push(1)
    
    // Tính toán phạm vi trang giữa
    let startPage = Math.max(2, currentPage - Math.floor(maxVisiblePages / 2))
    let endPage = Math.min(totalPages - 1, startPage + maxVisiblePages - 3)
    
    // Điều chỉnh startPage nếu endPage quá gần với totalPages
    if (endPage === totalPages - 1) {
      startPage = Math.max(2, endPage - (maxVisiblePages - 3))
    }
    
    // Thêm dấu ... nếu cần
    if (startPage > 2) {
      pages.push(null) // Dùng null cho dấu ...
    }
    
    // Thêm các trang ở giữa
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i)
    }
    
    // Thêm dấu ... nếu cần
    if (endPage < totalPages - 1) {
      pages.push(null) // Dùng null cho dấu ...
    }
    
    // Luôn hiển thị trang cuối
    pages.push(totalPages)
  }
  
  return (
    <div className="flex items-center justify-center space-x-0.5">
      {/* First page button */}
      <Button 
        variant="outline"
        size="icon"
        disabled={currentPage === 1}
        asChild={currentPage !== 1}
        className="w-5 h-5"
      >
        {currentPage === 1 ? (
          <span>
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m11 17-5-5 5-5"/>
              <path d="m18 17-5-5 5-5"/>
            </svg>
          </span>
        ) : (
          <Link href={createPageUrl(1)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m11 17-5-5 5-5"/>
              <path d="m18 17-5-5 5-5"/>
            </svg>
          </Link>
        )}
      </Button>
      
      {/* Previous page button */}
      <Button
        variant="outline"
        size="icon"
        disabled={currentPage === 1}
        asChild={currentPage !== 1}
        className="w-5 h-5"
      >
        {currentPage === 1 ? (
          <span>
            <ChevronLeft className="h-3 w-3" />
          </span>
        ) : (
          <Link href={createPageUrl(currentPage - 1)}>
            <ChevronLeft className="h-3 w-3" />
          </Link>
        )}
      </Button>
      
      {pages.map((page, i) => {
        if (page === null) {
          return (
            <Button key={`ellipsis-${i}`} variant="outline" size="icon" disabled className="w-5 h-5 text-[10px]">
              ...
            </Button>
          )
        }
        
        return (
          <Button
            key={`page-${page}`}
            variant={currentPage === page ? "default" : "outline"}
            size="icon"
            asChild={currentPage !== page}
            className="w-5 h-5 text-[10px]"
          >
            {currentPage === page ? (
              <span>{page}</span>
            ) : (
              <Link href={createPageUrl(page)}>
                {page}
              </Link>
            )}
          </Button>
        )
      })}
      
      {/* Next page button */}
      <Button
        variant="outline"
        size="icon"
        disabled={currentPage === totalPages}
        asChild={currentPage !== totalPages}
        className="w-5 h-5"
      >
        {currentPage === totalPages ? (
          <span>
            <ChevronRight className="h-3 w-3" />
          </span>
        ) : (
          <Link href={createPageUrl(currentPage + 1)}>
            <ChevronRight className="h-3 w-3" />
          </Link>
        )}
      </Button>
      
      {/* Last page button */}
      <Button 
        variant="outline"
        size="icon"
        disabled={currentPage === totalPages}
        asChild={currentPage !== totalPages}
        className="w-5 h-5"
      >
        {currentPage === totalPages ? (
          <span>
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m13 17 5-5-5-5"/>
              <path d="m6 17 5-5-5-5"/>
            </svg>
          </span>
        ) : (
          <Link href={createPageUrl(totalPages)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m13 17 5-5-5-5"/>
              <path d="m6 17 5-5-5-5"/>
            </svg>
          </Link>
        )}
      </Button>
    </div>
  )
} 