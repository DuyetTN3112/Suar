import React from 'react'
import { Head } from '@inertiajs/react'
import AppLayout from '@/layouts/app_layout'
import { OrganizationDebugTool } from './components/organization-debug-tool'
import useTranslation from '@/hooks/use_translation'

export default function OrganizationDebug() {
  const { t } = useTranslation()
  const pageTitle = t('organization.debug_tool', {}, 'Công cụ kiểm tra tổ chức')

  return (
    <>
      <Head title={pageTitle} />

      <div className="container py-10">
        <h1 className="text-2xl font-semibold mb-6">
          {pageTitle}
        </h1>
        
        <p className="mb-8 text-muted-foreground">
          {t(
            'organization.debug_tool_description',
            {},
            'Công cụ này giúp kiểm tra và sửa các vấn đề liên quan đến tổ chức hiện tại.'
          )}
        </p>
        
        <div className="flex justify-center">
          <OrganizationDebugTool />
        </div>
      </div>
    </>
  )
}

OrganizationDebug.layout = (page: React.ReactNode) => <AppLayout title="Công cụ kiểm tra tổ chức">{page}</AppLayout> 