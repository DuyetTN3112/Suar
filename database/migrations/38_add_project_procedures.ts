import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    // Thêm các stored procedures liên quan đến dự án
    await this.db.rawQuery(`
      CREATE PROCEDURE add_project_member(
        IN p_project_id INT, 
        IN p_user_id INT, 
        IN p_added_by INT
      )
      BEGIN
        DECLARE project_org_id INT;
        DECLARE user_in_org INT;
        DECLARE is_superadmin INT;

        -- Lấy organization_id của project
        SELECT organization_id INTO project_org_id
        FROM projects
        WHERE id = p_project_id;

        -- Kiểm tra xem người thêm có phải superadmin của tổ chức không
        SELECT COUNT(*) INTO is_superadmin
        FROM organization_users
        WHERE user_id = p_added_by
          AND organization_id = project_org_id
          AND role_id = 1
          AND status = 'approved';

        IF is_superadmin = 0 THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Chỉ superadmin của tổ chức mới có thể thêm thành viên vào project';
        END IF;

        -- Kiểm tra xem user_id có trong tổ chức không
        SELECT COUNT(*) INTO user_in_org
        FROM organization_users
        WHERE user_id = p_user_id
          AND organization_id = project_org_id
          AND status = 'approved';

        IF user_in_org = 0 THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Người dùng không thuộc tổ chức của project';
        ELSE
            -- Thêm thành viên vào project
            INSERT INTO project_members (project_id, user_id)
            VALUES (p_project_id, p_user_id)
            ON DUPLICATE KEY UPDATE project_id = project_id; -- Tránh trùng lặp
        END IF;
      END
    `)

    await this.db.rawQuery(`
      CREATE PROCEDURE create_project(
        IN p_creator_id INT, 
        IN p_organization_id INT, 
        IN p_name VARCHAR(255), 
        IN p_description TEXT, 
        IN p_status_id INT, 
        IN p_start_date DATE, 
        IN p_end_date DATE, 
        IN p_manager_id INT
      )
      BEGIN
        DECLARE is_superadmin INT;

        -- Kiểm tra xem người tạo có phải là superadmin trong tổ chức không
        SELECT COUNT(*) INTO is_superadmin
        FROM organization_users
        WHERE user_id = p_creator_id
          AND organization_id = p_organization_id
          AND role_id = 1  -- Superadmin trong tổ chức
          AND status = 'approved';

        IF is_superadmin = 0 THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Chỉ superadmin của tổ chức mới có thể tạo project';
        ELSE
            -- Tạo project, với creator_id và owner_id là superadmin
            INSERT INTO projects (
                organization_id, name, description, status_id,
                start_date, end_date, manager_id, owner_id, creator_id
            ) VALUES (
                p_organization_id, p_name, p_description, p_status_id,
                p_start_date, p_end_date, p_manager_id, p_creator_id, p_creator_id
            );
        END IF;
      END
    `)

    await this.db.rawQuery(`
      CREATE PROCEDURE delete_project(
        IN p_project_id INT, 
        IN p_deleted_by INT
      )
      BEGIN
        UPDATE projects
        SET deleted_at = CURRENT_TIMESTAMP
        WHERE id = p_project_id;

        UPDATE tasks
        SET status_id = 4, updated_by = p_deleted_by, updated_at = CURRENT_TIMESTAMP
        WHERE project_id = p_project_id AND deleted_at IS NULL;

        INSERT INTO audit_logs (
            user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent
        ) VALUES (
            p_deleted_by, 
            'delete', 
            'project', 
            p_project_id, 
            NULL, 
            NULL, 
            '127.0.0.1', 
            'Mozilla/5.0'
        );
      END
    `)
  }

  async down() {
    // Xóa stored procedures
    await this.db.rawQuery('DROP PROCEDURE IF EXISTS delete_project')
    await this.db.rawQuery('DROP PROCEDURE IF EXISTS create_project')
    await this.db.rawQuery('DROP PROCEDURE IF EXISTS add_project_member')
  }
}
