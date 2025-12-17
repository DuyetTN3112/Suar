<script lang="ts">
  import Badge from '@/apps/user/shared/ui/badge.svelte'
  import Card from '@/apps/user/shared/ui/card.svelte'
  import CardContent from '@/apps/user/shared/ui/card_content.svelte'
  import CardHeader from '@/apps/user/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/user/shared/ui/card_title.svelte'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'
  import { formatTaskVerificationMethodForDisplay } from '@/apps/user/modules/tasks/lib/rules/task_verification_methods'
  import type { TaskDetail } from '@/apps/user/modules/tasks/types/index.svelte'
  import TaskExecutionBrief from '@/apps/user/modules/tasks/components/detail/task_execution_brief.svelte'

  interface Props {
    task: TaskDetail
  }

  const { task }: Props = $props()
  const { t } = useTranslation()
  const verificationMethods = $derived(formatTaskVerificationMethodForDisplay(task.verification_method, t))

  const hasContextCard = $derived(
    Boolean(
      task.task_type ??
        task.acceptance_criteria ??
        task.verification_method ??
        task.context_background ??
        (task.tech_stack?.length ? 'tech-stack' : null) ??
        (task.learning_objectives?.length ? 'learning-objectives' : null) ??
        (task.domain_tags?.length ? 'domain-tags' : null) ??
        task.environment ??
        task.collaboration_type ??
        task.complexity_notes ??
        task.role_in_task ??
        task.autonomy_level ??
        task.problem_category ??
        task.business_domain ??
        task.estimated_users_affected
    )
  )
</script>

{#if hasContextCard}
  <Card>
    <CardHeader>
      <CardTitle>{t('task.context_card.title', {}, 'Context')}</CardTitle>
    </CardHeader>
    <CardContent class="space-y-6">
      {#if task.context_background}
        <div class="space-y-1">
          <h4 class="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('task.context_card.context_background', {}, 'Context')}</h4>
          <p class="rounded-md border border-border/50 bg-muted/30 p-3 text-sm whitespace-pre-wrap">{task.context_background}</p>
        </div>
      {/if}

      {#if task.acceptance_criteria}
        <div class="space-y-1">
          <h4 class="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('task.context_card.acceptance', {}, 'Acceptance')}</h4>
          <p class="rounded-md border border-border/50 bg-muted/30 p-3 text-sm whitespace-pre-wrap">{task.acceptance_criteria}</p>
        </div>
      {/if}

      {#if task.verification_method}
        <div class="space-y-1">
          <h4 class="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('task.context_card.verification', {}, 'Verification')}</h4>
          <div class="rounded-md border border-border/50 bg-muted/30 p-3 text-sm">
            <ul class="list-disc space-y-1 pl-4">
              {#each verificationMethods as method}
                <li>{method}</li>
              {/each}
            </ul>
          </div>
        </div>
      {/if}

      <div class="grid gap-4 md:grid-cols-2">
        {#if task.tech_stack && task.tech_stack.length > 0}
          <div class="space-y-1">
            <h4 class="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('task.context_card.tech_stack', {}, 'Tech stack')}</h4>
            <div class="flex flex-wrap gap-1.5 pt-1">
              {#each task.tech_stack as tech}
                <Badge variant="secondary" class="border-primary/20 bg-primary/5 text-primary">{tech}</Badge>
              {/each}
            </div>
          </div>
        {/if}

        {#if task.domain_tags && task.domain_tags.length > 0}
          <div class="space-y-1">
            <h4 class="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('task.context_card.domain', {}, 'Domain')}</h4>
            <div class="flex flex-wrap gap-1.5 pt-1">
              {#each task.domain_tags as tag}
                <Badge variant="outline" class="border-border bg-secondary/40 text-foreground">{tag}</Badge>
              {/each}
            </div>
          </div>
        {/if}
      </div>

      {#if task.learning_objectives && task.learning_objectives.length > 0}
        <div class="space-y-1">
          <h4 class="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('task.context_card.learning_objectives', {}, 'Learning objectives')}</h4>
          <ul class="list-disc list-inside space-y-1 pl-1 text-sm text-muted-foreground">
            {#each task.learning_objectives as obj}
              <li><span class="text-foreground">{obj}</span></li>
            {/each}
          </ul>
        </div>
      {/if}

      <div class="border-t pt-4">
        <h4 class="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('task.context_card.more_info', {}, 'More information')}</h4>
        <div class="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          {#if task.task_type}
            <div class="rounded-md border bg-muted/10 p-2">
              <span class="block text-[10px] font-bold uppercase text-muted-foreground">{t('task.context_card.task_type', {}, 'Task type')}</span>
              <span class="font-semibold">{task.task_type}</span>
            </div>
          {/if}
          {#if task.environment}
            <div class="rounded-md border bg-muted/10 p-2">
              <span class="block text-[10px] font-bold uppercase text-muted-foreground">{t('task.context_card.environment', {}, 'Environment')}</span>
              <span class="font-semibold">{task.environment}</span>
            </div>
          {/if}
          {#if task.collaboration_type}
            <div class="rounded-md border bg-muted/10 p-2">
              <span class="block text-[10px] font-bold uppercase text-muted-foreground">{t('task.context_card.collaboration', {}, 'Collaboration')}</span>
              <span class="font-semibold">{task.collaboration_type}</span>
            </div>
          {/if}
          {#if task.role_in_task}
            <div class="rounded-md border bg-muted/10 p-2">
              <span class="block text-[10px] font-bold uppercase text-muted-foreground">{t('task.context_card.role', {}, 'Role')}</span>
              <span class="font-semibold">{task.role_in_task}</span>
            </div>
          {/if}
          {#if task.autonomy_level}
            <div class="rounded-md border bg-muted/10 p-2">
              <span class="block text-[10px] font-bold uppercase text-muted-foreground">{t('task.context_card.autonomy', {}, 'Autonomy')}</span>
              <span class="font-semibold">{task.autonomy_level}</span>
            </div>
          {/if}
          {#if task.problem_category}
            <div class="rounded-md border bg-muted/10 p-2">
              <span class="block text-[10px] font-bold uppercase text-muted-foreground">{t('task.context_card.problem', {}, 'Problem')}</span>
              <span class="font-semibold">{task.problem_category}</span>
            </div>
          {/if}
          {#if task.business_domain}
            <div class="rounded-md border bg-muted/10 p-2">
              <span class="block text-[10px] font-bold uppercase text-muted-foreground">{t('task.context_card.business_domain', {}, 'Business domain')}</span>
              <span class="font-semibold">{task.business_domain}</span>
            </div>
          {/if}
          {#if task.estimated_users_affected !== undefined && task.estimated_users_affected !== null}
            <div class="rounded-md border bg-muted/10 p-2">
              <span class="block text-[10px] font-bold uppercase text-muted-foreground">{t('task.context_card.affected_users', {}, 'Affected users')}</span>
              <span class="font-semibold">{task.estimated_users_affected}</span>
            </div>
          {/if}
          {#if task.complexity_notes}
            <div class="col-span-full rounded-md border bg-muted/10 p-2">
              <span class="block text-[10px] font-bold uppercase text-muted-foreground">{t('task.context_card.notes', {}, 'Notes')}</span>
              <span class="font-semibold">{task.complexity_notes}</span>
            </div>
          {/if}
        </div>
      </div>

      <TaskExecutionBrief {task} />
    </CardContent>
  </Card>
{/if}
