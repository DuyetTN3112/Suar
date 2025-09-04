export interface ReviewConfirmationEntry {
  user_id: string
  action: 'confirmed' | 'disputed'
  dispute_reason?: string | null
  created_at: string
}
