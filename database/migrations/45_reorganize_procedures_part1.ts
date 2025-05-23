import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    // Thêm các stored procedures liên quan đến người dùng
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
            IF target_role_id = 1 THEN
                -- Không cho phép thay đổi vai trò của superadmin khác
                SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Không thể thay đổi vai trò của superadmin khác';
            ELSEIF (target_role_id = 3 AND p_new_role_id = 2)  -- user → admin
                OR (target_role_id = 2 AND p_new_role_id = 1)  -- admin → superadmin
                OR (target_role_id = 2 AND p_new_role_id = 3)  -- admin → user
            THEN
                -- Cho phép thay đổi vai trò với các trường hợp hợp lệ
                UPDATE users
                SET 
                    role_id = p_new_role_id,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = p_target_user_id;
            ELSE
                -- Báo lỗi nếu thay đổi vai trò không hợp lệ
                SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Thay đổi vai trò không hợp lệ';
            END IF;
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
      CREATE PROCEDURE soft_delete_user(IN p_user_id INT)
      BEGIN
        UPDATE users SET deleted_at = CURRENT_TIMESTAMP WHERE id = p_user_id;
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
  }

  async down() {
    // Xóa stored procedures
    await this.db.rawQuery('DROP PROCEDURE IF EXISTS search_users')
    await this.db.rawQuery('DROP PROCEDURE IF EXISTS soft_delete_user')
    await this.db.rawQuery('DROP PROCEDURE IF EXISTS edit_user_with_permission')
    await this.db.rawQuery('DROP PROCEDURE IF EXISTS delete_user_with_permission')
    await this.db.rawQuery('DROP PROCEDURE IF EXISTS change_user_role_with_permission')
  }
}
