import type { FilterTransaction } from '#modules/filtering/actions/ports/outbound/filter_transaction_runner'

export interface FilterAlertPausePort {
  pauseForSavedView(input: { readonly savedViewId: string; readonly reason: string; readonly now: string; readonly transaction?: FilterTransaction }): Promise<void>
}
