<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import AppLayout from '@/layouts/app_layout.svelte'
  import Button from '@/components/ui/button.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardFooter from '@/components/ui/card_footer.svelte'
  import Input from '@/components/ui/input.svelte'
  import Label from '@/components/ui/label.svelte'
  import Textarea from '@/components/ui/textarea.svelte'
  import Select from '@/components/ui/select.svelte'
  import SelectContent from '@/components/ui/select_content.svelte'
  import SelectItem from '@/components/ui/select_item.svelte'
  import SelectTrigger from '@/components/ui/select_trigger.svelte'
  import SelectValue from '@/components/ui/select_value.svelte'
  import Calendar from '@/components/ui/calendar.svelte'
  import Popover from '@/components/ui/popover.svelte'
  import PopoverContent from '@/components/ui/popover_content.svelte'
  import PopoverTrigger from '@/components/ui/popover_trigger.svelte'
  import { CalendarIcon } from 'lucide-svelte'
  import { format } from 'date-fns'
  import { vi } from 'date-fns/locale'
  import { cn } from '@/lib/utils'
  import type { ProjectCreateProps } from './types'

  const { organizations, statuses, auth }: ProjectCreateProps = $props()

  let formData = $state({
    name: '',
    description: '',
    organization_id: '',
    status: '',
    start_date: '',
    end_date: '',
    manager_id: ''
  })

  let startDate = $state<Date | undefined>(undefined)
  let endDate = $state<Date | undefined>(undefined)
  let errors = $state<Record<string, string>>({})

  function handleChange(e: Event) {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement
    const { name, value } = target
    formData = { ...formData, [name]: value }

    if (errors[name]) {
      const { [name]: _, ...rest } = errors
      errors = rest
    }
  }

  function handleSelectChange(name: string, value: string) {
    formData = { ...formData, [name]: value }

    if (errors[name]) {
      const { [name]: _, ...rest } = errors
      errors = rest
    }
  }

  function handleStartDateChange(date: Date | undefined) {
    startDate = date
    formData = {
      ...formData,
      start_date: date ? format(date, 'yyyy-MM-dd') : ''
    }

    if (errors['start_date']) {
      const { start_date: _, ...rest } = errors
      errors = rest
    }
  }

  function handleEndDateChange(date: Date | undefined) {
    endDate = date
    formData = {
      ...formData,
      end_date: date ? format(date, 'yyyy-MM-dd') : ''
    }

    if (errors['end_date']) {
      const { end_date: _, ...rest } = errors
      errors = rest
    }
  }

  function handleSubmit(e: Event) {
    e.preventDefault()

    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Trường này là bắt buộc'
    }

    if (!formData.organization_id) {
      newErrors.organization_id = 'Trường này là bắt buộc'
    }

    if (!formData.status) {
      newErrors.status = 'Trường này là bắt buộc'
    }

    if (Object.keys(newErrors).length > 0) {
      errors = newErrors
      return
    }

    router.post('/projects', { ...formData, manager_id: auth.user.id })
  }
</script>

<svelte:head>
  <title>Tạo dự án mới</title>
</svelte:head>

<AppLayout title="Tạo dự án mới">
  <div class="p-4 sm:p-6 space-y-6">
    <div class="flex justify-between items-center">
      <h1 class="text-2xl font-bold">Tạo dự án mới</h1>
      <Button onclick={() => { router.get('/projects'); }} variant="outline">
        Hủy
      </Button>
    </div>

    <Card>
      <form onsubmit={handleSubmit}>
        <CardContent class="pt-6 space-y-4">
          <div class="space-y-2">
            <Label for="name">
              Tên dự án <span class="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              oninput={handleChange}
              class={errors.name ? 'border-red-500' : ''}
            />
            {#if errors.name}
              <p class="text-sm text-red-500">{errors.name}</p>
            {/if}
          </div>

          <div class="space-y-2">
            <Label for="description">Mô tả</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              oninput={handleChange}
              rows={4}
            />
          </div>

          <div class="space-y-2">
            <Label for="organization_id">
              Tổ chức <span class="text-red-500">*</span>
            </Label>
            <Select
              value={formData.organization_id}
              onValueChange={(value: string) => { handleSelectChange('organization_id', value); }}
            >
              <SelectTrigger class={errors.organization_id ? 'border-red-500' : ''}>
                <SelectValue placeholder="Chọn tổ chức" />
              </SelectTrigger>
              <SelectContent>
                {#each organizations as org (org.id)}
                  <SelectItem value={org.id}>
                    {org.name}
                  </SelectItem>
                {/each}
              </SelectContent>
            </Select>
            {#if errors.organization_id}
              <p class="text-sm text-red-500">{errors.organization_id}</p>
            {/if}
          </div>

          <div class="space-y-2">
            <Label for="status">
              Trạng thái <span class="text-red-500">*</span>
            </Label>
            <Select
              value={formData.status}
              onValueChange={(value: string) => { handleSelectChange('status', value); }}
            >
              <SelectTrigger class={errors.status ? 'border-red-500' : ''}>
                <SelectValue placeholder="Chọn trạng thái" />
              </SelectTrigger>
              <SelectContent>
                {#each statuses as status (status.value)}
                  <SelectItem value={status.value}>
                    {status.label}
                  </SelectItem>
                {/each}
              </SelectContent>
            </Select>
            {#if errors.status}
              <p class="text-sm text-red-500">{errors.status}</p>
            {/if}
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label for="start_date">Ngày bắt đầu</Label>
              <Popover>
                <PopoverTrigger>
                  {#snippet child({ props })}
                    <Button
                      type="button"
                      variant="outline"
                      class={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                      {...props}
                    >
                      <CalendarIcon class="mr-2 h-4 w-4" />
                      {#if startDate}
                        {format(startDate, 'PPP', { locale: vi })}
                      {:else}
                        <span>Chọn ngày</span>
                      {/if}
                    </Button>
                  {/snippet}
                </PopoverTrigger>
                <PopoverContent class="w-auto p-0">
                  <Calendar
                    selected={startDate}
                    onSelect={handleStartDateChange}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div class="space-y-2">
              <Label for="end_date">Ngày kết thúc</Label>
              <Popover>
                <PopoverTrigger>
                  {#snippet child({ props })}
                    <Button
                      type="button"
                      variant="outline"
                      class={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                      {...props}
                    >
                      <CalendarIcon class="mr-2 h-4 w-4" />
                      {#if endDate}
                        {format(endDate, 'PPP', { locale: vi })}
                      {:else}
                        <span>Chọn ngày</span>
                      {/if}
                    </Button>
                  {/snippet}
                </PopoverTrigger>
                <PopoverContent class="w-auto p-0">
                  <Calendar
                    selected={endDate}
                    onSelect={handleEndDateChange}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>

        <CardFooter class="flex justify-end space-x-2">
          <Button type="button" variant="outline" onclick={() => { router.get('/projects'); }}>
            Hủy
          </Button>
          <Button type="submit">Tạo</Button>
        </CardFooter>
      </form>
    </Card>
  </div>
</AppLayout>
