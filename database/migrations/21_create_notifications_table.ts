import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'notifications'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id').primary()
      table
        .uuid('user_id')
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
        .onUpdate('CASCADE')
      table.string('title', 255).notNullable()
      table.text('message').notNullable()
      table.boolean('is_read').defaultTo(false)
      table.string('type', 50).notNullable()
      table.string('related_entity_type', 50).nullable()
      table.string('related_entity_id', 36).nullable()
      table.timestamp('created_at').defaultTo(this.now())
    })
    // Add indexes for optimized queries
    this.db.rawQuery('CREATE INDEX idx_notifications_user ON notifications(user_id)')
    this.db.rawQuery('CREATE INDEX idx_notifications_read ON notifications(user_id, is_read)')
    // Create procedure for creating notifications
    this.db.rawQuery(`
      CREATE PROCEDURE create_notification(
        IN p_user_id CHAR(36),
        IN p_title VARCHAR(255),
        IN p_message TEXT,
        IN p_type VARCHAR(50),
        IN p_related_entity_type VARCHAR(50),
        IN p_related_entity_id VARCHAR(36)
      )
      BEGIN
        INSERT INTO notifications (
          user_id, title, message, type,
          related_entity_type, related_entity_id
        ) VALUES (
          p_user_id, p_title, p_message, p_type,
          p_related_entity_type, p_related_entity_id
        );
      END
    `)
  }

  public async down() {
    this.db.rawQuery('DROP PROCEDURE IF EXISTS create_notification')
    this.schema.dropTable(this.tableName)
  }
}
