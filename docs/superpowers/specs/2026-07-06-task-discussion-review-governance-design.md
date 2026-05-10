# Task Discussion And Review Governance Design

## Goal

Ship a unified task discussion, mention notification, review-queue, dispute escalation, and reverse-review flow across backend and frontend.

## Approved Direction

- Keep task discussion inside `tasks`.
- Keep review/dispute/reverse review inside `reviews`.
- Reuse `notifications`.
- Implement full-stack in one pass, but in reusable layers so later polishing does not require schema rewrites.

## Key Assumptions

- Review quorum rule:
  - task creator review is mandatory
  - minimum two distinct reviewers
  - at least one manager-side reviewer
  - at least one peer-side reviewer
  - if creator is also manager-side, creator + one peer is sufficient
- Task comments are visible to any actor who can access the task.
- Mentions use `@username` parsing in the first shipped version.

## Scope

### 1. Task Discussion

- Extend task comments with:
  - thread replies
  - mention records
  - `review_relevance`
  - `edited_at`
- Mention notifications are sent when a referenced user is resolved.
- Discussion payloads expose mention metadata to frontend.

### 2. Review Queue

- When a finished assignment enters review, the review session exposes governance fields:
  - creator review required/completed
  - manager-side review count
  - peer-side review count
  - distinct reviewer count
  - minimum reviewer count
  - quorum satisfied flag
- Review pages and task pages show queue/gate status.

### 3. Confirmation, Dispute, Escalation

- Reviewee can confirm only when quorum is satisfied.
- Reviewee can dispute once quorum is satisfied.
- Dispute case files include task comments, with review-relevant discussion preserved.
- Dispute thread can be escalated to admin with explicit report metadata.

### 4. Reverse Review And Organization Review

- Reverse reviews support targets:
  - manager
  - peer
  - organization
- Organization reverse reviews are surfaced in org pages and org review list summaries.

## Data Model Changes

- Add `task_comment_mentions`
- Add fields to `task_comments`:
  - `review_relevance`
  - `edited_at`
- Add governance fields to `review_sessions`:
  - `creator_reviewer_id`
  - `creator_review_completed`
  - `manager_reviews_count`
  - `peer_reviews_count`
  - `required_total_reviews`
  - `minimum_manager_reviews`
  - `minimum_peer_reviews`
- Add escalation fields to `review_disputes`:
  - `reported_to_admin_at`
  - `reported_to_admin_by`
  - `escalation_reason`

## Backend Changes

- Tasks:
  - create/list/update comments with mentions
  - notify mentioned users
  - expose discussion metadata
- Reviews:
  - create sessions with governance defaults
  - update session counters from submitted reviews
  - block confirm/dispute until quorum
  - report dispute to admin
  - include task comments in case files
  - allow organization reverse review targets
- Notifications:
  - task mention
  - reverse review received
  - organization review received
  - dispute escalated

## Frontend Changes

- Task detail discussion tab:
  - richer comment cards
  - mention guidance
  - review relevance toggle
- Review detail:
  - governance progress
  - clearer confirm/dispute state
- Dispute detail:
  - report-to-admin CTA
- Organization pages:
  - org dispute surface already present, extend summary
  - organization reverse review surface

## Testing

- Contract/integration for comment mention notification
- Integration for review quorum enforcement
- Integration for dispute escalation
- Integration for organization reverse review target
- Component coverage for discussion/review governance state rendering
