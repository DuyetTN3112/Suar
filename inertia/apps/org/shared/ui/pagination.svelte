<script lang="ts">
  import type { Snippet } from "svelte"
  import type { HTMLAttributes } from "svelte/elements"

  import { useTranslation } from "@/apps/org/shared/stores/translation.svelte"
  import { cn } from "$lib/utils-svelte"

  type Props = HTMLAttributes<HTMLElement> & {
    class?: string
    children?: Snippet
    currentPage?: number
    totalPages?: number
    onPageChange?: (page: number) => void
    baseUrl?: string
    pageParam?: string
    queryParams?: Record<string, unknown>
  }

  type PaginationLink = {
    key: string
    page: number | null
    label: string
    href: string | null
    isCurrent: boolean
    isDisabled: boolean
    isEllipsis?: boolean
  }

  const {
    class: className,
    children,
    currentPage,
    totalPages,
    onPageChange,
    baseUrl,
    pageParam = "page",
    queryParams = {},
    ...restProps
  }: Props = $props()
  const { t } = useTranslation()

  const paginationRootClass = "mx-auto flex w-full justify-center"
  const paginationItemClass =
    "inline-flex min-w-9 items-center justify-center rounded-md border border-border px-3 py-2 text-sm font-medium transition-colors"
  const paginationActiveClass = "border-primary bg-primary text-primary-foreground"
  const paginationIdleClass = "bg-background text-foreground hover:bg-accent"
  const paginationDisabledClass = "pointer-events-none opacity-50"

  function normalizePageNumber(value: number | undefined): number {
    if (typeof value !== "number" || !Number.isFinite(value)) return 1
    return Math.max(1, Math.trunc(value))
  }

  function normalizeTotalPages(value: number | undefined): number {
    if (typeof value !== "number" || !Number.isFinite(value)) return 1
    return Math.max(1, Math.trunc(value))
  }

  function shouldKeepQueryValue(value: unknown): boolean {
    return value !== undefined && value !== null && value !== ""
  }

  function buildHref(page: number): string | null {
    if (!baseUrl) return null

    const searchParams = new URLSearchParams()
    for (const [key, value] of Object.entries(queryParams)) {
      if (!shouldKeepQueryValue(value)) continue

      if (Array.isArray(value)) {
        for (const item of value) {
          if (shouldKeepQueryValue(item)) {
            searchParams.append(key, String(item))
          }
        }
        continue
      }

      searchParams.set(key, String(value))
    }

    searchParams.set(pageParam, String(page))
    const query = searchParams.toString()
    return query.length > 0 ? `${baseUrl}?${query}` : baseUrl
  }

  function buildPageWindow(current: number, total: number): Array<number | "ellipsis"> {
    if (total <= 7) {
      return Array.from({ length: total }, (_, index) => index + 1)
    }

    const visible = new Set<number>([1, total, current, current - 1, current + 1])
    if (current <= 3) {
      visible.add(2)
      visible.add(3)
      visible.add(4)
    }
    if (current >= total - 2) {
      visible.add(total - 1)
      visible.add(total - 2)
      visible.add(total - 3)
    }

    const sorted = [...visible].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b)
    const window: Array<number | "ellipsis"> = []

    for (let index = 0; index < sorted.length; index++) {
      const page = sorted[index]
      if (page === undefined) continue

      const previous = sorted[index - 1]
      if (previous !== undefined && page - previous > 1) {
        window.push("ellipsis")
      }
      window.push(page)
    }

    return window
  }

  function visitPage(page: number) {
    if (!onPageChange) return
    onPageChange(page)
  }

  const resolvedCurrentPage = $derived(normalizePageNumber(currentPage))
  const resolvedTotalPages = $derived(normalizeTotalPages(totalPages))
  const pageWindow = $derived(buildPageWindow(resolvedCurrentPage, resolvedTotalPages))
  const pageItems = $derived(
    pageWindow.map((item, index) => {
      if (item === "ellipsis") {
        return {
          key: `ellipsis-${index}`,
          page: null,
          label: "…",
          href: null,
          isCurrent: false,
          isDisabled: true,
          isEllipsis: true,
        } satisfies PaginationLink
      }

      return {
        key: `page-${item}`,
        page: item,
        label: String(item),
        href: buildHref(item),
        isCurrent: item === resolvedCurrentPage,
        isDisabled: item === resolvedCurrentPage,
      } satisfies PaginationLink
    })
  )
  const previousItem = $derived({
    page: Math.max(1, resolvedCurrentPage - 1),
    href: buildHref(Math.max(1, resolvedCurrentPage - 1)),
    isDisabled: resolvedCurrentPage <= 1,
  })
  const nextItem = $derived({
    page: Math.min(resolvedTotalPages, resolvedCurrentPage + 1),
    href: buildHref(Math.min(resolvedTotalPages, resolvedCurrentPage + 1)),
    isDisabled: resolvedCurrentPage >= resolvedTotalPages,
  })
</script>

{#snippet renderControl(
  item: PaginationLink | { page: number; href: string | null; isDisabled: boolean },
  label: string,
  ariaLabel: string
)}
  {#if item.href}
    <a
      href={item.href}
      aria-label={ariaLabel}
      aria-current={'isCurrent' in item && item.isCurrent ? 'page' : undefined}
      class={cn(
        paginationItemClass,
        'isCurrent' in item && item.isCurrent ? paginationActiveClass : paginationIdleClass,
        item.isDisabled && paginationDisabledClass
      )}
    >
      {label}
    </a>
  {:else}
    <button
      type="button"
      aria-label={ariaLabel}
      aria-current={'isCurrent' in item && item.isCurrent ? 'page' : undefined}
      class={cn(
        paginationItemClass,
        'isCurrent' in item && item.isCurrent ? paginationActiveClass : paginationIdleClass,
        item.isDisabled && paginationDisabledClass
      )}
      disabled={item.isDisabled}
      onclick={() => {
        if (item.page !== null) {
          visitPage(item.page)
        }
      }}
    >
      {label}
    </button>
  {/if}
{/snippet}

<nav
  aria-label={t('ui_misc.pagination.navigation_aria', {}, 'Pagination')}
  class={cn(paginationRootClass, className)}
  {...restProps}
>
  {#if children}
    {@render children()}
  {:else}
    <div class="flex flex-wrap items-center justify-center gap-2">
      {@render renderControl(
        previousItem,
        t('ui_misc.pagination.previous', {}, 'Previous'),
        t('ui_misc.pagination.previous_page_aria', {}, 'Previous page')
      )}

      {#each pageItems as item (item.key)}
        {#if item.isEllipsis}
          <span
            aria-hidden="true"
            class={cn(paginationItemClass, 'cursor-default bg-background text-muted-foreground')}
          >
            {item.label}
          </span>
        {:else}
          {@render renderControl(
            item,
            item.label,
            t('ui_misc.pagination.page_aria', { page: item.label }, 'Page :page')
          )}
        {/if}
      {/each}

      {@render renderControl(
        nextItem,
        t('ui_misc.pagination.next', {}, 'Next'),
        t('ui_misc.pagination.next_page_aria', {}, 'Next page')
      )}
    </div>
  {/if}
</nav>
