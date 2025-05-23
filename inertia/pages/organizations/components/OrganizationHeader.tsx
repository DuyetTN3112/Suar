import React from 'react'
import { Button } from '@/components/ui/button'
import { Link } from '@inertiajs/react'
import { Plus } from 'lucide-react'

interface OrganizationHeaderProps {
  title: string
  description: string
  showCreateButton?: boolean
}

export default function OrganizationHeader({
  title,
  description,
  showCreateButton = true,
}: OrganizationHeaderProps) {
  return (
    <div className="flex justify-between items-center mb-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground mt-1">
          {description}
        </p>
      </div>
      {showCreateButton && (
        <Button asChild>
          <Link href="/organizations/create">
            <Plus className="mr-2 h-4 w-4" /> Tạo tổ chức mới
          </Link>
        </Button>
      )}
    </div>
  )
} 