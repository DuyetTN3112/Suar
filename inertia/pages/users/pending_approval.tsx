import React from 'react'
import { Head, usePage } from '@inertiajs/react'
import AppLayout from '@/layouts/app_layout'
import { Button } from '@/components/ui/button'
import useTranslation from '@/hooks/use_translation'
import UserSearchForm from './components/UserSearchForm'
import PendingApprovalTable from './components/PendingApprovalTable'
import { PendingApprovalProps } from './types'
import { usePendingApproval } from './hooks/use_pending_approval'

export default function PendingApproval({ users, filters, metadata }: PendingApprovalProps) {
  const [search, setSearch] = React.useState(filters.search || '')
  const { auth } = usePage().props as any
  const { t } = useTranslation()
  const { approveAllUsers } = usePendingApproval(users)
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const queryParams = new URLSearchParams()
    
    if (search) queryParams.append('search', search)
    
    const queryString = queryParams.toString()
    window.location.href = `/users/pending-approval${queryString ? `?${queryString}` : ''}`
  }

  return (
    <>
      <Head title={t('user.pending_approval', {}, "Phê duyệt người dùng")} />
      <div className="container py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{t('user.pending_approval', {}, "Phê duyệt người dùng")}</h1>
          <Button onClick={approveAllUsers} disabled={!users.data.length}>
            {t('user.approve_all', {}, "Phê duyệt tất cả")}
          </Button>
        </div>
        
        <div className="mt-6">
          <UserSearchForm 
            search={search}
            setSearch={setSearch}
            handleSearch={handleSearch}
          />
        </div>
        
        <div className="mt-6">
          <PendingApprovalTable 
            users={users} 
            filters={filters} 
          />
        </div>
      </div>
    </>
  )
}

PendingApproval.layout = (page: React.ReactNode) => <AppLayout title="Phê duyệt người dùng">{page}</AppLayout> 