<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import AppLayout from '@/layouts/app_layout.svelte'
  import Button from '@/components/ui/button.svelte'
   import { FRONTEND_ROUTES } from '@/constants'
  import Card from '@/components/ui/card.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import Table from '@/components/ui/table.svelte'
  import TableHeader from '@/components/ui/table_header.svelte'
  import TableBody from '@/components/ui/table_body.svelte'
  import TableRow from '@/components/ui/table_row.svelte'
  import TableHead from '@/components/ui/table_head.svelte'
  import TableCell from '@/components/ui/table_cell.svelte'
  import Tabs from '@/components/ui/tabs.svelte'
  import TabsContent from '@/components/ui/tabs_content.svelte'
  import TabsList from '@/components/ui/tabs_list.svelte'
  import TabsTrigger from '@/components/ui/tabs_trigger.svelte'
  import Avatar from '@/components/ui/avatar.svelte'
  import AvatarFallback from '@/components/ui/avatar_fallback.svelte'
  import Dialog from '@/components/ui/dialog.svelte'
  import DialogContent from '@/components/ui/dialog_content.svelte'
  import DialogHeader from '@/components/ui/dialog_header.svelte'
  import DialogTitle from '@/components/ui/dialog_title.svelte'
  import Input from '@/components/ui/input.svelte'
  import Label from '@/components/ui/label.svelte'
  import type { ProjectShowProps } from './types'
  import { formatDate } from '@/lib/utils'

  const { project, members, tasks, permissions }: ProjectShowProps = $props()
  const safeTasks = $derived(tasks)
  const safeMembers = $derived(members)

  let addMemberOpen = $state(false)
  let newMemberEmail = $state('')

  function getMemberInitials(member: (typeof safeMembers)[number]): string {
    const fromUsername = member.username ? member.username.charAt(0).toUpperCase() : ''
    const fromEmail = member.email ? member.email.charAt(0).toUpperCase() : ''
    return fromUsername || fromEmail || '?'
  }

  function handleDeleteProject() {
    if (confirm('Bạn có chắc chắn muốn xóa?')) {
      router.delete(`/projects/${project.id}`)
    }
  }

  function handleAddMember(e: Event) {
    e.preventDefault()
    router.post('/projects/members', {
      project_id: project.id,
      email: newMemberEmail
    })
    newMemberEmail = ''
    addMemberOpen = false
  }

</script>

<svelte:head>
  <title>{project.name}</title>
</svelte:head>

<AppLayout title={project.name}>
  <div class="p-4 sm:p-6 space-y-6">
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold">{project.name}</h1>
        <p class="text-muted-foreground">{project.organization_name}</p>
      </div>

      <div class="flex items-center gap-2">
        {#if permissions.isCreator || permissions.isManager}
          <Button variant="destructive" onclick={handleDeleteProject}>
            Xóa
          </Button>
        {/if}

        <Button onclick={() => { router.get('/projects'); }} variant="outline">
          Quay lại
        </Button>
      </div>
    </div>

    <Tabs value="details">
      <TabsList>
        <TabsTrigger value="details">Chi tiết</TabsTrigger>
        <TabsTrigger value="members">Thành viên</TabsTrigger>
        <TabsTrigger value="tasks">Công việc</TabsTrigger>
      </TabsList>

      <TabsContent value="details" class="mt-4">
        <Card>
          <CardContent class="pt-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 class="text-sm font-medium text-muted-foreground mb-1">Mô tả</h3>
                <p>{project.description || 'Không có'}</p>
              </div>

              <div>
                <h3 class="text-sm font-medium text-muted-foreground mb-1">Trạng thái</h3>
                <div class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {project.status || 'Không có'}
                </div>
              </div>

              <div>
                <h3 class="text-sm font-medium text-muted-foreground mb-1">Ngày bắt đầu</h3>
                <p>{project.start_date ? formatDate(project.start_date) : 'Không có'}</p>
              </div>

              <div>
                <h3 class="text-sm font-medium text-muted-foreground mb-1">Ngày kết thúc</h3>
                <p>{project.end_date ? formatDate(project.end_date) : 'Không có'}</p>
              </div>

              <div>
                <h3 class="text-sm font-medium text-muted-foreground mb-1">Người tạo</h3>
                <p>{project.creator_name || 'Không có'}</p>
              </div>

              <div>
                <h3 class="text-sm font-medium text-muted-foreground mb-1">Quản lý</h3>
                <p>{project.manager_name || 'Không có'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="members" class="mt-4">
        <Card>
          <CardHeader class="flex flex-row items-center justify-between">
            <CardTitle>Thành viên</CardTitle>
            {#if permissions.isCreator || permissions.isManager}
              <Dialog bind:open={addMemberOpen}>
                <Button size="sm" onclick={() => { addMemberOpen = true }}>
                  Thêm thành viên
                </Button>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Thêm thành viên</DialogTitle>
                  </DialogHeader>
                  <form onsubmit={handleAddMember} class="space-y-4">
                    <div class="space-y-2">
                      <Label for="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        bind:value={newMemberEmail}
                        placeholder="email@example.com"
                        required
                      />
                    </div>
                    <Button type="submit">Thêm</Button>
                  </form>
                </DialogContent>
              </Dialog>
            {/if}
          </CardHeader>
          <CardContent>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {#if safeMembers.length === 0}
                <p class="col-span-full text-center py-4 text-muted-foreground">
                  Chưa có thành viên nào
                </p>
              {:else}
                {#each safeMembers as member, index (`${member.user_id ?? member.email}-${index}`)}
                  <div class="flex items-center space-x-3 p-3 border rounded-md">
                    <Avatar>
                      <AvatarFallback>{getMemberInitials(member)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p class="font-medium">{member.username || member.email}</p>
                      <p class="text-sm text-muted-foreground">{member.email}</p>
                      <p class="text-xs text-muted-foreground">{member.role}</p>
                    </div>
                  </div>
                {/each}
              {/if}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="tasks" class="mt-4">
        <Card>
          <CardHeader class="flex flex-row items-center justify-between">
            <CardTitle>Công việc</CardTitle>
              <Button size="sm" onclick={() => { router.get(FRONTEND_ROUTES.TASKS, { project_id: project.id }); }}>
              Xem tất cả công việc
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tiêu đề</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Độ ưu tiên</TableHead>
                  <TableHead>Người thực hiện</TableHead>
                  <TableHead>Hạn chót</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {#if safeTasks.length === 0}
                  <TableRow>
                    <TableCell colspan={5} class="text-center py-4">
                      Chưa có công việc nào
                    </TableCell>
                  </TableRow>
                {:else}
                  {#each safeTasks as task (task.id)}
                    <TableRow>
                      <TableCell class="font-medium">{task.title}</TableCell>
                      <TableCell>
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {task.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          {task.priority || '-'}
                        </span>
                      </TableCell>
                      <TableCell>{task.assignee_name || '-'}</TableCell>
                      <TableCell>{task.due_date ? formatDate(task.due_date) : '-'}</TableCell>
                    </TableRow>
                  {/each}
                {/if}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  </div>
</AppLayout>
