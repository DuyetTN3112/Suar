<script lang="ts">
  import Input from '@/components/ui/input.svelte'
  import Textarea from '@/components/ui/textarea.svelte'
  import Label from '@/components/ui/label.svelte'
  import { useTranslation } from '@/stores/translation.svelte'

  interface Props {
    formData: {
      title: string
      description: string
    }
    handleChange: (e: Event) => void
    errors: Record<string, string>
  }

  const { formData, handleChange, errors }: Props = $props()
  const { t } = useTranslation()
</script>

<div class="grid gap-2">
  <Label for="title">{t('task.title', {}, 'Tiêu đề')}</Label>
  <Input
    id="title"
    name="title"
    value={formData.title}
    onchange={handleChange}
    placeholder={t('task.enter_title', {}, 'Nhập tiêu đề nhiệm vụ')}
    class={errors.title ? 'border-red-500' : ''}
    autofocus
  />
  {#if errors.title}
    <p class="text-xs text-red-500">{errors.title}</p>
  {/if}
</div>

<div class="grid gap-2">
  <Label for="description">{t('task.description', {}, 'Mô tả')}</Label>
  <Textarea
    id="description"
    name="description"
    value={formData.description}
    onchange={handleChange}
    placeholder={t('task.enter_description', {}, 'Nhập mô tả chi tiết cho nhiệm vụ này')}
    rows={3}
  />
</div>
