<script lang="ts">
  import Input from '@/apps/user/shared/ui/input.svelte'
  import Label from '@/apps/user/shared/ui/label.svelte'
  import Textarea from '@/apps/user/shared/ui/textarea.svelte'
  import { createEmptyTaskBrief } from '@/apps/shared/tasks/task_brief_contract'
  import type {
    TaskBriefAcceptanceCriterion,
    TaskBriefBusinessRule,
    TaskBriefDependency,
    TaskBriefDeliverable,
    TaskBriefLine,
    TaskBriefQualityRequirement,
    TaskBriefV2,
    TaskBriefWorkItem,
  } from '@/apps/shared/tasks/task_brief_contract'

  interface Props {
    brief: TaskBriefV2
    section: 'brief' | 'scope' | 'acceptance'
    errors: Record<string, string>
    onChange: (updater: (previous: TaskBriefV2) => TaskBriefV2) => void
  }

  const { brief = createEmptyTaskBrief(), section, errors, onChange }: Props = $props()

  const nextId = () => crypto.randomUUID()
  const hasError = (field: string) => Boolean(errors[field])

  function updateWorkItem(
    id: string,
    field: keyof Omit<TaskBriefWorkItem, 'id'>,
    value: string
  ) {
    onChange((previous) => ({
      ...previous,
      workItems: previous.workItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    }))
  }

  function updateLine(
    collection: 'scope' | 'outOfScope' | 'constraints',
    id: string,
    value: string
  ) {
    onChange((previous) => ({
      ...previous,
      [collection]: previous[collection].map((item) =>
        item.id === id ? { ...item, text: value } : item
      ),
    }))
  }

  function updateRule(
    id: string,
    field: keyof Omit<TaskBriefBusinessRule, 'id'>,
    value: string
  ) {
    onChange((previous) => ({
      ...previous,
      businessRules: previous.businessRules.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    }))
  }

  function updateDependency<K extends keyof Omit<TaskBriefDependency, 'id'>>(
    id: string,
    field: K,
    value: TaskBriefDependency[K]
  ) {
    onChange((previous) => ({
      ...previous,
      dependencies: previous.dependencies.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    }))
  }

  function updateDeliverable(
    id: string,
    field: keyof Omit<TaskBriefDeliverable, 'id'>,
    value: string
  ) {
    onChange((previous) => ({
      ...previous,
      deliverables: previous.deliverables.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    }))
  }

  function updateQuality(
    id: string,
    field: keyof Omit<TaskBriefQualityRequirement, 'id'>,
    value: string
  ) {
    onChange((previous) => ({
      ...previous,
      qualityRequirements: previous.qualityRequirements.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    }))
  }

  function updateAcceptance(
    id: string,
    field: keyof Omit<TaskBriefAcceptanceCriterion, 'id'>,
    value: string
  ) {
    onChange((previous) => ({
      ...previous,
      acceptanceCriteria: previous.acceptanceCriteria.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    }))
  }

  function addLine(collection: 'scope' | 'outOfScope' | 'constraints') {
    onChange((previous) => ({
      ...previous,
      [collection]: [...previous[collection], { id: nextId(), text: '' } satisfies TaskBriefLine],
    }))
  }

  function removeLine(collection: 'scope' | 'outOfScope' | 'constraints', id: string) {
    onChange((previous) => ({
      ...previous,
      [collection]: previous[collection].filter((item) => item.id !== id),
    }))
  }

  const inlineButton = 'text-sm font-semibold text-primary underline-offset-4 hover:underline'
  const removeButton = 'text-xs font-medium text-muted-foreground hover:text-destructive'
  const stepNumber = 'inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-foreground px-1.5 font-mono text-[10px] font-bold text-background'
</script>

