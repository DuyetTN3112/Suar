import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    // Thêm các functions và stored procedures khác
    await this.db.rawQuery(`
      CREATE FUNCTION is_admin_user(p_user_id INT) RETURNS TINYINT(1) DETERMINISTIC
      BEGIN
        DECLARE v_is_admin BOOLEAN;
        
        SELECT 
            CASE WHEN ur.name IN ('superadmin', 'admin') THEN TRUE ELSE FALSE END INTO v_is_admin
        FROM 
            users u
        JOIN 
            user_roles ur ON u.role_id = ur.id
        WHERE 
            u.id = p_user_id
            AND u.deleted_at IS NULL;
        
        RETURN v_is_admin;
      END
    `)

    await this.db.rawQuery(`
      CREATE PROCEDURE create_notification(
        IN p_user_id INT, 
        IN p_title VARCHAR(255), 
        IN p_message TEXT, 
        IN p_type VARCHAR(50), 
        IN p_related_entity_type VARCHAR(50), 
        IN p_related_entity_id INT
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

    await this.db.rawQuery(`
      CREATE PROCEDURE log_audit(
        IN p_user_id INT, 
        IN p_action VARCHAR(50), 
        IN p_entity_type VARCHAR(50), 
        IN p_entity_id INT, 
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

    await this.db.rawQuery(`
      CREATE PROCEDURE add_organization_id_if_not_exists()
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_NAME = 'conversations'
          AND COLUMN_NAME = 'organization_id'
        ) THEN
          ALTER TABLE conversations ADD COLUMN organization_id INT NULL;
        END IF;
      END
    `)
  }

  async down() {
    // Xóa stored procedures và functions
    await this.db.rawQuery('DROP PROCEDURE IF EXISTS add_organization_id_if_not_exists')
    await this.db.rawQuery('DROP PROCEDURE IF EXISTS log_audit')
    await this.db.rawQuery('DROP PROCEDURE IF EXISTS create_notification')
    await this.db.rawQuery('DROP FUNCTION IF EXISTS is_admin_user')
  }
}
