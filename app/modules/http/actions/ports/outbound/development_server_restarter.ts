export abstract class DevelopmentServerRestarter {
  abstract isRestartAllowed(): boolean
  abstract scheduleRestart(delayMilliseconds: number): { processId: number }
}
