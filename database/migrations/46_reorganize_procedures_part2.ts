import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    // Thêm các stored procedures liên quan đến task
    await this.db.rawQuery(`
      CREATE PROCEDURE update_task_with_permission(
        IN p_user_id INT, 
        IN p_task_id INT, 
        IN p_new_data JSON
      )
      BEGIN
        DECLARE v_creator_id INT;
        DECLARE v_is_admin BOOLEAN;

        -- Lấy thông tin người tạo task
        SELECT creator_id INTO v_creator_id FROM tasks WHERE id = p_task_id;
        
        -- Kiểm tra quyền admin
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
                updated_by = p_user_id, -- QUAN TRỌNG: Gán người cập nhật
                updated_at = CURRENT_TIMESTAMP
            WHERE id = p_task_id;
        ELSE
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Không có quyền cập nhật task này';
        END IF;
      END
    `)

    await this.db.rawQuery(`
      CREATE PROCEDURE soft_delete_task(IN p_task_id INT)
      BEGIN
        UPDATE tasks SET deleted_at = CURRENT_TIMESTAMP WHERE id = p_task_id;
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
  }

  async down() {
    // Xóa stored procedures
    await this.db.rawQuery('DROP PROCEDURE IF EXISTS get_organization_tasks')
    await this.db.rawQuery('DROP PROCEDURE IF EXISTS get_user_tasks')
    await this.db.rawQuery('DROP PROCEDURE IF EXISTS get_task_statistics')
    await this.db.rawQuery('DROP PROCEDURE IF EXISTS soft_delete_task')
    await this.db.rawQuery('DROP PROCEDURE IF EXISTS update_task_with_permission')
  }
}
