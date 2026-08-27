import db from '@adonisjs/lucid/services/db'

import type {
  RecruiterBookmarkRecord,
  RecruiterBookmarkListItem,
  RecruiterBookmarkRepository,
  RecruiterBookmarkWorkspaceInput,
  RecruiterBookmarkWorkspaceRow,
} from '#modules/users/actions/ports/outbound/recruiter_bookmark_repository'
import type { UserTransaction } from '#modules/users/actions/ports/outbound/user_transaction'
import { toLucidUserTransaction } from '#modules/users/infra/adapters/profile/lucid_user_transaction_runner'

export class LucidRecruiterBookmarkRepository implements RecruiterBookmarkRepository {
  async findOwned(
    bookmarkId: string,
    recruiterUserId: string,
    transaction?: UserTransaction
  ): Promise<RecruiterBookmarkRecord | null> {
    return (await (toLucidUserTransaction(transaction) ?? db)
      .from('recruiter_bookmarks')
      .where('id', bookmarkId)
      .where('recruiter_user_id', recruiterUserId)
      .first()) as RecruiterBookmarkRecord | null
  }

  async findByRecruiterAndTalent(
    recruiterUserId: string,
    talentUserId: string,
    transaction?: UserTransaction
  ): Promise<RecruiterBookmarkRecord | null> {
    return (await (toLucidUserTransaction(transaction) ?? db)
      .from('recruiter_bookmarks')
      .where('recruiter_user_id', recruiterUserId)
      .where('talent_user_id', talentUserId)
      .first()) as RecruiterBookmarkRecord | null
  }

  async create(
    data: Omit<RecruiterBookmarkRecord, 'id' | 'created_at' | 'updated_at'>,
    transaction: UserTransaction
  ): Promise<RecruiterBookmarkRecord> {
    const trx = toLucidUserTransaction(transaction)
    if (!trx) throw new TypeError('Recruiter bookmark creation requires a transaction')
    const [created] = (await trx
      .table('recruiter_bookmarks')
      .insert({ id: db.raw('gen_random_uuid_v7()'), ...data })
      .returning('*')) as RecruiterBookmarkRecord[]
    if (!created) throw new TypeError('Recruiter bookmark insert returned no row')
    return created
  }

  async update(
    bookmarkId: string,
    recruiterUserId: string,
    data: Partial<Pick<RecruiterBookmarkRecord, 'notes' | 'folder' | 'rating'>>,
    transaction: UserTransaction
  ): Promise<RecruiterBookmarkRecord | null> {
    const trx = toLucidUserTransaction(transaction)
    if (!trx) throw new TypeError('Recruiter bookmark update requires a transaction')
    const [updated] = (await trx
      .from('recruiter_bookmarks')
      .where('id', bookmarkId)
      .where('recruiter_user_id', recruiterUserId)
      .update(data)
      .returning('*')) as RecruiterBookmarkRecord[]
    return updated ?? null
  }

  async delete(
    bookmarkId: string,
    recruiterUserId: string,
    transaction: UserTransaction
  ): Promise<boolean> {
    const trx = toLucidUserTransaction(transaction)
    if (!trx) throw new TypeError('Recruiter bookmark deletion requires a transaction')
    const deleted = await trx
      .from('recruiter_bookmarks')
      .where('id', bookmarkId)
      .where('recruiter_user_id', recruiterUserId)
      .delete()
    return Number(deleted) > 0
  }

  async listByRecruiter(recruiterUserId: string): Promise<RecruiterBookmarkListItem[]> {
    return db
      .from('recruiter_bookmarks as rb')
      .join('users as u', 'u.id', 'rb.talent_user_id')
      .where('rb.recruiter_user_id', recruiterUserId)
      .select('rb.*', 'u.username as talent_username')
      .orderBy('rb.created_at', 'desc') as Promise<RecruiterBookmarkListItem[]>
  }

  async listWorkspace(
    input: RecruiterBookmarkWorkspaceInput
  ): Promise<{ rows: RecruiterBookmarkWorkspaceRow[]; total: number }> {
    let query = db
      .from('recruiter_bookmarks as rb')
      .join('users as u', 'u.id', 'rb.talent_user_id')
      .where('rb.recruiter_user_id', input.recruiterUserId)
      .select(
        'rb.id',
        'rb.notes',
        'rb.folder',
        'rb.rating',
        'rb.created_at',
        'u.id as talent_id',
        'u.username as talent_username',
        'u.status as talent_status',
        'u.trust_data as talent_trust_data'
      )
      .orderBy('rb.created_at', 'desc')

    if (input.search) {
      const search = `%${input.search}%`
      query = query.whereRaw('(u.username ilike ? or rb.notes ilike ? or rb.folder ilike ?)', [
        search,
        search,
        search,
      ])
    }
    if (input.folder) query = query.whereRaw('rb.folder ilike ?', [input.folder])

    const totalRow = (await query.clone().clearSelect().clearOrder().count('* as total').first()) as
      | { total?: string | number }
      | undefined
    const rows = (await query.offset(input.offset).limit(input.limit)) as RecruiterBookmarkWorkspaceRow[]
    return { rows, total: Number(totalRow?.total ?? 0) }
  }
}
