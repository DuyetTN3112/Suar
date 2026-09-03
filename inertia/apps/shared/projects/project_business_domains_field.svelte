<script lang="ts">
  import {
    PROJECT_BUSINESS_DOMAIN_OPTIONS,
    type ProjectBusinessDomainValue,
  } from './project_business_domains'

  interface Props {
    domains?: string[]
    editing?: boolean
    onDomainsChange?: (domains: string[]) => void
  }

  let {
    domains = [],
    editing = false,
    onDomainsChange,
  }: Props = $props()

  const normalizedDomains = $derived([...new Set(domains)])
  const selectedOptions = $derived(
    PROJECT_BUSINESS_DOMAIN_OPTIONS.filter((option) => normalizedDomains.includes(option.value))
  )

  function toggleDomain(domain: ProjectBusinessDomainValue, selected: boolean): void {
    const nextDomains = selected
      ? [...new Set([...normalizedDomains, domain])]
      : normalizedDomains.filter((item) => item !== domain)

    onDomainsChange?.(nextDomains)
  }
</script>

<section class="space-y-2" aria-labelledby="project-business-domains-title">
  <div>
    <h3 id="project-business-domains-title" class="text-sm font-medium text-foreground/80">
      Lĩnh vực của Project
    </h3>
    <p class="mt-1 text-xs leading-5 text-muted-foreground">
      Task mới tự nhận ngữ cảnh này khi được tạo. Task không tự chọn lĩnh vực riêng.
    </p>
  </div>

  {#if editing}
    <fieldset class="grid gap-2 sm:grid-cols-2" aria-describedby="project-business-domains-title">
      <legend class="sr-only">Chọn lĩnh vực của Project</legend>
      {#each PROJECT_BUSINESS_DOMAIN_OPTIONS as option (option.value)}
        <label class="flex cursor-pointer items-start gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm transition-colors hover:bg-muted/50">
          <input
            type="checkbox"
            checked={normalizedDomains.includes(option.value)}
            onchange={(event) => toggleDomain(option.value, event.currentTarget.checked)}
            class="mt-0.5 size-4 accent-primary"
          />
          <span>{option.label}</span>
        </label>
      {/each}
    </fieldset>
  {:else if selectedOptions.length > 0}
    <div class="flex flex-wrap gap-2">
      {#each selectedOptions as option (option.value)}
        <span class="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-foreground">
          {option.label}
        </span>
      {/each}
    </div>
  {:else}
    <p class="rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
      Chưa cấu hình lĩnh vực. Task vẫn tạo được nhưng AI và hồ sơ sẽ không có ngữ cảnh lĩnh vực từ Project.
    </p>
  {/if}
</section>
