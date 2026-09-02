import type { FilterCriteria, FilterPresentationState } from '../contracts'

import {
  FilterSavedViewClient,
  type FilterSavedViewDto,
  type CreateSavedViewInput,
  type SavedViewGrant,
  type SavedViewShareScope,
  type SavedViewVisibility,
  SavedViewClientError,
} from './filter_saved_view_client'

export interface SavedViewShareConflict {
  viewId: string
  attempted: {
    grants: SavedViewGrant[]
    visibility: SavedViewVisibility
    scope: SavedViewShareScope
  }
  latest: FilterSavedViewDto | null
}

export function createSavedViewState(clientOptions: { client?: FilterSavedViewClient } = {}) {
  const client = clientOptions.client ?? new FilterSavedViewClient()

  let views = $state<FilterSavedViewDto[]>([])
  let activeViewId = $state<string | null>(null)
  let loading = $state(false)
  let error = $state<SavedViewClientError | null>(null)
  let repairNeededView = $state<FilterSavedViewDto | null>(null)
  let sharingView = $state<FilterSavedViewDto | null>(null)
  let shareConflict = $state<SavedViewShareConflict | null>(null)
  let currentContextKey = $state<string | null>(null)

  const activeView = $derived(
    views.find((v) => v.id === activeViewId) ?? null
  )

  const pinnedViews = $derived(
    views.filter((v) => v.isPinned)
  )

  const defaultView = $derived(
    views.find((v) => v.isDefault) ?? null
  )

  async function loadViews(contextKey: string) {
    currentContextKey = contextKey
    loading = true
    error = null
    try {
      views = await client.listSavedViews(contextKey)
      const reqRepair = views.find((v) => v.migrationState === 'requires_repair' || v.migrationState === 'blocked')
      if (reqRepair) {
        repairNeededView = reqRepair
      }
    } catch (err) {
      error = err instanceof SavedViewClientError ? err : new SavedViewClientError('UNKNOWN_ERROR', (err as Error).message)
    } finally {
      loading = false
    }
  }

  function selectView(viewId: string, applyFn?: (criteria: FilterCriteria, presentation: FilterPresentationState) => void) {
    const target = views.find((v) => v.id === viewId)
    if (!target) return

    activeViewId = viewId
    if (applyFn) {
      applyFn(target.criteria, target.presentation)
    }
  }

  function clearActiveView() {
    activeViewId = null
  }

  async function createView(input: Omit<CreateSavedViewInput, 'contextKey' | 'contextOwner'> & { contextKey?: string; contextOwner?: string }) {
    const contextKey = input.contextKey ?? currentContextKey
    if (!contextKey) {
      throw new SavedViewClientError('UNKNOWN_ERROR', 'No active context for creating saved view')
    }

    loading = true
    error = null
    try {
      const newView = await client.createSavedView({
        ...input,
        contextKey,
        contextOwner: input.contextOwner ?? 'system',
      })
      views = [newView, ...views]
      activeViewId = newView.id
      return newView
    } catch (err) {
      error = err instanceof SavedViewClientError ? err : new SavedViewClientError('UNKNOWN_ERROR', (err as Error).message)
      throw error
    } finally {
      loading = false
    }
  }

  async function updateViewCriteria(id: string, criteria: FilterCriteria, presentation?: FilterPresentationState) {
    const target = views.find((v) => v.id === id)
    if (!target) return

    loading = true
    error = null
    try {
      const updated = await client.updateSavedView(id, {
        criteria,
        presentation: presentation ?? target.presentation,
        expectedLockVersion: target.lockVersion,
      })
      views = views.map((v) => (v.id === id ? updated : v))
      return updated
    } catch (err) {
      error = err instanceof SavedViewClientError ? err : new SavedViewClientError('UNKNOWN_ERROR', (err as Error).message)
      throw error
    } finally {
      loading = false
    }
  }

  async function renameView(id: string, newName: string, description?: string | null) {
    const target = views.find((v) => v.id === id)
    if (!target) return

    loading = true
    error = null
    try {
      const updated = await client.updateSavedView(id, {
        name: newName,
        description,
        expectedLockVersion: target.lockVersion,
      })
      views = views.map((v) => (v.id === id ? updated : v))
      return updated
    } catch (err) {
      error = err instanceof SavedViewClientError ? err : new SavedViewClientError('UNKNOWN_ERROR', (err as Error).message)
      throw error
    } finally {
      loading = false
    }
  }

  async function deleteView(id: string) {
    const target = views.find((v) => v.id === id)
    if (!target) return

    loading = true
    error = null
    try {
      await client.deleteSavedView(id, target.lockVersion)
      views = views.filter((v) => v.id !== id)
      if (activeViewId === id) {
        activeViewId = null
      }
    } catch (err) {
      error = err instanceof SavedViewClientError ? err : new SavedViewClientError('UNKNOWN_ERROR', (err as Error).message)
      throw error
    } finally {
      loading = false
    }
  }

  async function duplicateView(id: string, newName: string) {
    loading = true
    error = null
    try {
      const dup = await client.duplicateSavedView(id, newName)
      views = [dup, ...views]
      activeViewId = dup.id
      return dup
    } catch (err) {
      error = err instanceof SavedViewClientError ? err : new SavedViewClientError('UNKNOWN_ERROR', (err as Error).message)
      throw error
    } finally {
      loading = false
    }
  }

  async function togglePin(id: string) {
    const target = views.find((v) => v.id === id)
    if (!target) return

    loading = true
    error = null
    try {
      const updated = await client.togglePin(id, !target.isPinned, target.lockVersion)
      views = views.map((v) => (v.id === id ? updated : v))
      return updated
    } catch (err) {
      error = err instanceof SavedViewClientError ? err : new SavedViewClientError('UNKNOWN_ERROR', (err as Error).message)
      throw error
    } finally {
      loading = false
    }
  }

  async function toggleDefault(id: string) {
    const target = views.find((v) => v.id === id)
    if (!target) return

    loading = true
    error = null
    try {
      const nextDefault = !target.isDefault
      const updated = await client.toggleDefault(id, nextDefault, target.lockVersion)
      views = views.map((v) => {
        if (v.id === id) return updated
        if (nextDefault && v.isDefault) return { ...v, isDefault: false }
        return v
      })
      return updated
    } catch (err) {
      error = err instanceof SavedViewClientError ? err : new SavedViewClientError('UNKNOWN_ERROR', (err as Error).message)
      throw error
    } finally {
      loading = false
    }
  }

  async function shareView(
    id: string,
    grants: SavedViewGrant[],
    visibility: SavedViewVisibility,
    scope: SavedViewShareScope
  ) {
    const target = views.find((v) => v.id === id)
    if (!target) return

    loading = true
    error = null
    try {
      const updated = await client.shareSavedView(id, grants, visibility, target.lockVersion, scope)
      views = views.map((v) => (v.id === id ? updated : v))
      sharingView = null
      shareConflict = null
      return updated
    } catch (err) {
      error = err instanceof SavedViewClientError ? err : new SavedViewClientError('UNKNOWN_ERROR', (err as Error).message)
      if (error.code === 'OPTIMISTIC_CONFLICT') {
        shareConflict = {
          viewId: id,
          attempted: { grants, visibility, scope },
          latest: null,
        }
      }
      throw error
    } finally {
      loading = false
    }
  }

  async function reloadShareConflict() {
    if (!shareConflict) return

    loading = true
    error = null
    try {
      const latest = await client.getSavedView(shareConflict.viewId)
      views = views.map((view) => (view.id === latest.id ? latest : view))
      sharingView = latest
      shareConflict = { ...shareConflict, latest }
      return latest
    } catch (err) {
      error = err instanceof SavedViewClientError ? err : new SavedViewClientError('UNKNOWN_ERROR', (err as Error).message)
      throw error
    } finally {
      loading = false
    }
  }

  async function reapplyShareConflict() {
    const conflict = shareConflict
    if (!conflict?.latest) {
      throw new SavedViewClientError('OPTIMISTIC_CONFLICT', 'Reload the latest permissions before reapplying.')
    }

    loading = true
    error = null
    try {
      const updated = await client.shareSavedView(
        conflict.viewId,
        conflict.attempted.grants,
        conflict.attempted.visibility,
        conflict.latest.lockVersion,
        conflict.attempted.scope
      )
      views = views.map((view) => (view.id === updated.id ? updated : view))
      sharingView = null
      shareConflict = null
      return updated
    } catch (err) {
      error = err instanceof SavedViewClientError ? err : new SavedViewClientError('UNKNOWN_ERROR', (err as Error).message)
      if (error.code === 'OPTIMISTIC_CONFLICT') {
        shareConflict = { ...conflict, latest: null }
      }
      throw error
    } finally {
      loading = false
    }
  }

  async function repairView(id: string, repairedCriteria: FilterCriteria) {
    const target = views.find((v) => v.id === id)
    if (!target) return

    loading = true
    error = null
    try {
      const updated = await client.updateSavedView(id, {
        criteria: repairedCriteria,
        expectedLockVersion: target.lockVersion,
        repair: true,
      })
      const repairedView = { ...updated, migrationState: 'current' as const }
      views = views.map((v) => (v.id === id ? repairedView : v))
      if (repairNeededView?.id === id) {
        repairNeededView = repairedView
      }
      return repairedView
    } catch (err) {
      error = err instanceof SavedViewClientError ? err : new SavedViewClientError('UNKNOWN_ERROR', (err as Error).message)
      throw error
    } finally {
      loading = false
    }
  }

  return {
    get views() { return views },
    get activeViewId() { return activeViewId },
    get activeView() { return activeView },
    get pinnedViews() { return pinnedViews },
    get defaultView() { return defaultView },
    get loading() { return loading },
    get error() { return error },
    get repairNeededView() { return repairNeededView },
    get sharingView() { return sharingView },
    get shareConflict() { return shareConflict },
    set sharingView(val: FilterSavedViewDto | null) { sharingView = val },
    set repairNeededView(val: FilterSavedViewDto | null) { repairNeededView = val },

    loadViews,
    selectView,
    clearActiveView,
    createView,
    updateViewCriteria,
    renameView,
    deleteView,
    duplicateView,
    togglePin,
    toggleDefault,
    shareView,
    reloadShareConflict,
    reapplyShareConflict,
    repairView,
  }
}
