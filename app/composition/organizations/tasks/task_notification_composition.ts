import { notificationTransactionStager } from '#composition/notifications/notification-feed/notification_composition'

import {
  makeApplyForTaskCommand as makeApply,
  makeAssignTaskCommand as makeAssign,
  makeCreateTaskCommand as makeCreate,
  makeDeleteTaskCommand as makeDelete,
  makeProcessApplicationCommand as makeProcess,
  makeUpdateTaskCommand as makeUpdate,
  makeUpdateTaskStatusCommand as makeUpdateStatus,
} from '#composition/tasks/task-factories/task_action_factory'
import type { TaskNotificationStager } from '#modules/tasks/actions/ports/outbound/task_notification_stager'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'

export const makeApplyForTaskCommand = (context: TaskActionContext) =>
  makeApply(context, notificationTransactionStager)
export const makeProcessApplicationCommand = (context: TaskActionContext) =>
  makeProcess(context, notificationTransactionStager)
export const makeCreateTaskCommand = (context: TaskActionContext) =>
  makeCreate(context, notificationTransactionStager)
export const makeUpdateTaskCommand = (context: TaskActionContext) =>
  makeUpdate(context, notificationTransactionStager)
export const makeAssignTaskCommand = (context: TaskActionContext) =>
  makeAssign(context, notificationTransactionStager)
export const makeDeleteTaskCommand = (
  context: TaskActionContext,
  notificationStager: TaskNotificationStager = notificationTransactionStager
) => makeDelete(context, notificationStager)
export const makeUpdateTaskStatusCommand = (context: TaskActionContext) =>
  makeUpdateStatus(context, notificationTransactionStager)
