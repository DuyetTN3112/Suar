import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * File này đã được chia nhỏ thành các file riêng biệt:
 * - 37_add_organization_procedures.ts: Các stored procedures liên quan đến tổ chức
 * - 38_add_project_procedures.ts: Các stored procedures liên quan đến dự án
 * - 39_add_conversation_procedures.ts: Các stored procedures liên quan đến hội thoại
 * - 40_add_message_procedures.ts: Các stored procedures liên quan đến tin nhắn
 * - 41_add_message_conversation_triggers.ts: Các triggers liên quan đến tin nhắn và hội thoại
 * - 42_add_organization_triggers.ts: Các triggers liên quan đến tổ chức
 * - 43_add_task_triggers.ts: Các triggers liên quan đến nhiệm vụ
 * - 44_add_database_views.ts: Các views
 */
export default class extends BaseSchema {
  async up() {
    // File này đã được chia nhỏ thành các file riêng biệt
    // Removed debug log: console.log('File này đã được chia nhỏ thành các file riêng biệt')
  }

  async down() {
    // File này đã được chia nhỏ thành các file riêng biệt
    // Removed debug log: console.log('File này đã được chia nhỏ thành các file riêng biệt')
  }
}