{#if section === 'brief'}
  <section id="brief-work-items" class="space-y-8" aria-labelledby="task-work-items-heading">
    <div class="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
      <div class="flex gap-3">
        <span class={stepNumber}>01</span>
        <div>
          <h3 id="task-work-items-heading" class="text-base font-bold tracking-tight">Tên và phần việc</h3>
        </div>
      </div>
      <button class={inlineButton} type="button" onclick={() => onChange((previous) => ({
        ...previous,
        workItems: [...previous.workItems, { id: nextId(), affectedArea: '', requiredChange: '', resultingBehaviour: '' }],
      }))}>+ Thêm hạng mục</button>
    </div>

    {#if brief.workItems.length === 0}
      <div class={`rounded-xl border border-dashed px-4 py-5 text-sm text-muted-foreground ${hasError('brief_work_items') ? 'border-destructive text-destructive' : ''}`}>
        Chưa có hạng mục.
      </div>
    {/if}

    <div class="grid gap-3">
      {#each brief.workItems as item, index (item.id)}
        <article class={`relative grid gap-4 rounded-xl border bg-muted/20 p-4 pl-12 shadow-sm ${hasError('brief_work_items') ? 'border-destructive/60' : 'border-border'}`}>
          <span class="absolute left-4 top-4 inline-flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background">{index + 1}</span>
          <div class="flex items-center justify-between gap-3">
            <p class="text-sm font-semibold">Hạng mục công việc {index + 1}</p>
            <button class={removeButton} type="button" onclick={() => onChange((previous) => ({
              ...previous,
              workItems: previous.workItems.filter((candidate) => candidate.id !== item.id),
            }))}>Xóa</button>
          </div>
          <div class="grid gap-4 md:grid-cols-2">
            <div class="grid gap-2">
              <Label for={`work-area-${item.id}`}>Phần bị tác động <span class="text-[#ef4444]">*</span></Label>
              <Input id={`work-area-${item.id}`} value={item.affectedArea} placeholder="Ví dụ: chi tiết Task, API lịch sử" oninput={(event) => updateWorkItem(item.id, 'affectedArea', (event.currentTarget as HTMLInputElement).value)} />
            </div>
            <div class="grid gap-2">
              <Label for={`work-change-${item.id}`}>Thay đổi phải thực hiện <span class="text-[#ef4444]">*</span></Label>
              <Input id={`work-change-${item.id}`} value={item.requiredChange} placeholder="Ví dụ: kiểm tra quyền trước khi trả dữ liệu" oninput={(event) => updateWorkItem(item.id, 'requiredChange', (event.currentTarget as HTMLInputElement).value)} />
            </div>
            <div class="grid gap-2 md:col-span-2">
              <Label for={`work-behaviour-${item.id}`}>Hành vi sau thay đổi <span class="text-[#ef4444]">*</span></Label>
              <Input id={`work-behaviour-${item.id}`} value={item.resultingBehaviour} placeholder="Người dùng hoặc hệ thống có thể quan sát điều gì?" oninput={(event) => updateWorkItem(item.id, 'resultingBehaviour', (event.currentTarget as HTMLInputElement).value)} />
            </div>
          </div>
        </article>
      {/each}
    </div>
    {#if errors.brief_work_items}<p class="text-xs font-semibold text-destructive" role="alert">{errors.brief_work_items}</p>{/if}
  </section>

  <section class="space-y-5 border-t border-border pt-8" aria-labelledby="task-current-state-heading">
    <div class="flex gap-3">
      <span class={stepNumber}>02</span>
      <div>
        <h3 id="task-current-state-heading" class="text-base font-bold tracking-tight">Hiện trạng và ảnh hưởng</h3>
      </div>
    </div>
    <div class="grid gap-x-5 gap-y-4 md:grid-cols-2">
      <div class="grid gap-2"><Label for="brief-current-state">Hiện trạng <span class="text-[#ef4444]">*</span></Label><Textarea id="brief-current-state" value={brief.currentState} rows={3} placeholder="Điều gì đang thiếu hoặc đang xảy ra?" class={hasError('brief_current_state') ? 'border-destructive' : ''} oninput={(event) => onChange((previous) => ({ ...previous, currentState: (event.currentTarget as HTMLTextAreaElement).value }))} /></div>
      <div class="grid gap-2"><Label for="brief-current-situation">Nơi/tình huống xảy ra <span class="text-[#ef4444]">*</span></Label><Textarea id="brief-current-situation" value={brief.currentStateSituation} rows={3} placeholder="Ở đâu, khi nào và với ai?" class={hasError('brief_current_state') ? 'border-destructive' : ''} oninput={(event) => onChange((previous) => ({ ...previous, currentStateSituation: (event.currentTarget as HTMLTextAreaElement).value }))} /></div>
      <div class="grid gap-2"><Label for="brief-affected-parties">Ai/phần nào bị ảnh hưởng <span class="text-[#ef4444]">*</span></Label><Textarea id="brief-affected-parties" value={brief.affectedParties} rows={3} placeholder="Người dùng, luồng hoặc phần hệ thống nào chịu ảnh hưởng?" class={hasError('brief_current_state') ? 'border-destructive' : ''} oninput={(event) => onChange((previous) => ({ ...previous, affectedParties: (event.currentTarget as HTMLTextAreaElement).value }))} /></div>
      <div class="grid gap-2"><Label for="brief-impact">Hậu quả nếu chưa xử lý <span class="text-[#ef4444]">*</span></Label><Textarea id="brief-impact" value={brief.impactIfUnresolved} rows={3} placeholder="Điều gì vẫn xảy ra hoặc rủi ro nào còn lại?" class={hasError('brief_current_state') ? 'border-destructive' : ''} oninput={(event) => onChange((previous) => ({ ...previous, impactIfUnresolved: (event.currentTarget as HTMLTextAreaElement).value }))} /></div>
    </div>
    {#if errors.brief_current_state}<p class="text-xs font-semibold text-destructive" role="alert">{errors.brief_current_state}</p>{/if}
  </section>
{:else if section === 'scope'}
  <section id="brief-scope" class="space-y-6" aria-labelledby="task-scope-heading">
    <div class="flex gap-3 border-b border-border pb-5">
      <span class={stepNumber}>03</span>
      <div>
        <h3 id="task-scope-heading" class="text-base font-bold tracking-tight">Phạm vi và ràng buộc</h3>
      </div>
    </div>

    <div class={`space-y-3 ${hasError('brief_scope') ? 'rounded-xl border border-destructive/60 p-4' : ''}`}>
      <div class="flex flex-wrap items-start justify-between gap-3">
        <h4 class="text-sm font-semibold">Phần nằm trong Task <span class="text-[#ef4444]">*</span></h4>
        <button class={inlineButton} type="button" onclick={() => addLine('scope')}>+ Thêm phần</button>
      </div>
      <div class="grid gap-2">
        {#each brief.scope as item (item.id)}
          <div class="flex items-center gap-2"><span class="font-mono text-sm font-bold text-primary">↳</span><Input value={item.text} placeholder="Ví dụ: API đọc lịch sử Task" oninput={(event) => updateLine('scope', item.id, (event.currentTarget as HTMLInputElement).value)} /><button class={removeButton} type="button" onclick={() => removeLine('scope', item.id)}>Xóa</button></div>
        {/each}
      </div>
      {#if brief.scope.length === 0}<p class="rounded-lg border border-dashed px-3 py-3 text-sm text-muted-foreground">Chưa có phần nào trong phạm vi.</p>{/if}
    </div>
    {#if errors.brief_scope}<p class="text-xs font-semibold text-destructive" role="alert">{errors.brief_scope}</p>{/if}

    <div class="border-y border-border py-1">
      <div class="py-3 text-sm font-semibold text-foreground">Phần không làm trong Task <span class="text-[#ef4444]">*</span></div>
      <div class="space-y-3 pb-4">
        <div class="flex justify-end"><button class={inlineButton} type="button" onclick={() => addLine('outOfScope')}>+ Thêm phần không làm</button></div>
        {#each brief.outOfScope as item (item.id)}
          <div class="flex items-center gap-2"><span class="font-mono text-sm font-bold text-destructive">×</span><Input value={item.text} placeholder="Ví dụ: không thay đổi policy chung" oninput={(event) => updateLine('outOfScope', item.id, (event.currentTarget as HTMLInputElement).value)} /><button class={removeButton} type="button" onclick={() => removeLine('outOfScope', item.id)}>Xóa</button></div>
        {/each}
      </div>
    </div>

    <div class="rounded-xl border border-border bg-muted/10 px-4 py-1">
      <div class="py-3 text-sm font-semibold">Quy tắc, giới hạn và phụ thuộc đang áp dụng <span class="text-[#ef4444]">*</span></div>
      <div class="space-y-6 border-t border-border pb-5 pt-5">
        <div class="space-y-3">
          <div class="flex flex-wrap items-start justify-between gap-3"><h4 class="text-sm font-semibold">Quy tắc nghiệp vụ <span class="text-[#ef4444]">*</span></h4><button class={inlineButton} type="button" onclick={() => onChange((previous) => ({ ...previous, businessRules: [...previous.businessRules, { id: nextId(), actor: '', condition: '', permission: '', systemResult: '' }] }))}>+ Thêm quy tắc</button></div>
          {#each brief.businessRules as item, index (item.id)}
            <article class="relative grid gap-3 rounded-xl border border-border bg-background p-4"><div class="flex items-center justify-between"><p class="text-sm font-semibold">Quy tắc {index + 1}</p><button class={removeButton} type="button" onclick={() => onChange((previous) => ({ ...previous, businessRules: previous.businessRules.filter((candidate) => candidate.id !== item.id) }))}>Xóa</button></div><div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><div class="grid gap-2"><Label for={`rule-actor-${item.id}`}>Chủ thể <span class="text-[#ef4444]">*</span></Label><Input id={`rule-actor-${item.id}`} value={item.actor} oninput={(event) => updateRule(item.id, 'actor', (event.currentTarget as HTMLInputElement).value)} /></div><div class="grid gap-2"><Label for={`rule-condition-${item.id}`}>Điều kiện <span class="text-[#ef4444]">*</span></Label><Input id={`rule-condition-${item.id}`} value={item.condition} oninput={(event) => updateRule(item.id, 'condition', (event.currentTarget as HTMLInputElement).value)} /></div><div class="grid gap-2"><Label for={`rule-permission-${item.id}`}>Được/không được <span class="text-[#ef4444]">*</span></Label><Input id={`rule-permission-${item.id}`} value={item.permission} oninput={(event) => updateRule(item.id, 'permission', (event.currentTarget as HTMLInputElement).value)} /></div><div class="grid gap-2"><Label for={`rule-result-${item.id}`}>Kết quả hệ thống <span class="text-[#ef4444]">*</span></Label><Input id={`rule-result-${item.id}`} value={item.systemResult} oninput={(event) => updateRule(item.id, 'systemResult', (event.currentTarget as HTMLInputElement).value)} /></div></div></article>
          {/each}
        </div>

        <div class="grid gap-5 lg:grid-cols-2">
          <div class="space-y-3"><div class="flex items-start justify-between gap-3"><h4 class="text-sm font-semibold">Giới hạn riêng <span class="text-[#ef4444]">*</span></h4><button class={inlineButton} type="button" onclick={() => addLine('constraints')}>+ Thêm giới hạn</button></div>{#each brief.constraints as item (item.id)}<div class="flex items-center gap-2"><Input value={item.text} placeholder="Ví dụ: không thay đổi policy phân quyền hiện có" oninput={(event) => updateLine('constraints', item.id, (event.currentTarget as HTMLInputElement).value)} /><button class={removeButton} type="button" onclick={() => removeLine('constraints', item.id)}>Xóa</button></div>{/each}</div>
          <div class="space-y-3"><div class="flex items-start justify-between gap-3"><h4 class="text-sm font-semibold">Phụ thuộc <span class="text-[#ef4444]">*</span></h4><button class={inlineButton} type="button" onclick={() => onChange((previous) => ({ ...previous, dependencies: [...previous.dependencies, { id: nextId(), dependency: '', owner: '', state: 'available' }] }))}>+ Thêm phụ thuộc</button></div>{#each brief.dependencies as item (item.id)}<div class="grid gap-2 rounded-lg border border-border bg-background p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_9rem_auto]"><Input value={item.dependency} placeholder="Phần phụ thuộc *" oninput={(event) => updateDependency(item.id, 'dependency', (event.currentTarget as HTMLInputElement).value)} /><Input value={item.owner} placeholder="Ai/nhóm phụ trách *" oninput={(event) => updateDependency(item.id, 'owner', (event.currentTarget as HTMLInputElement).value)} /><select class="h-10 rounded-md border border-input bg-background px-3 text-sm" value={item.state} onchange={(event) => updateDependency(item.id, 'state', (event.currentTarget as HTMLSelectElement).value as TaskBriefDependency['state'])}><option value="available">Sẵn sàng</option><option value="waiting">Đang chờ</option><option value="blocked">Bị chặn</option></select><button class={removeButton} type="button" onclick={() => onChange((previous) => ({ ...previous, dependencies: previous.dependencies.filter((candidate) => candidate.id !== item.id) }))}>Xóa</button></div>{/each}</div>
        </div>
      </div>
    </div>
    {#if errors.brief_optional_details}<p class="text-xs font-semibold text-destructive" role="alert">{errors.brief_optional_details}</p>{/if}
  </section>
{:else}
  <section id="brief-deliverables" class="space-y-8" aria-labelledby="task-deliverables-heading">
    <div class="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
      <div class="flex gap-3"><span class={stepNumber}>04</span><h3 id="task-deliverables-heading" class="text-base font-bold tracking-tight">Đầu ra và chất lượng</h3></div>
      <button class={inlineButton} type="button" onclick={() => onChange((previous) => ({ ...previous, deliverables: [...previous.deliverables, { id: nextId(), outputType: '', locationOrRecipient: '', minimumState: '' }] }))}>+ Thêm đầu ra</button>
    </div>
    {#if brief.deliverables.length === 0}<div class={`rounded-xl border border-dashed px-4 py-5 text-sm text-muted-foreground ${hasError('brief_deliverables') ? 'border-destructive text-destructive' : ''}`}>Chưa có đầu ra bàn giao.</div>{/if}
    <div class="grid gap-3">{#each brief.deliverables as item, index (item.id)}<article class={`relative grid gap-4 rounded-xl border bg-muted/20 p-4 pl-12 shadow-sm ${hasError('brief_deliverables') ? 'border-destructive/60' : 'border-border'}`}><span class="absolute left-4 top-4 inline-flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background">{index + 1}</span><div class="flex items-center justify-between"><p class="text-sm font-semibold">Đầu ra {index + 1}</p><button class={removeButton} type="button" onclick={() => onChange((previous) => ({ ...previous, deliverables: previous.deliverables.filter((candidate) => candidate.id !== item.id) }))}>Xóa</button></div><div class="grid gap-4 md:grid-cols-2"><div class="grid gap-2"><Label for={`deliverable-type-${item.id}`}>Loại đầu ra <span class="text-[#ef4444]">*</span></Label><Input id={`deliverable-type-${item.id}`} value={item.outputType} placeholder="API thay đổi, giao diện…" oninput={(event) => updateDeliverable(item.id, 'outputType', (event.currentTarget as HTMLInputElement).value)} /></div><div class="grid gap-2"><Label for={`deliverable-location-${item.id}`}>Vị trí/đối tượng <span class="text-[#ef4444]">*</span></Label><Input id={`deliverable-location-${item.id}`} value={item.locationOrRecipient} placeholder="Endpoint, màn hình hoặc người nhận" oninput={(event) => updateDeliverable(item.id, 'locationOrRecipient', (event.currentTarget as HTMLInputElement).value)} /></div><div class="grid gap-2 md:col-span-2"><Label for={`deliverable-state-${item.id}`}>Trạng thái tối thiểu <span class="text-[#ef4444]">*</span></Label><Input id={`deliverable-state-${item.id}`} value={item.minimumState} placeholder="Điều phải đạt trước nghiệm thu" oninput={(event) => updateDeliverable(item.id, 'minimumState', (event.currentTarget as HTMLInputElement).value)} /></div></div></article>{/each}</div>
    {#if errors.brief_deliverables}<p class="text-xs font-semibold text-destructive" role="alert">{errors.brief_deliverables}</p>{/if}

    <details class={`rounded-xl border px-4 py-1 ${hasError('brief_optional_details') ? 'border-destructive/60' : 'border-border bg-muted/10'}`} open>
      <summary class="cursor-pointer py-3 text-sm font-semibold">Yêu cầu chất lượng <span class="text-[#ef4444]">*</span></summary>
      <div class="space-y-3 border-t border-border pb-4 pt-4"><div class="flex justify-end"><button class={inlineButton} type="button" onclick={() => onChange((previous) => ({ ...previous, qualityRequirements: [...previous.qualityRequirements, { id: nextId(), property: '', appliesTo: '', observableCheck: '' }] }))}>+ Thêm yêu cầu</button></div>{#each brief.qualityRequirements as item, index (item.id)}<article class="relative grid gap-3 rounded-xl border border-border bg-background p-4"><div class="flex items-center justify-between"><p class="text-sm font-semibold">Yêu cầu {index + 1}</p>{#if brief.qualityRequirements.length > 1}<button class={removeButton} type="button" onclick={() => onChange((previous) => ({ ...previous, qualityRequirements: previous.qualityRequirements.filter((candidate) => candidate.id !== item.id) }))}>Xóa</button>{/if}</div><div class="grid gap-3 md:grid-cols-2"><div class="grid gap-2"><Label for={`quality-property-${item.id}`}>Thuộc tính <span class="text-[#ef4444]">*</span></Label><Input id={`quality-property-${item.id}`} value={item.property} placeholder="Ví dụ: an toàn phân quyền" oninput={(event) => updateQuality(item.id, 'property', (event.currentTarget as HTMLInputElement).value)} /></div><div class="grid gap-2"><Label for={`quality-applies-${item.id}`}>Áp dụng cho <span class="text-[#ef4444]">*</span></Label><Input id={`quality-applies-${item.id}`} value={item.appliesTo} placeholder="Phần nào phải đáp ứng?" oninput={(event) => updateQuality(item.id, 'appliesTo', (event.currentTarget as HTMLInputElement).value)} /></div><div class="grid gap-2 md:col-span-2"><Label for={`quality-check-${item.id}`}>Cách biết đã đạt <span class="text-[#ef4444]">*</span></Label><Input id={`quality-check-${item.id}`} value={item.observableCheck} placeholder="Dấu hiệu hoặc phép kiểm có thể quan sát" oninput={(event) => updateQuality(item.id, 'observableCheck', (event.currentTarget as HTMLInputElement).value)} /></div></div></article>{/each}</div>
    </details>
  </section>

  <section id="brief-acceptance" class="space-y-6 border-t border-border pt-8" aria-labelledby="task-acceptance-heading">
    <div class="flex gap-3"><span class={stepNumber}>05</span><h3 id="task-acceptance-heading" class="text-base font-bold tracking-tight">Tiêu chí nghiệm thu</h3></div>
    <div class="flex justify-end"><button class={inlineButton} type="button" onclick={() => onChange((previous) => ({ ...previous, acceptanceCriteria: [...previous.acceptanceCriteria, { id: nextId(), condition: '', action: '', observableResult: '' }] }))}>+ Thêm tiêu chí</button></div>
    {#if brief.acceptanceCriteria.length === 0}<div class={`rounded-xl border border-dashed px-4 py-5 text-sm text-muted-foreground ${hasError('brief_acceptance') ? 'border-destructive text-destructive' : ''}`}>Chưa có tiêu chí nghiệm thu.</div>{/if}
    <div class="grid gap-3">{#each brief.acceptanceCriteria as item, index (item.id)}<article class={`relative grid gap-4 rounded-xl border bg-muted/20 p-4 pl-12 shadow-sm ${hasError('brief_acceptance') ? 'border-destructive/60' : 'border-border'}`}><span class="absolute left-4 top-4 font-mono text-xs font-bold text-primary">TC{String(index + 1).padStart(2, '0')}</span><div class="flex items-center justify-between"><p class="text-sm font-semibold">Tiêu chí {index + 1}</p><button class={removeButton} type="button" onclick={() => onChange((previous) => ({ ...previous, acceptanceCriteria: previous.acceptanceCriteria.filter((candidate) => candidate.id !== item.id) }))}>Xóa</button></div><div class="grid gap-4 md:grid-cols-2"><div class="grid gap-2"><Label for={`acceptance-condition-${item.id}`}>Điều kiện <span class="text-[#ef4444]">*</span></Label><Input id={`acceptance-condition-${item.id}`} value={item.condition} placeholder="Trong điều kiện nào?" oninput={(event) => updateAcceptance(item.id, 'condition', (event.currentTarget as HTMLInputElement).value)} /></div><div class="grid gap-2"><Label for={`acceptance-action-${item.id}`}>Hành động/đầu vào <span class="text-[#ef4444]">*</span></Label><Input id={`acceptance-action-${item.id}`} value={item.action} placeholder="Thực hiện thao tác hoặc đưa đầu vào gì?" oninput={(event) => updateAcceptance(item.id, 'action', (event.currentTarget as HTMLInputElement).value)} /></div><div class="grid gap-2 md:col-span-2"><Label for={`acceptance-result-${item.id}`}>Kết quả quan sát <span class="text-[#ef4444]">*</span></Label><Input id={`acceptance-result-${item.id}`} value={item.observableResult} placeholder="Kết quả nào cho thấy đã đạt?" oninput={(event) => updateAcceptance(item.id, 'observableResult', (event.currentTarget as HTMLInputElement).value)} /></div></div></article>{/each}</div>
    {#if errors.brief_acceptance}<p class="text-xs font-semibold text-destructive" role="alert">{errors.brief_acceptance}</p>{/if}

    <details class={`border-y py-1 ${hasError('brief_optional_details') ? 'border-destructive/60' : 'border-border'}`} open>
      <summary class="cursor-pointer py-3 text-sm font-semibold">Giá trị mong muốn <span class="text-[#ef4444]">*</span></summary>
      <div class="grid gap-4 pb-4 pt-2 md:grid-cols-2"><div class="grid gap-2"><Label for="desired-beneficiary">Đối tượng được hưởng lợi <span class="text-[#ef4444]">*</span></Label><Input id="desired-beneficiary" value={brief.desiredValue?.beneficiary ?? ''} placeholder="Ai/phần nào nhận lợi ích riêng?" oninput={(event) => onChange((previous) => ({ ...previous, desiredValue: { beneficiary: (event.currentTarget as HTMLInputElement).value, usefulState: previous.desiredValue?.usefulState ?? '' } }))} /></div><div class="grid gap-2"><Label for="desired-state">Khả năng/trạng thái có ích <span class="text-[#ef4444]">*</span></Label><Input id="desired-state" value={brief.desiredValue?.usefulState ?? ''} placeholder="Điều gì có giá trị sau hoàn thành?" oninput={(event) => onChange((previous) => ({ ...previous, desiredValue: { beneficiary: previous.desiredValue?.beneficiary ?? '', usefulState: (event.currentTarget as HTMLInputElement).value } }))} /></div></div>
    </details>
  </section>
{/if}
