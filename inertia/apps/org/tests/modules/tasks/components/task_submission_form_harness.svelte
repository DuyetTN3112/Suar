<script lang="ts">
  import TaskSubmissionForm from '@/apps/org/modules/tasks/components/detail/task_submission_form.svelte'

  let summary = ''
  let implementationNotes = ''
  let knownLimitations = ''
  let testNotes = ''
  let demoUrl = ''
  let repositoryUrl = ''
  let pullRequestUrl = ''
  let evidences: Array<{
    id: string
    evidenceType: string
    url: string
    title?: string | null
    description?: string | null
  }> = [
    {
      id: 'evidence-1',
      evidenceType: 'pull_request',
      url: 'https://example.com/original-pr',
      title: 'PR gốc',
      description: 'Bằng chứng ban đầu',
    },
  ]

  function handleAddEvidence(
    evidence: {
      id?: string
      evidenceType: string
      url: string
      title?: string | null
      description?: string | null
    }
  ) {
    evidences = [
      ...evidences,
      {
        ...evidence,
        id: `evidence-${evidences.length + 1}`,
      },
    ]
  }

  function handleRemoveEvidence(index: number) {
    evidences = evidences.filter((_, evidenceIndex) => evidenceIndex !== index)
  }
</script>

<TaskSubmissionForm
  bind:summary
  bind:implementationNotes
  bind:knownLimitations
  bind:testNotes
  bind:demoUrl
  bind:repositoryUrl
  bind:pullRequestUrl
  bind:evidences
  saving={false}
  submitting={false}
  onSaveDraft={() => {}}
  onSubmitPackage={() => {}}
  onAddEvidence={handleAddEvidence}
  onRemoveEvidence={handleRemoveEvidence}
/>
