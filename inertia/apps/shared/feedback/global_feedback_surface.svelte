<script lang="ts">
  import { page } from '@inertiajs/svelte'
  import { onMount } from 'svelte'
  import { toast } from 'svelte-sonner'

  import { API_PROBLEM_EVENT } from '@/apps/shared/http/axios_error_policy'
  import type { NormalizedApiProblem } from '@/apps/shared/http/api_problem'

  interface FeedbackFlash {
    success?: unknown
    error?: unknown
    warning?: unknown
    info?: unknown
    message?: unknown
  }

  interface FeedbackPageProps {
    flash?: FeedbackFlash
    errors?: Record<string, unknown>
  }

  let lastPageFeedbackSignature = ''

  function asText(value: unknown): string | null {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
  }

  function flattenErrorMessages(value: unknown): string[] {
    const direct = asText(value)
    if (direct) return [direct]

    if (Array.isArray(value)) {
      return value.flatMap((entry) => flattenErrorMessages(entry))
    }

    if (typeof value === 'object' && value !== null) {
      return Object.values(value).flatMap((entry) => flattenErrorMessages(entry))
    }

    return []
  }

  function emitPageFeedback(props: FeedbackPageProps) {
    const flash = props.flash ?? {}
    const errors = props.errors ?? {}
    const signature = JSON.stringify({ flash, errors })
    if (signature === lastPageFeedbackSignature) return
    lastPageFeedbackSignature = signature

    const success = asText(flash.success)
    if (success) toast.success(success)

    const error = asText(flash.error)
    if (error) toast.error(error)

    const warning = asText(flash.warning)
    if (warning) toast.warning(warning)

    const info = asText(flash.info) ?? asText(flash.message)
    if (info) toast.info(info)

    const messages = flattenErrorMessages(errors)
    if (messages.length > 0) {
      toast.error('Please fix the highlighted fields.', {
        description: messages.slice(0, 3).join('\n'),
      })
    }
  }

  function emitApiProblem(problem: NormalizedApiProblem) {
    const fieldMessages = flattenErrorMessages(problem.fieldErrors)
    const description = fieldMessages.length > 0 ? fieldMessages.slice(0, 3).join('\n') : problem.detail
    toast.error(problem.title, { description })
  }

  $effect(() => {
    emitPageFeedback((page.props ?? {}) as FeedbackPageProps)
  })

  onMount(() => {
    const handleProblem = (event: Event) => {
      const problem = (event as CustomEvent<NormalizedApiProblem>).detail
      if (!problem) return
      emitApiProblem(problem)
    }

    window.addEventListener(API_PROBLEM_EVENT, handleProblem)
    return () => {
      window.removeEventListener(API_PROBLEM_EVENT, handleProblem)
    }
  })
</script>
