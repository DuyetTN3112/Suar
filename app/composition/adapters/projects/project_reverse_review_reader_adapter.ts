import { reviewPublicApi } from '#composition/reviews/public-api/review_public_api_composition'
import { ProjectReverseReviewReader } from '#modules/projects/actions/ports/outbound/project_reverse_review_reader'

export class ProjectReverseReviewReaderAdapter extends ProjectReverseReviewReader {
  loadProjectStats(projectId: string) {
    return reviewPublicApi.loadReverseReviewTargetStats('project', projectId)
  }
}
