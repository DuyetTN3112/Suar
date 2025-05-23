import React from 'react'
import { Link } from '@inertiajs/react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Info, Users, ArrowRight } from 'lucide-react'

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
}

interface OrganizationCardProps {
  organization: Organization
  isCurrentOrganization?: boolean
  userRole?: string
  showJoinButton?: boolean
  showSwitchButton?: boolean
}

export default function OrganizationCard({
  organization,
  isCurrentOrganization = false,
  userRole,
  showJoinButton = false,
  showSwitchButton = false
}: OrganizationCardProps) {
  return (
    <Card key={organization.id} className={`overflow-hidden transition-all duration-200 ${
      isCurrentOrganization ? 'ring-2 ring-primary' : ''
    }`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-xl">
            {organization.name}
          </CardTitle>
          {isCurrentOrganization && (
            <Badge variant="outline" className="bg-primary/10 text-primary">Hiện tại</Badge>
          )}
        </div>
        <CardDescription className="line-clamp-2">
          {organization.description || 'Chưa có mô tả'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center text-sm text-muted-foreground mb-2">
          <Info className="h-4 w-4 mr-2" />
          <span>ID: {organization.id}</span>
        </div>
        {userRole && (
          <div className="flex items-center text-sm text-muted-foreground mb-2">
            <Users className="h-4 w-4 mr-2" />
            <span>Vai trò: {userRole}</span>
          </div>
        )}
        {organization.website && (
          <div className="text-sm text-muted-foreground truncate">
            {organization.website}
          </div>
        )}
        {organization.plan && (
          <div className="mt-1">
            <Badge variant="secondary">{organization.plan}</Badge>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between pt-2">
        <Button asChild variant="outline">
          <Link href={`/organizations/${organization.id}`}>
            Xem chi tiết
          </Link>
        </Button>
        {showSwitchButton && !isCurrentOrganization && (
          <Button asChild variant="secondary">
            <Link href={`/organizations/switch/${organization.id}`}>
              Chọn <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        )}
        {showJoinButton && (
          <Button asChild variant="secondary">
            <Link href={`/organizations/${organization.id}/join`}>
              Tham gia
            </Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  )
} 