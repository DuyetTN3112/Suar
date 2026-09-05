<script lang="ts">
  import Badge from '@/apps/user/shared/ui/badge.svelte'
  import type { TaskBriefV2 } from '@/apps/shared/tasks/task_brief_contract'

  interface Props {
    brief: TaskBriefV2
    section?: 'all' | 'content' | 'acceptance'
  }

  const { brief, section = 'all' }: Props = $props()
  const showContent = $derived(section === 'all' || section === 'content')
  const showAcceptance = $derived(section === 'all' || section === 'acceptance')
  const nonEmpty = (value: string) => value.trim().length > 0
  const validLines = (items: { text: string }[]) => items.filter((item) => nonEmpty(item.text))
</script>

<section class="space-y-5" data-testid="task-structured-brief" aria-label="Contract công việc đã chốt">
  <div>
    <h6 class="text-sm font-bold">Contract công việc</h6>
    <p class="mt-1 text-xs text-muted-foreground">Cùng một bản contract hiển thị ở Board Task và Board Review. Đây là căn cứ cho người giao và reviewer kiểm tra công việc.</p>
  </div>

  {#if showContent && brief.workItems.length > 0}
    <section class="space-y-3"><h6 class="text-sm font-bold">Phần việc cần thực hiện</h6><div class="grid gap-3">{#each brief.workItems as item, index (item.id)}<article class="rounded-xl border bg-background/80 p-4"><p class="text-sm font-semibold">Hạng mục {index + 1}</p><dl class="mt-3 grid gap-3 text-sm md:grid-cols-3"><div><dt class="text-xs font-medium text-muted-foreground">Phần bị tác động</dt><dd class="mt-1 leading-6">{item.affectedArea}</dd></div><div><dt class="text-xs font-medium text-muted-foreground">Thay đổi phải thực hiện</dt><dd class="mt-1 leading-6">{item.requiredChange}</dd></div><div><dt class="text-xs font-medium text-muted-foreground">Hành vi sau thay đổi</dt><dd class="mt-1 leading-6">{item.resultingBehaviour}</dd></div></dl></article>{/each}</div></section>
  {/if}

  {#if showContent && (nonEmpty(brief.currentState) || nonEmpty(brief.currentStateSituation) || nonEmpty(brief.affectedParties) || nonEmpty(brief.impactIfUnresolved))}
    <section class="space-y-3"><h6 class="text-sm font-bold">Hiện trạng và ảnh hưởng</h6><dl class="grid gap-3 md:grid-cols-2"><div class="rounded-lg border bg-muted/10 p-3"><dt class="text-xs font-medium text-muted-foreground">Hiện trạng</dt><dd class="mt-1 text-sm leading-6">{brief.currentState}</dd></div><div class="rounded-lg border bg-muted/10 p-3"><dt class="text-xs font-medium text-muted-foreground">Nơi/tình huống xảy ra</dt><dd class="mt-1 text-sm leading-6">{brief.currentStateSituation}</dd></div><div class="rounded-lg border bg-muted/10 p-3"><dt class="text-xs font-medium text-muted-foreground">Ai/phần nào bị ảnh hưởng</dt><dd class="mt-1 text-sm leading-6">{brief.affectedParties}</dd></div><div class="rounded-lg border bg-muted/10 p-3"><dt class="text-xs font-medium text-muted-foreground">Hậu quả nếu chưa xử lý</dt><dd class="mt-1 text-sm leading-6">{brief.impactIfUnresolved}</dd></div></dl></section>
  {/if}

  {#if showContent && (validLines(brief.scope).length > 0 || validLines(brief.outOfScope).length > 0)}
    <div class="grid gap-4 md:grid-cols-2">
      {#if validLines(brief.scope).length > 0}<section class="rounded-xl border border-primary/20 bg-primary/[0.03] p-4"><h6 class="text-sm font-bold">Phần nằm trong Task</h6><ul class="mt-3 space-y-2 text-sm">{#each validLines(brief.scope) as item (item.id)}<li class="rounded-lg border bg-background/80 px-3 py-2">{item.text}</li>{/each}</ul></section>{/if}
      {#if validLines(brief.outOfScope).length > 0}<section class="rounded-xl border p-4"><h6 class="text-sm font-bold">Phần không làm trong Task</h6><ul class="mt-3 space-y-2 text-sm">{#each validLines(brief.outOfScope) as item (item.id)}<li class="rounded-lg border bg-muted/30 px-3 py-2">{item.text}</li>{/each}</ul></section>{/if}
    </div>
  {/if}

  {#if showContent && brief.businessRules.length > 0}<section class="space-y-3"><h6 class="text-sm font-bold">Quy tắc nghiệp vụ</h6>{#each brief.businessRules as item (item.id)}<article class="rounded-xl border p-4"><dl class="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4"><div><dt class="text-xs text-muted-foreground">Chủ thể</dt><dd class="mt-1">{item.actor}</dd></div><div><dt class="text-xs text-muted-foreground">Điều kiện</dt><dd class="mt-1">{item.condition}</dd></div><div><dt class="text-xs text-muted-foreground">Được/không được</dt><dd class="mt-1">{item.permission}</dd></div><div><dt class="text-xs text-muted-foreground">Kết quả hệ thống</dt><dd class="mt-1">{item.systemResult}</dd></div></dl></article>{/each}</section>{/if}

  {#if showAcceptance && brief.deliverables.length > 0}<section class="space-y-3"><h6 class="text-sm font-bold">Đầu ra bàn giao</h6>{#each brief.deliverables as item, index (item.id)}<article class="rounded-xl border bg-background/80 p-4"><p class="text-sm font-semibold">Đầu ra {index + 1}</p><dl class="mt-3 grid gap-3 text-sm md:grid-cols-3"><div><dt class="text-xs text-muted-foreground">Loại đầu ra</dt><dd class="mt-1">{item.outputType}</dd></div><div><dt class="text-xs text-muted-foreground">Vị trí/đối tượng</dt><dd class="mt-1">{item.locationOrRecipient}</dd></div><div><dt class="text-xs text-muted-foreground">Trạng thái tối thiểu</dt><dd class="mt-1">{item.minimumState}</dd></div></dl></article>{/each}</section>{/if}

  {#if showAcceptance && brief.qualityRequirements.length > 0}<section class="space-y-3"><h6 class="text-sm font-bold">Yêu cầu chất lượng</h6>{#each brief.qualityRequirements as item (item.id)}<div class="rounded-xl border p-4 text-sm"><p class="font-semibold">{item.property}</p><p class="mt-1 text-muted-foreground">Áp dụng cho: {item.appliesTo}</p><p class="mt-2">Cách biết đã đạt: {item.observableCheck}</p></div>{/each}</section>{/if}

  {#if showContent && (validLines(brief.constraints).length > 0 || brief.dependencies.length > 0)}<div class="grid gap-4 md:grid-cols-2">{#if validLines(brief.constraints).length > 0}<section class="rounded-xl border p-4"><h6 class="text-sm font-bold">Giới hạn riêng</h6><ul class="mt-3 space-y-2 text-sm">{#each validLines(brief.constraints) as item (item.id)}<li class="rounded-lg border bg-muted/20 px-3 py-2">{item.text}</li>{/each}</ul></section>{/if}{#if brief.dependencies.length > 0}<section class="rounded-xl border p-4"><h6 class="text-sm font-bold">Phụ thuộc</h6><ul class="mt-3 space-y-2 text-sm">{#each brief.dependencies as item (item.id)}<li class="rounded-lg border bg-muted/20 px-3 py-2"><span class="font-medium">{item.dependency}</span>{#if item.owner}<span class="text-muted-foreground"> · {item.owner}</span>{/if}<Badge class="ml-2" variant="outline">{item.state === 'available' ? 'Sẵn sàng' : item.state === 'waiting' ? 'Đang chờ' : 'Bị chặn'}</Badge></li>{/each}</ul></section>{/if}</div>{/if}

  {#if showAcceptance && brief.acceptanceCriteria.length > 0}<section class="space-y-3"><h6 class="text-sm font-bold">Tiêu chí nghiệm thu</h6><p class="text-xs text-muted-foreground">Người giao và reviewer đối chiếu các điều kiện này sau khi công việc hoàn tất.</p>{#each brief.acceptanceCriteria as item, index (item.id)}<article class="rounded-xl border bg-background/80 p-4"><p class="text-sm font-semibold">Tiêu chí {index + 1}</p><dl class="mt-3 grid gap-3 text-sm md:grid-cols-3"><div><dt class="text-xs text-muted-foreground">Điều kiện</dt><dd class="mt-1">{item.condition}</dd></div><div><dt class="text-xs text-muted-foreground">Hành động/đầu vào</dt><dd class="mt-1">{item.action}</dd></div><div><dt class="text-xs text-muted-foreground">Kết quả quan sát</dt><dd class="mt-1">{item.observableResult}</dd></div></dl></article>{/each}</section>{/if}

  {#if showAcceptance && brief.desiredValue && (nonEmpty(brief.desiredValue.beneficiary) || nonEmpty(brief.desiredValue.usefulState))}<section class="rounded-xl border border-primary/20 bg-primary/[0.03] p-4"><h6 class="text-sm font-bold">Giá trị mong muốn</h6><dl class="mt-3 grid gap-3 text-sm md:grid-cols-2"><div><dt class="text-xs text-muted-foreground">Đối tượng được hưởng lợi</dt><dd class="mt-1">{brief.desiredValue.beneficiary}</dd></div><div><dt class="text-xs text-muted-foreground">Khả năng/trạng thái có ích</dt><dd class="mt-1">{brief.desiredValue.usefulState}</dd></div></dl></section>{/if}
</section>
