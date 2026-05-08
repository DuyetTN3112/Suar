export async function writeDomainEventOutboxRetentionFailureAuditPreservingPrimary(
  primaryError: unknown,
  writeFailureAudit: () => Promise<void>,
  onAuditFailure: (auditError: unknown) => void
): Promise<never> {
  try {
    await writeFailureAudit()
  } catch (auditError) {
    onAuditFailure(auditError)
  }
  throw primaryError
}
