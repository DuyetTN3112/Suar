import React from 'react'
import OrganizationCard from './OrganizationCard'
import { Building, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Link } from '@inertiajs/react'

interface Organization {
  id: number
  name: string
  description: string | null
  owner_id: number
  website: string | null
  logo: string | null
  plan: string | null
  slug: string
  created_at: string
  updated_at: string
  role_name?: string
  role_id?: number
}

interface OrganizationListProps {
  organizations: Organization[]
  currentOrganizationId?: number | null
  showSwitchButton?: boolean
  showJoinButton?: boolean
  emptyMessage?: string
  emptyDescription?: string
}

export default function OrganizationList({
  organizations,
  currentOrganizationId,
  showSwitchButton = false,
  showJoinButton = false,
  emptyMessage = 'Chưa có tổ chức nào',
  emptyDescription = 'Hãy tạo tổ chức đầu tiên để bắt đầu sử dụng hệ thống.'
}: OrganizationListProps) {
  if (organizations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-6 mb-4">
          <Building className="h-12 w-12 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold">{emptyMessage}</h2>
        <p className="text-muted-foreground mt-2 max-w-md">
          {emptyDescription}
        </p>
        <Button className="mt-4" asChild>
          <Link href="/organizations/create">
            <Plus className="mr-2 h-4 w-4" /> Tạo tổ chức mới
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {organizations.map((org) => (
        <OrganizationCard
          key={org.id}
          organization={org}
          isCurrentOrganization={currentOrganizationId === org.id}
          userRole={org.role_name}
          showSwitchButton={showSwitchButton}
          showJoinButton={showJoinButton}
        />
      ))}
    </div>
  )
} 