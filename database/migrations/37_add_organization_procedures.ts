import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    // Thêm các stored procedures liên quan đến tổ chức
    await this.db.rawQuery(`
      CREATE PROCEDURE add_user_to_organization_by_superadmin(
        IN p_superadmin_id INT, 
        IN p_user_id INT, 
        IN p_organization_id INT, 
        IN p_role_id INT
      )
      BEGIN
        DECLARE superadmin_role INT;

        -- Kiểm tra xem người thực hiện là superadmin trong tổ chức
        SELECT role_id INTO superadmin_role
        FROM organization_users
        WHERE user_id = p_superadmin_id AND organization_id = p_organization_id AND status = 'approved';

        IF superadmin_role != 1 THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Chỉ superadmin mới có thể thêm người dùng trực tiếp';
        ELSEIF EXISTS (
            SELECT 1 FROM organization_users
            WHERE user_id = p_user_id AND organization_id = p_organization_id
        ) THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Người dùng đã là thành viên hoặc có yêu cầu trong tổ chức';
        ELSE
            -- Thêm trực tiếp với trạng thái approved
            INSERT INTO organization_users (
                organization_id, user_id, role_id, status, invited_by
            ) VALUES (
                p_organization_id, p_user_id, p_role_id, 'approved', NULL
            );
        END IF;
      END
    `)

    await this.db.rawQuery(`
      CREATE PROCEDURE invite_user_to_organization(
        IN p_inviter_id INT, 
        IN p_invitee_id INT, 
        IN p_organization_id INT
      )
      BEGIN
        DECLARE inviter_role INT;

        -- Kiểm tra xem người mời có trong tổ chức không
        SELECT role_id INTO inviter_role
        FROM organization_users
        WHERE user_id = p_inviter_id AND organization_id = p_organization_id AND status = 'approved';

        IF inviter_role IS NULL THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Người mời không thuộc tổ chức hoặc chưa được duyệt';
        ELSEIF EXISTS (
            SELECT 1 FROM organization_users
            WHERE user_id = p_invitee_id AND organization_id = p_organization_id
        ) THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Người được mời đã có yêu cầu hoặc là thành viên của tổ chức';
        ELSE
            -- Thêm yêu cầu với trạng thái pending
            INSERT INTO organization_users (
                organization_id, user_id, role_id, status, invited_by
            ) VALUES (
                p_organization_id, p_invitee_id, 3, 'pending', p_inviter_id
            );
        END IF;
      END
    `)

    await this.db.rawQuery(`
      CREATE PROCEDURE manage_membership_request(
        IN p_superadmin_id INT, 
        IN p_user_id INT, 
        IN p_organization_id INT, 
        IN p_action ENUM('approve','reject')
      )
      BEGIN
        DECLARE superadmin_role INT;

        -- Kiểm tra xem người thực hiện là superadmin
        SELECT role_id INTO superadmin_role
        FROM organization_users
        WHERE user_id = p_superadmin_id AND organization_id = p_organization_id AND status = 'approved';

        IF superadmin_role != 1 THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Chỉ superadmin mới có thể duyệt yêu cầu';
        ELSEIF NOT EXISTS (
            SELECT 1 FROM organization_users
            WHERE user_id = p_user_id AND organization_id = p_organization_id AND status = 'pending'
        ) THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Không tìm thấy yêu cầu đang chờ duyệt';
        ELSE
            IF p_action = 'approve' THEN
                UPDATE organization_users
                SET status = 'approved'
                WHERE user_id = p_user_id AND organization_id = p_organization_id;
            ELSEIF p_action = 'reject' THEN
                UPDATE organization_users
                SET status = 'rejected'
                WHERE user_id = p_user_id AND organization_id = p_organization_id;
            END IF;
        END IF;
      END
    `)

    await this.db.rawQuery(`
      CREATE PROCEDURE remove_user_from_organization(
        IN p_current_user_id INT, 
        IN p_target_user_id INT, 
        IN p_organization_id INT
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

        -- Kiểm tra quyền xóa khỏi tổ chức
        IF current_role_id = 1 AND target_role_id IN (2, 3) THEN  -- Superadmin xóa admin hoặc user
            -- Xóa bản ghi trong organization_users
            DELETE FROM organization_users
            WHERE user_id = p_target_user_id AND organization_id = p_organization_id;
        ELSE
            -- Báo lỗi nếu không có quyền
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Không có quyền xóa người dùng khỏi tổ chức';
        END IF;
      END
    `)

    await this.db.rawQuery(`
      CREATE PROCEDURE request_to_join_organization(
        IN p_user_id INT, 
        IN p_organization_id INT
      )
      BEGIN
        -- Kiểm tra xem người dùng đã có trong tổ chức chưa
        IF EXISTS (
            SELECT 1 FROM organization_users
            WHERE user_id = p_user_id AND organization_id = p_organization_id
        ) THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Người dùng đã có yêu cầu hoặc là thành viên của tổ chức';
        ELSE
            -- Thêm yêu cầu với trạng thái pending
            INSERT INTO organization_users (
                organization_id, user_id, role_id, status, invited_by
            ) VALUES (
                p_organization_id, p_user_id, 3, 'pending', NULL
            );
        END IF;
      END
    `)

    await this.db.rawQuery(`
      CREATE PROCEDURE get_pending_requests(IN p_organization_id INT)
      BEGIN
        SELECT 
            ou.user_id,
            u.full_name,
            u.email,
            ou.invited_by,
            inviter.full_name AS inviter_name,
            ou.created_at
        FROM organization_users ou
        JOIN users u ON ou.user_id = u.id
        LEFT JOIN users inviter ON ou.invited_by = inviter.id
        WHERE ou.organization_id = p_organization_id AND ou.status = 'pending';
      END
    `)
  }

  async down() {
    // Xóa stored procedures
    await this.db.rawQuery('DROP PROCEDURE IF EXISTS get_pending_requests')
    await this.db.rawQuery('DROP PROCEDURE IF EXISTS request_to_join_organization')
    await this.db.rawQuery('DROP PROCEDURE IF EXISTS remove_user_from_organization')
    await this.db.rawQuery('DROP PROCEDURE IF EXISTS manage_membership_request')
    await this.db.rawQuery('DROP PROCEDURE IF EXISTS invite_user_to_organization')
    await this.db.rawQuery('DROP PROCEDURE IF EXISTS add_user_to_organization_by_superadmin')
  }
}
