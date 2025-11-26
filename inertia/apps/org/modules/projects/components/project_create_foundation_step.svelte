<script lang="ts">
  import { format } from 'date-fns'
  import { CalendarIcon } from 'lucide-svelte'
  import Button from '@/apps/org/shared/ui/button.svelte'
  import Calendar from '@/apps/org/shared/ui/calendar.svelte'
  import Label from '@/apps/org/shared/ui/label.svelte'
  import Input from '@/apps/org/shared/ui/input.svelte'
  import Textarea from '@/apps/org/shared/ui/textarea.svelte'
  import Popover from '@/apps/org/shared/ui/popover.svelte'
  import PopoverContent from '@/apps/org/shared/ui/popover_content.svelte'
  import PopoverTrigger from '@/apps/org/shared/ui/popover_trigger.svelte'
  import { dateFnsLocale } from '@/apps/org/shared/lib/date_locale'
  import { cn } from '@/apps/org/shared/lib/utils'
  import { useTranslation } from '@/apps/org/shared/hooks/use_translation.svelte'

  interface Props {
    formData: {
      name: string
      description: string
      organization_id: string
      status: string
      start_date: string
      end_date: string
    }
    organizations: Array<{ id: string; name: string }>
    statuses: Array<{ value: string; label: string }>
    errors: Record<string, string>
    startDate: Date | undefined
    endDate: Date | undefined
    onStartDateChange: (d: Date | undefined) => void
    onEndDateChange: (d: Date | undefined) => void
    onInputChange: (e: Event) => void
    onSelectChange: (name: string, val: string) => void
  }

  let {
    formData = $bindable(),
    statuses,
    errors,
    startDate = $bindable(),
    endDate = $bindable(),
    onStartDateChange,
    onEndDateChange,
    onInputChange,
    onSelectChange,
  }: Props = $props()

  const { locale, t } = $derived(useTranslation())
</script>

<div class="space-y-5">
  <div class="space-y-2">
    <Label for="name">
      {t('project.name', {}, 'Project name')} <span class="text-destructive">*</span>
    </Label>
    <Input
      id="name"
      name="name"
      value={formData.name}
      oninput={onInputChange}
      class={errors.name ? 'border-destructive' : ''}
      placeholder={t('project.name_placeholder', {}, 'Example: Suar org workspace redesign')}
    />
    {#if errors.name}
      <p class="text-sm text-destructive">{errors.name}</p>
    {/if}
  </div>

  <div class="space-y-2">
    <Label for="description">{t('project.description', {}, 'Description')}</Label>
    <Textarea
      id="description"
      name="description"
      value={formData.description}
      oninput={onInputChange}
      rows={6}
      placeholder={t('project.description_placeholder', {}, 'Main goals, delivery scope, and project operating context...')}
    />
  </div>



  <div class="space-y-2">
    <Label for="status">
      {t('project.status', {}, 'Status')} <span class="text-destructive">*</span>
    </Label>
    <select
      id="status"
      name="status"
      value={formData.status}
      onchange={(event) => {
        onSelectChange('status', event.currentTarget.value)
      }}
      class={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ${
        errors.status ? 'border-destructive' : ''
      }`}
    >
      <option value="">{t('project.select_status', {}, 'Select status')}</option>
      {#each statuses as status (status.value)}
        <option value={status.value}>{status.label}</option>
      {/each}
    </select>
    {#if errors.status}
      <p class="text-sm text-destructive">{errors.status}</p>
    {/if}
  </div>

  <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
    <div class="space-y-2">
      <Label for="start_date">{t('project.start_date', {}, 'Start date')}</Label>
      <Popover>
        <PopoverTrigger>
          {#snippet child({ props })}
            <Button
              type="button"
              variant="outline"
              class={cn(
                'w-full justify-start text-left font-normal',
                !startDate && 'text-muted-foreground'
              )}
              {...props}
            >
              <CalendarIcon class="mr-2 h-4 w-4" />
              {#if startDate}
                {format(startDate, 'PPP', { locale: dateFnsLocale(locale) })}
              {:else}
                <span>{t('project.select_date', {}, 'Select date')}</span>
              {/if}
            </Button>
          {/snippet}
        </PopoverTrigger>
        <PopoverContent class="w-auto p-0">
          <Calendar selected={startDate} onSelect={onStartDateChange} />
        </PopoverContent>
      </Popover>
    </div>

    <div class="space-y-2">
      <Label for="end_date">{t('project.end_date', {}, 'End date')}</Label>
      <Popover>
        <PopoverTrigger>
          {#snippet child({ props })}
            <Button
              type="button"
              variant="outline"
              class={cn(
                'w-full justify-start text-left font-normal',
                !endDate && 'text-muted-foreground'
              )}
              {...props}
            >
              <CalendarIcon class="mr-2 h-4 w-4" />
              {#if endDate}
                {format(endDate, 'PPP', { locale: dateFnsLocale(locale) })}
              {:else}
                <span>{t('project.select_date', {}, 'Select date')}</span>
              {/if}
            </Button>
          {/snippet}
        </PopoverTrigger>
        <PopoverContent class="w-auto p-0">
          <Calendar selected={endDate} onSelect={onEndDateChange} />
        </PopoverContent>
      </Popover>
    </div>
  </div>
</div>
