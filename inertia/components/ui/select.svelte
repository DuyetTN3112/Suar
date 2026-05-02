<script lang="ts">
  import type { Snippet } from "svelte"
  import { setContext } from "svelte"
  import type { HTMLAttributes } from "svelte/elements"

  import { cn } from "$lib/utils-svelte"

  import { SELECT_CONTEXT, type SelectContext } from "./select_context"

  type Props = HTMLAttributes<HTMLDivElement> & {
    class?: string
    children?: Snippet
    value?: string
    onValueChange?: (value: string) => void
    open?: boolean
    onOpenChange?: (open: boolean) => void
    type?: string
    disabled?: boolean
    required?: boolean
    id?: string
    name?: string
    placeholder?: string
    "aria-label"?: string
  }

  let {
    class: className,
    children,
    value = $bindable(""),
    onValueChange,
    open = $bindable(false),
    onOpenChange,
    type: _type,
    disabled,
    required: _required,
    id: _id,
    name: _name,
    placeholder: _placeholder,
    "aria-label": _ariaLabel,
    ...restProps
  }: Props = $props()

  const items = new Map<string, string>()
  let hasOpened = $state(false)
  let container = $state<HTMLDivElement | null>(null)

  function setValue(nextValue: string) {
    if (disabled) return
    value = nextValue
    onValueChange?.(nextValue)
    if (open) {
      open = false
      onOpenChange?.(false)
    }
  }

  function setOpenState(nextOpen: boolean) {
    if (disabled && nextOpen) return
    if (nextOpen) {
      hasOpened = true
    }
    open = nextOpen
    onOpenChange?.(nextOpen)
  }

  function toggleOpen() {
    setOpenState(!open)
  }

  function handleDocumentClick(e: MouseEvent) {
    if (!open) return
    if (container && !container.contains(e.target as Node)) {
      setOpenState(false)
    }
  }

  $effect(() => {
    if (!open) return
    document.addEventListener('click', handleDocumentClick, true)
    return () => {
      document.removeEventListener('click', handleDocumentClick, true)
    }
  })

  const context: SelectContext = {
    get value() {
      return value
    },
    get open() {
      return open
    },
    get hasOpened() {
      return hasOpened
    },
    get disabled() {
      return Boolean(disabled)
    },
    setValue,
    setOpen: setOpenState,
    toggleOpen,
    registerItem: (itemValue, label) => {
      if (!itemValue) return () => { /* noop */ }
      items.set(itemValue, label)
      return () => {
        if (items.get(itemValue) === label) {
          items.delete(itemValue)
        }
      }
    },
    getLabel: (itemValue) => items.get(itemValue),
  }

  setContext(SELECT_CONTEXT, context)
</script>

<div bind:this={container} class={cn("relative w-full", className)} {...restProps}>
  {@render children?.()}
</div>
