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

  let contextDescription = $state('')
  let concreteRequirements = $state('')
  let expectedOutcome = $state('')
  let extraNotes = $state('')

  function buildDescriptionFromSections() {
    const sections: string[] = []

    if (contextDescription.trim()) {
      sections.push(`## Mô tả bối cảnh\n${contextDescription.trim()}`)
    }

    if (concreteRequirements.trim()) {
      sections.push(`## Yêu cầu cụ thể\n${concreteRequirements.trim()}`)
    }

    if (expectedOutcome.trim()) {
      sections.push(`## Kết quả cần đạt\n${expectedOutcome.trim()}`)
    }

    if (extraNotes.trim()) {
      sections.push(`## Ghi chú thêm\n${extraNotes.trim()}`)
    }

    return sections.join('\n\n')
  }

  function syncDescriptionFromSections() {
    const nextValue = buildDescriptionFromSections()

    handleChange({
      target: {
        name: 'description',
        value: nextValue,
      },
    } as unknown as Event)
  }

  function clearSectionInputs() {
    contextDescription = ''
    concreteRequirements = ''
    expectedOutcome = ''
    extraNotes = ''

    handleChange({
      target: {
        name: 'description',
        value: '',
      },
    } as unknown as Event)
  }
</script>

<div class="grid gap-2">
  <Label for="title">
    {t('task.title', {}, 'Tiêu đề')}<span class="ml-1 text-red-500">*</span>
  </Label>
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
  <div class="rounded-md border p-3 space-y-3 bg-muted/20">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <span class="text-xs text-muted-foreground">
        Các mục bên dưới chỉ để gợi ý nội dung, không bắt buộc.
      </span>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="rounded border px-2 py-1 text-xs hover:bg-muted"
          onclick={syncDescriptionFromSections}
        >
          Ghép vào mô tả
        </button>
        <button
          type="button"
          class="rounded border px-2 py-1 text-xs hover:bg-muted"
          onclick={clearSectionInputs}
        >
          Xoá nội dung gợi ý
        </button>
      </div>
    </div>

    <div class="grid gap-3 sm:grid-cols-2">
      <div class="space-y-1">
        <Label for="desc_context" class="text-xs">Mô tả bối cảnh</Label>
        <Textarea id="desc_context" value={contextDescription} rows={3} oninput={(e) => { contextDescription = (e.target as HTMLTextAreaElement).value }} placeholder="Bài toán đang gặp, lý do cần làm task này..." class="text-sm" />
      </div>

      <div class="space-y-1">
        <Label for="desc_requirements" class="text-xs">Yêu cầu cụ thể</Label>
        <Textarea id="desc_requirements" value={concreteRequirements} rows={3} oninput={(e) => { concreteRequirements = (e.target as HTMLTextAreaElement).value }} placeholder="Checklist yêu cầu, ràng buộc kỹ thuật, phạm vi..." class="text-sm" />
      </div>

      <div class="space-y-1">
        <Label for="desc_outcome" class="text-xs">Kết quả cần đạt</Label>
        <Textarea id="desc_outcome" value={expectedOutcome} rows={3} oninput={(e) => { expectedOutcome = (e.target as HTMLTextAreaElement).value }} placeholder="Định nghĩa done, tiêu chí nghiệm thu, output mong muốn..." class="text-sm" />
      </div>

      <div class="space-y-1">
        <Label for="desc_notes" class="text-xs">Ghi chú thêm</Label>
        <Textarea id="desc_notes" value={extraNotes} rows={3} oninput={(e) => { extraNotes = (e.target as HTMLTextAreaElement).value }} placeholder="Tài liệu liên quan, lưu ý triển khai, dependency..." class="text-sm" />
      </div>
    </div>
  </div>

  <Textarea
    id="description"
    name="description"
    value={formData.description}
    onchange={handleChange}
    placeholder="Mô tả task cuối cùng sẽ được gửi đi (có thể tự viết hoặc bấm 'Ghép vào mô tả' từ các mục gợi ý bên trên)."
    rows={10}
    class="min-h-[220px] resize-y"
  />
</div>
