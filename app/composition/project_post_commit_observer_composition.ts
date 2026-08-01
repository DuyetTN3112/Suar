import { LoggerProjectPostCommitFailureObserverAdapter } from './adapters/logger_project_post_commit_failure_observer_adapter.js'

export const projectPostCommitFailureObserver =
  new LoggerProjectPostCommitFailureObserverAdapter()
