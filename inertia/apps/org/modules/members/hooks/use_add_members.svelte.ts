import { router } from '@inertiajs/svelte'
import { writable } from 'svelte/store'

import { buildOffsetPagination } from '@/apps/org/shared/lib/pagination'
import type { OffsetPagePagination } from '@/apps/org/shared/lib/pagination'
import { notificationStore } from '@/apps/org/shared/stores/notification_store.svelte'
import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'

import type { OrganizationMemberCandidate } from '../types'

interface MemberCandidatesResponse {
  data: OrganizationMemberCandidate[]
  pagination?: {
    page?: number
    perPage?: number
    total?: number
    hasNextPage?: boolean
  }
}

interface RouterErrorBag {
  message?: string
}

export function createAddMembers() {
  const { t } = useTranslation()
  const addMemberModalOpen = writable(false)
  const candidates = writable<OrganizationMemberCandidate[]>([])
  const selectedUserIds = writable<string[]>([])
  const searchUserTerm = writable('')
  const isLoadingCandidates = writable(false)
  const isAddingMembers = writable(false)
  const pagination = writable<OffsetPagePagination>({
    mode: 'offset',
    page: 1,
    perPage: 10,
    total: 0,
    lastPage: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  })

  async function loadMemberCandidates(page = 1, search = '') {
    isLoadingCandidates.set(true)
    try {
      const response = await fetch(
        `/org/members/candidates?page=${page}${search ? `&search=${search}` : ''}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        }
      )
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const result = (await response.json()) as MemberCandidatesResponse
      if (Array.isArray(result.data)) {
        candidates.set(result.data)
        const pageNumber = result.pagination?.page ?? 1
        const perPage = result.pagination?.perPage ?? 10
        const total = result.pagination?.total ?? result.data.length
        pagination.set(
          buildOffsetPagination({
            page: pageNumber,
            perPage,
            total,
            hasNextPage: result.pagination?.hasNextPage,
          })
        )
      } else {
        candidates.set([])
      }
    } catch (error) {
      console.error('Unable to load organization member candidates:', error)
      notificationStore.error(t('user.error.load_users_failed', {}, 'Failed to load users'))
      candidates.set([])
    } finally {
      isLoadingCandidates.set(false)
    }
  }

  function openAddMemberModal(searchTerm = '') {
    addMemberModalOpen.set(true)
    selectedUserIds.set([])
    void loadMemberCandidates(1, searchTerm)
  }

  function handleSearchUsers(e: Event, searchTerm: string) {
    e.preventDefault()
    void loadMemberCandidates(1, searchTerm)
  }

  function toggleUserSelection(userId: string) {
    selectedUserIds.update((prevSelected) =>
      prevSelected.includes(userId) ? prevSelected.filter((id) => id !== userId) : [...prevSelected, userId]
    )
  }

  function handleAddMembersToOrganization(userIds: string[]) {
    if (userIds.length === 0) {
      notificationStore.error(
        t('user.error.no_users_selected', {}, 'Please select at least one user')
      )
      return
    }

    isAddingMembers.set(true)
    router.post(
      '/org/members/add',
      { userIds },
      {
        preserveState: true,
        preserveScroll: true,
        onSuccess: () => {
          notificationStore.success(
            t('user.success.users_added', {}, 'Users successfully added to organization')
          )
          addMemberModalOpen.set(false)
          isAddingMembers.set(false)
          selectedUserIds.set([])
          router.reload({ only: ['members', 'pagination', 'flash'] })
        },
        onError: (errors: RouterErrorBag) => {
          console.error('Unable to add users to organization:', errors)
          isAddingMembers.set(false)
          notificationStore.error(
            errors.message ??
              t('user.error.add_failed', {}, 'Failed to add users to organization')
          )
        },
      }
    )
  }

  return {
    addMemberModalOpen,
    setAddMemberModalOpen: (value: boolean) => {
      addMemberModalOpen.set(value)
    },
    candidates,
    selectedUserIds,
    searchUserTerm,
    setSearchUserTerm: (value: string) => {
      searchUserTerm.set(value)
    },
    isLoadingCandidates,
    isAddingMembers,
    pagination,
    loadMemberCandidates,
    openAddMemberModal,
    handleSearchUsers,
    toggleUserSelection,
    handleAddMembersToOrganization,
  }
}
