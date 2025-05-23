import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    // Thêm các stored procedures
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
      CREATE PROCEDURE get_conversation_messages(IN p_conversation_id INT)
      BEGIN
        SELECT 
            m.id,
            m.message,
            m.sender_id,
            m.timestamp,
            m.read_at,
            u.id AS user_id,
            u.full_name,
            u.email,
            u.avatar
        FROM 
            messages m
        JOIN 
            users u ON m.sender_id = u.id
        WHERE 
            m.conversation_id = p_conversation_id
        ORDER BY 
            m.timestamp ASC;
      END
    `)

    await this.db.rawQuery(`
      CREATE PROCEDURE get_organization_tasks(IN p_user_id INT, IN p_organization_id INT)
      BEGIN
        DECLARE user_role INT;
        
        -- Kiểm tra vai trò của user trong tổ chức
        SELECT role_id INTO user_role
        FROM organization_users
        WHERE user_id = p_user_id AND organization_id = p_organization_id;
        
        IF user_role = 2 THEN  -- Giả sử 2 là ID của vai trò 'admin'
            SELECT * FROM tasks
            WHERE organization_id = p_organization_id
            AND deleted_at IS NULL;
        ELSE
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Chỉ admin mới có thể xem tất cả task trong tổ chức';
        END IF;
      END
    `)

    await this.db.rawQuery(`
      CREATE PROCEDURE get_task_statistics()
      BEGIN
        SELECT 
            ts.name AS status,
            COUNT(t.id) AS task_count
        FROM 
            task_status ts
        LEFT JOIN 
            tasks t ON ts.id = t.status_id AND t.deleted_at IS NULL
        GROUP BY 
            ts.name
        ORDER BY 
            COUNT(t.id) DESC;
      END
    `)

    await this.db.rawQuery(`
      CREATE PROCEDURE get_user_tasks(IN p_user_id INT, IN p_status VARCHAR(50))
      BEGIN
        SELECT 
            t.id, t.title, t.description, 
            ts.name AS status,
            tl.name AS label,
            tp.name AS priority,
            CONCAT(u.first_name, ' ', u.last_name) AS creator_name,
            t.due_date, t.created_at
        FROM 
            tasks t
        LEFT JOIN 
            task_status ts ON t.status_id = ts.id
        LEFT JOIN 
            task_labels tl ON t.label_id = tl.id
        LEFT JOIN 
            task_priorities tp ON t.priority_id = tp.id
        LEFT JOIN 
            users u ON t.creator_id = u.id
        -- Check organization of user and task
        JOIN organization_users ou ON t.organization_id = ou.organization_id
        WHERE 
            ou.user_id = p_user_id 
            AND (t.assigned_to = p_user_id OR t.creator_id = p_user_id)
            AND (p_status IS NULL OR ts.name = p_status)
            AND t.deleted_at IS NULL
        ORDER BY 
            t.due_date ASC;
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
      CREATE PROCEDURE mark_messages_as_read(IN p_conversation_id INT, IN p_user_id INT)
      BEGIN
        UPDATE messages
        SET read_at = CURRENT_TIMESTAMP
        WHERE 
            conversation_id = p_conversation_id
            AND sender_id != p_user_id
            AND read_at IS NULL;
      END
    `)

    await this.db.rawQuery(`
      CREATE PROCEDURE search_users(IN p_search_term VARCHAR(100))
      BEGIN
        SELECT 
            u.id, u.full_name, u.username, u.email,
            ur.name AS role,
            us.name AS status
        FROM 
            users u
        JOIN 
            user_roles ur ON u.role_id = ur.id
        JOIN 
            user_status us ON u.status_id = us.id
        WHERE 
            u.deleted_at IS NULL
            AND (
                u.full_name LIKE CONCAT('%', p_search_term, '%')
                OR u.email LIKE CONCAT('%', p_search_term, '%')
                OR u.username LIKE CONCAT('%', p_search_term, '%')
            )
        ORDER BY 
            u.full_name ASC;
      END
    `)

    await this.db.rawQuery(`
      CREATE PROCEDURE soft_delete_task(IN p_task_id INT)
      BEGIN
        UPDATE tasks SET deleted_at = CURRENT_TIMESTAMP WHERE id = p_task_id;
      END
    `)

    await this.db.rawQuery(`
      CREATE PROCEDURE soft_delete_user(IN p_user_id INT)
      BEGIN
        UPDATE users SET deleted_at = CURRENT_TIMESTAMP WHERE id = p_user_id;
      END
    `)

    await this.db.rawQuery(`
      CREATE PROCEDURE change_user_role_with_permission(
        IN p_current_user_id INT, 
        IN p_target_user_id INT, 
        IN p_new_role_id INT
      )
      BEGIN
        DECLARE current_role_id INT;
        DECLARE target_role_id INT;

        -- Lấy role_id của người dùng hiện tại
        SELECT role_id INTO current_role_id
        FROM users
        WHERE id = p_current_user_id;

        -- Lấy role_id hiện tại của người dùng mục tiêu
        SELECT role_id INTO target_role_id
        FROM users
        WHERE id = p_target_user_id;

        -- Kiểm tra quyền thay đổi vai trò
        IF current_role_id = 1 THEN  -- Chỉ superadmin mới có thể thay đổi vai trò
            -- Cho phép thay đổi sang bất kỳ role hợp lệ
            UPDATE users
            SET 
                role_id = p_new_role_id,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = p_target_user_id;
        ELSE
            -- Báo lỗi nếu không phải superadmin
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Chỉ superadmin mới có thể thay đổi vai trò';
        END IF;
      END
    `)

    await this.db.rawQuery(`
      CREATE PROCEDURE delete_user_with_permission(
        IN p_current_user_id INT, 
        IN p_target_user_id INT
      )
      BEGIN
        DECLARE current_role_id INT;
        DECLARE target_role_id INT;

        -- Lấy role_id của người dùng hiện tại
        SELECT role_id INTO current_role_id
        FROM users
        WHERE id = p_current_user_id;

        -- Lấy role_id của người dùng mục tiêu
        SELECT role_id INTO target_role_id
        FROM users
        WHERE id = p_target_user_id;

        -- Kiểm tra quyền xóa
        IF (current_role_id = 2 AND target_role_id = 3) -- Admin xóa User
          OR (current_role_id = 1 AND target_role_id IN (2, 3)) -- Superadmin xóa Admin hoặc User
        THEN
            -- Thực hiện xóa mềm
            UPDATE users
            SET deleted_at = CURRENT_TIMESTAMP
            WHERE id = p_target_user_id;
        ELSE
            -- Báo lỗi nếu không có quyền
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Không có quyền xóa người dùng này';
        END IF;
      END
    `)

    await this.db.rawQuery(`
      CREATE PROCEDURE edit_user_with_permission(
        IN p_current_user_id INT, 
        IN p_target_user_id INT, 
        IN p_new_data JSON
      )
      BEGIN
        DECLARE current_role_id INT;
        DECLARE target_role_id INT;

        -- Lấy role_id của người dùng hiện tại
        SELECT role_id INTO current_role_id
        FROM users
        WHERE id = p_current_user_id;

        -- Lấy role_id của người dùng mục tiêu
        SELECT role_id INTO target_role_id
        FROM users
        WHERE id = p_target_user_id;

        -- Kiểm tra quyền chỉnh sửa
        IF p_current_user_id = p_target_user_id -- Người dùng chỉnh sửa chính mình
          OR (current_role_id = 2 AND target_role_id = 3) -- Admin chỉnh sửa User
          OR (current_role_id = 1 AND target_role_id IN (2, 3)) -- Superadmin chỉnh sửa Admin hoặc User
        THEN
            -- Thực hiện cập nhật (giả sử dữ liệu mới được truyền dưới dạng JSON)
            UPDATE users
            SET
                first_name = JSON_UNQUOTE(JSON_EXTRACT(p_new_data, '$.first_name')),
                last_name = JSON_UNQUOTE(JSON_EXTRACT(p_new_data, '$.last_name')),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = p_target_user_id;
        ELSE
            -- Báo lỗi nếu không có quyền
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Không có quyền chỉnh sửa người dùng này';
        END IF;
      END
    `)

    await this.db.rawQuery(`
      CREATE PROCEDURE update_task_with_permission(
        IN p_user_id INT, 
        IN p_task_id INT, 
        IN p_new_data JSON
      )
      BEGIN
        DECLARE v_creator_id INT;
        DECLARE v_is_admin BOOLEAN;

        -- Lấy creator_id của task
        SELECT creator_id INTO v_creator_id FROM tasks WHERE id = p_task_id;

        -- Kiểm tra quyền: Người tạo task hoặc admin
        SELECT is_admin_user(p_user_id) INTO v_is_admin;

        IF (v_creator_id = p_user_id OR v_is_admin) THEN
            UPDATE tasks
            SET 
                title = JSON_UNQUOTE(JSON_EXTRACT(p_new_data, '$.title')),
                description = JSON_UNQUOTE(JSON_EXTRACT(p_new_data, '$.description')),
                status_id = JSON_EXTRACT(p_new_data, '$.status_id'),
                label_id = JSON_EXTRACT(p_new_data, '$.label_id'),
                priority_id = JSON_EXTRACT(p_new_data, '$.priority_id'),
                assigned_to = JSON_EXTRACT(p_new_data, '$.assigned_to'),
                due_date = JSON_EXTRACT(p_new_data, '$.due_date'),
                updated_by = p_user_id,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = p_task_id;
        ELSE
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Không có quyền cập nhật task này';
        END IF;
      END
    `)

    // Thêm functions
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

    // Tạo views
    await this.db.rawQuery(`
      CREATE VIEW active_tasks_with_users AS
      SELECT 
          t.id, t.title, t.description, 
          ts.name AS status, 
          tl.name AS label, 
          tp.name AS priority,
          CONCAT(u1.first_name, ' ', u1.last_name) AS assigned_to_name,
          CONCAT(u2.first_name, ' ', u2.last_name) AS creator_name,
          t.due_date, t.estimated_time, t.actual_time, 
          t.created_at, t.updated_at
      FROM 
          tasks t
      LEFT JOIN 
          task_status ts ON t.status_id = ts.id
      LEFT JOIN 
          task_labels tl ON t.label_id = tl.id
      LEFT JOIN 
          task_priorities tp ON t.priority_id = tp.id
      LEFT JOIN 
          users u1 ON t.assigned_to = u1.id
      LEFT JOIN 
          users u2 ON t.creator_id = u2.id
      WHERE 
          t.deleted_at IS NULL
    `)

    await this.db.rawQuery(`
      CREATE VIEW active_users_with_details AS
      SELECT 
          u.id, CONCAT(u.first_name, ' ', u.last_name) AS full_name, u.username, u.email,
          ud.phone_number, ur.name AS role, us.name AS status,
          up.date_of_birth, up.language, 
          uset.theme, uset.display_mode
      FROM 
          users u
      LEFT JOIN 
          user_roles ur ON u.role_id = ur.id
      LEFT JOIN 
          user_status us ON u.status_id = us.id
      LEFT JOIN 
          user_profile up ON u.id = up.user_id
      LEFT JOIN 
          user_details ud ON u.id = ud.user_id
      LEFT JOIN 
          user_settings uset ON u.id = uset.user_id
      WHERE 
          u.deleted_at IS NULL
    `)

    await this.db.rawQuery(`
      CREATE VIEW app_category_stats AS
      SELECT 
          ac.name AS category,
          COUNT(a.id) AS app_count,
          COUNT(ua.id) AS user_connection_count
      FROM 
          app_categories ac
      LEFT JOIN 
          apps a ON ac.id = a.category_id AND a.deleted_at IS NULL
      LEFT JOIN 
          user_apps ua ON a.id = ua.app_id AND ua.is_connected = true
      GROUP BY 
          ac.id
    `)

    // Thêm triggers cho users bảng
    await this.db.rawQuery(`
      CREATE TRIGGER before_user_update
      BEFORE UPDATE ON users
      FOR EACH ROW
      BEGIN
          SET NEW.updated_at = CURRENT_TIMESTAMP;
      END
    `)

    await this.db.rawQuery(`
      CREATE TRIGGER before_user_insert
      BEFORE INSERT ON users
      FOR EACH ROW
      BEGIN
          IF NEW.current_organization_id IS NOT NULL THEN
              SIGNAL SQLSTATE '45000'
              SET MESSAGE_TEXT = 'Không thể đặt current_organization_id khi thêm mới người dùng. Hãy thêm người dùng vào tổ chức sau.';
          END IF;
      END
    `)

    await this.db.rawQuery(`
      CREATE TRIGGER before_update_user_current_org
      BEFORE UPDATE ON users
      FOR EACH ROW
      BEGIN
          IF NEW.current_organization_id IS NOT NULL THEN
              IF NOT EXISTS (
                  SELECT 1 FROM organization_users 
                  WHERE user_id = NEW.id 
                      AND organization_id = NEW.current_organization_id
              ) THEN
                  SIGNAL SQLSTATE '45000'
                  SET MESSAGE_TEXT = 'Người dùng không thuộc tổ chức này';
              END IF;
          END IF;
      END
    `)
  }

  async down() {
    // Xóa views
    await this.db.rawQuery('DROP VIEW IF EXISTS app_category_stats')
    await this.db.rawQuery('DROP VIEW IF EXISTS active_users_with_details')
    await this.db.rawQuery('DROP VIEW IF EXISTS active_tasks_with_users')

    // Xóa functions
    await this.db.rawQuery('DROP FUNCTION IF EXISTS is_admin_user')

    // Xóa stored procedures
    await this.db.rawQuery('DROP PROCEDURE IF EXISTS update_task_with_permission')
    await this.db.rawQuery('DROP PROCEDURE IF EXISTS edit_user_with_permission')
    await this.db.rawQuery('DROP PROCEDURE IF EXISTS delete_user_with_permission')
    await this.db.rawQuery('DROP PROCEDURE IF EXISTS change_user_role_with_permission')
    await this.db.rawQuery('DROP PROCEDURE IF EXISTS soft_delete_user')
    await this.db.rawQuery('DROP PROCEDURE IF EXISTS soft_delete_task')
    await this.db.rawQuery('DROP PROCEDURE IF EXISTS search_users')
    await this.db.rawQuery('DROP PROCEDURE IF EXISTS mark_messages_as_read')
    await this.db.rawQuery('DROP PROCEDURE IF EXISTS log_audit')
    await this.db.rawQuery('DROP PROCEDURE IF EXISTS get_user_tasks')
    await this.db.rawQuery('DROP PROCEDURE IF EXISTS get_task_statistics')
    await this.db.rawQuery('DROP PROCEDURE IF EXISTS get_organization_tasks')
    await this.db.rawQuery('DROP PROCEDURE IF EXISTS get_conversation_messages')
    await this.db.rawQuery('DROP PROCEDURE IF EXISTS create_notification')

    // Xóa triggers
    await this.db.rawQuery('DROP TRIGGER IF EXISTS before_user_update')
    await this.db.rawQuery('DROP TRIGGER IF EXISTS before_user_insert')
    await this.db.rawQuery('DROP TRIGGER IF EXISTS before_update_user_current_org')
  }
}
