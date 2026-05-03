# Task Create Context Design

## Goal

Make the task-create popup understandable by removing project-owned context from task-level input and clarifying the remaining taxonomy and assignment controls.

## Decisions

- The current project is implicit from the board/project route and is not rendered as an editable or informational field in the popup.
- Business domain is project configuration. It is removed from the popup UI, while the create payload continues to preserve the existing field contract where the current flow already supplies it.
- `Task type` is labeled `Dạng công việc`.
- `Problem category` is labeled `Bài toán cần giải quyết`.
- `Role in task` is labeled `Vai trò cần cho task`, with helper text explaining that it prioritizes matching project members and is not the assignee/creator.
- Assignee selection remains able to choose project members and organization members outside the project. Existing group ordering is preserved as the safe baseline.
- `Task visibility` is labeled `Phạm vi hiển thị` and rendered as a mutually-exclusive radio group with three options: organization only, marketplace only, and organization + marketplace.
- Existing field names, payload shape, taxonomy values, and backend behavior remain unchanged unless required by the UI control.

## Scope

Apply the same UI behavior and copy to the organization and user task-create forms. Update focused component tests to assert the new user-facing contract and absence of project/domain controls.

## Non-goals

- Do not redesign project operating-model configuration.
- Do not change marketplace filtering or talent matching semantics.
- Do not remove taxonomy fields from the create payload or persistence layer.
