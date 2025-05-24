import React, { useState } from 'react'
import { Head } from '@inertiajs/react'
import { router } from '@inertiajs/react'
import AppLayout from '@/layouts/app_layout'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { ProjectShowProps, Task } from './types'
import useTranslation from '@/hooks/use_translation'
import { formatDate } from '@/lib/utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function ProjectShow({ project, members, tasks, permissions, auth }: ProjectShowProps) {
  const { t } = useTranslation()
  const [addMemberOpen, setAddMemberOpen] = useState(false)
  const [newMemberEmail, setNewMemberEmail] = useState('')

  // Guard against undefined props
  const safeTasks = tasks || []
  const safeMembers = members || []

  const handleDeleteProject = () => {
    if (confirm(t('common.confirm_delete', {}, 'Bạn có chắc chắn muốn xóa?'))) {
      router.delete(`/projects/${project.id}`)
    }
  }

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault()
    router.post('/projects/members', {
      project_id: project.id,
      email: newMemberEmail
    })
    setNewMemberEmail('')
    setAddMemberOpen(false)
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2)
  }

  return (
    <AppLayout title={project.name}>
      <Head title={project.name} />

      <div className="p-4 sm:p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">{project.name}</h1>
            <p className="text-muted-foreground">{project.organization_name}</p>
          </div>

          <div className="flex items-center gap-2">
            {permissions.isCreator || permissions.isManager ? (
              <Button
                variant="destructive"
                onClick={handleDeleteProject}
              >
                {t('common.delete', {}, 'Xóa')}
              </Button>
            ) : null}

            <Button
              onClick={() => router.visit('/projects')}
              variant="outline"
            >
              {t('common.back', {}, 'Quay lại')}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="details">
          <TabsList>
            <TabsTrigger value="details">{t('project.details', {}, 'Chi tiết')}</TabsTrigger>
            <TabsTrigger value="members">{t('project.members', {}, 'Thành viên')}</TabsTrigger>
            <TabsTrigger value="tasks">{t('project.tasks', {}, 'Công việc')}</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">
                      {t('project.description', {}, 'Mô tả')}
                    </h3>
                    <p>{project.description || t('common.not_available', {}, 'Không có')}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">
                      {t('project.status', {}, 'Trạng thái')}
                    </h3>
                    <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {project.status || t('common.not_available', {}, 'Không có')}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">
                      {t('project.start_date', {}, 'Ngày bắt đầu')}
                    </h3>
                    <p>{project.start_date ? formatDate(project.start_date) : t('common.not_available', {}, 'Không có')}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">
                      {t('project.end_date', {}, 'Ngày kết thúc')}
                    </h3>
                    <p>{project.end_date ? formatDate(project.end_date) : t('common.not_available', {}, 'Không có')}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">
                      {t('project.creator', {}, 'Người tạo')}
                    </h3>
                    <p>{project.creator_name || t('common.not_available', {}, 'Không có')}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">
                      {t('project.manager', {}, 'Quản lý')}
                    </h3>
                    <p>{project.manager_name || t('common.not_available', {}, 'Không có')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="members" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{t('project.members', {}, 'Thành viên')}</CardTitle>
                {(permissions.isCreator || permissions.isManager) && (
                  <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        {t('project.add_member', {}, 'Thêm thành viên')}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{t('project.add_member', {}, 'Thêm thành viên')}</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleAddMember} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="email">{t('common.email', {}, 'Email')}</Label>
                          <Input
                            id="email"
                            type="email"
                            value={newMemberEmail}
                            onChange={(e) => setNewMemberEmail(e.target.value)}
                            placeholder="email@example.com"
                            required
                          />
                        </div>
                        <Button type="submit">{t('common.add', {}, 'Thêm')}</Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                )}
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {safeMembers.length === 0 ? (
                    <p className="col-span-full text-center py-4 text-muted-foreground">
                      {t('project.no_members', {}, 'Chưa có thành viên nào')}
                    </p>
                  ) : (
                    safeMembers.map((member) => (
                      <div key={member.id} className="flex items-center space-x-3 p-3 border rounded-md">
                        <Avatar>
                          <AvatarFallback>{member.username?.[0]?.toUpperCase() || member.email?.[0]?.toUpperCase() || '?'}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{member.username || member.email}</p>
                          <p className="text-sm text-muted-foreground">{member.email}</p>
                          <p className="text-xs text-muted-foreground">{member.role}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tasks" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{t('project.tasks', {}, 'Công việc')}</CardTitle>
                <Button size="sm" onClick={() => router.visit('/tasks')}>
                  {t('project.view_all_tasks', {}, 'Xem tất cả công việc')}
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('task.title', {}, 'Tiêu đề')}</TableHead>
                      <TableHead>{t('task.status', {}, 'Trạng thái')}</TableHead>
                      <TableHead>{t('task.priority', {}, 'Độ ưu tiên')}</TableHead>
                      <TableHead>{t('task.assignee', {}, 'Người thực hiện')}</TableHead>
                      <TableHead>{t('task.due_date', {}, 'Hạn chót')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {safeTasks.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4">
                          {t('project.no_tasks', {}, 'Chưa có công việc nào')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      safeTasks.map((task: Task) => (
                        <TableRow key={task.id}>
                          <TableCell className="font-medium">{task.title}</TableCell>
                          <TableCell>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {task.status}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              {task.priority || '-'}
                            </span>
                          </TableCell>
                          <TableCell>{task.assignee_name || '-'}</TableCell>
                          <TableCell>{task.due_date ? formatDate(task.due_date) : '-'}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}
