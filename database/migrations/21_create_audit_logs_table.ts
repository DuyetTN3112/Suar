import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'audit_logs'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id').primary()
      table
        .integer('user_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
        .onUpdate('CASCADE')
      table.string('action', 50).notNullable()
      table.string('entity_type', 50).notNullable()
      table.string('entity_id', 36).nullable()
      table.json('old_values').nullable()
      table.json('new_values').nullable()
      table.string('ip_address', 45).nullable()
      table.text('user_agent').nullable()

      table.timestamp('created_at').defaultTo(this.now())
    })

    // Add indexes for optimized queries
    this.db.rawQuery('CREATE INDEX idx_audit_logs_user ON audit_logs(user_id)')
    this.db.rawQuery('CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id)')

    // Create procedure for logging audit
    this.db.rawQuery(`
      CREATE PROCEDURE log_audit(
        IN p_user_id INT UNSIGNED,
        IN p_action VARCHAR(50),
        IN p_entity_type VARCHAR(50),
        IN p_entity_id VARCHAR(36),
        IN p_old_values JSON,
        IN p_new_values JSON,
        IN p_ip_address VARCHAR(45),
        IN p_user_agent TEXT
      )
      BEGIN
        INSERT INTO audit_logs (
          user_id, action, entity_type, entity_id,
          old_values, new_values, ip_address, user_agent
        ) VALUES (
          p_user_id, p_action, p_entity_type, p_entity_id,
          p_old_values, p_new_values, p_ip_address, p_user_agent
        );
      END
    `)
  }

  public async down() {
    this.db.rawQuery('DROP PROCEDURE IF EXISTS log_audit')
    this.schema.dropTable(this.tableName)
  }
}
