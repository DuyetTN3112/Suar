import { LoggerProjectPostCommitFailureObserverAdapter } from '#composition/adapters/platform/logger_project_post_commit_failure_observer_adapter'

export const projectPostCommitFailureObserver =
  new LoggerProjectPostCommitFailureObserverAdapter()
