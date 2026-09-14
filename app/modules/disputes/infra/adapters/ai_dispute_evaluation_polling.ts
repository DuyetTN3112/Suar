// Infrastructure polling runtime used only by the outer diagnostic command.
export interface AiDisputeEvaluationStatusRow {
  status: string
  recommendation?: unknown
  confidence_score?: unknown
  summary?: unknown
  response_payload?: unknown
  error_message?: unknown
}

export type AiDisputeEvaluationPollResult =
  | { kind: 'completed'; row: AiDisputeEvaluationStatusRow; elapsedSeconds: number }
  | { kind: 'failed'; row: AiDisputeEvaluationStatusRow; elapsedSeconds: number }
  | { kind: 'missing'; elapsedSeconds: number }
  | { kind: 'timed_out'; elapsedSeconds: number }
  | { kind: 'aborted'; elapsedSeconds: number }

export interface AiDisputeEvaluationPollInput {
  load(): Promise<AiDisputeEvaluationStatusRow | null>
  wait(milliseconds: number, signal: AbortSignal): Promise<void>
  signal: AbortSignal
  intervalMilliseconds?: number
  timeoutMilliseconds?: number
  onObservation?(row: AiDisputeEvaluationStatusRow, elapsedSeconds: number): void
}

function signalIsAborted(signal: AbortSignal): boolean {
  return signal.aborted
}

export async function pollAiDisputeEvaluation(
  input: AiDisputeEvaluationPollInput
): Promise<AiDisputeEvaluationPollResult> {
  const intervalMilliseconds = input.intervalMilliseconds ?? 3_000
  const timeoutMilliseconds = input.timeoutMilliseconds ?? 180_000
  if (
    !Number.isSafeInteger(intervalMilliseconds) ||
    intervalMilliseconds < 1 ||
    !Number.isSafeInteger(timeoutMilliseconds) ||
    timeoutMilliseconds < intervalMilliseconds
  ) {
    throw new RangeError('AI dispute polling interval and timeout are invalid')
  }

  let elapsedMilliseconds = 0
  while (elapsedMilliseconds < timeoutMilliseconds) {
    if (signalIsAborted(input.signal)) {
      return { kind: 'aborted', elapsedSeconds: elapsedMilliseconds / 1_000 }
    }

    const waitMilliseconds = Math.min(
      intervalMilliseconds,
      timeoutMilliseconds - elapsedMilliseconds
    )
    await input.wait(waitMilliseconds, input.signal)
    if (signalIsAborted(input.signal)) {
      return { kind: 'aborted', elapsedSeconds: elapsedMilliseconds / 1_000 }
    }
    elapsedMilliseconds += waitMilliseconds

    const row = await input.load()
    const elapsedSeconds = elapsedMilliseconds / 1_000
    if (!row) {
      return { kind: 'missing', elapsedSeconds }
    }
    input.onObservation?.(row, elapsedSeconds)
    if (row.status === 'completed') {
      return { kind: 'completed', row, elapsedSeconds }
    }
    if (row.status === 'failed') {
      return { kind: 'failed', row, elapsedSeconds }
    }
  }

  return { kind: 'timed_out', elapsedSeconds: elapsedMilliseconds / 1_000 }
}

export function waitForAiDisputePoll(milliseconds: number, signal: AbortSignal): Promise<void> {
  if (signalIsAborted(signal)) {
    return Promise.resolve()
  }
  return new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timer)
      signal.removeEventListener('abort', finish)
      resolve()
    }
    const timer = setTimeout(finish, milliseconds)
    signal.addEventListener('abort', finish, { once: true })
  })
}
