import loggerService from '#modules/logger/public_contracts/application_logger'
import {
  ProjectPostCommitFailureObserver,
  type ProjectPostCommitFailure,
} from '#modules/projects/actions/ports/outbound/project_post_commit_failure_observer'

export class LoggerProjectPostCommitFailureObserverAdapter extends ProjectPostCommitFailureObserver {
  reportFailure(failure: ProjectPostCommitFailure): void {
    loggerService.error('Project post-commit effect failed', {
      ...failure,
      committed: true,
    })
  }
}
