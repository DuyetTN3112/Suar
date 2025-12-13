import type { ProjectKey } from './types.js'

export interface ProjectAttachmentSpec {
  project: ProjectKey
  file_name: string
  mime_type: string
}

export const SEED_PROJECT_ATTACHMENTS_SPECS: ProjectAttachmentSpec[] = [
  {
    project: 'orgAPlatform',
    file_name: 'org-context-role-matrix.pdf',
    mime_type: 'application/pdf',
  },
  {
    project: 'orgAOperations',
    file_name: 'admin-redirect-regression.md',
    mime_type: 'text/markdown',
  },
]
