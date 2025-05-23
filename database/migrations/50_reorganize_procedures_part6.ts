import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    // Thêm các stored procedures liên quan đến hội thoại và tin nhắn
    await this.db.rawQuery(`
      CREATE PROCEDURE create_conversation(
        IN p_creator_id INT, 
        IN p_organization_id INT, 
        IN p_participant_ids VARCHAR(255)
      )
      BEGIN
        DECLARE v_conversation_id INT;
        DECLARE v_participant_id INT;
        DECLARE v_done INT DEFAULT 0;
        DECLARE cur CURSOR FOR
          SELECT CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(t.part_ids, ',', n.n), ',', -1) AS UNSIGNED)
          FROM (SELECT p_participant_ids AS part_ids) t
          JOIN (SELECT 1 n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10) n
          WHERE n.n <= LENGTH(p_participant_ids) - LENGTH(REPLACE(p_participant_ids, ',', '')) + 1;
        DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = 1;

        -- Kiểm tra creator thuộc tổ chức
        IF NOT EXISTS (
          SELECT 1 FROM organization_users
          WHERE user_id = p_creator_id AND organization_id = p_organization_id AND status = 'approved'
        ) THEN
          SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Người tạo không thuộc tổ chức';
        END IF;

        -- Tạo hội thoại
        INSERT INTO conversations (organization_id) VALUES (p_organization_id);
        SET v_conversation_id = LAST_INSERT_ID();

        -- Thêm creator vào participants
        INSERT INTO conversation_participants (conversation_id, user_id)
        VALUES (v_conversation_id, p_creator_id);

        -- Thêm các participant khác
        IF p_participant_ids IS NOT NULL AND p_participant_ids != '' THEN
          OPEN cur;
          read_loop: LOOP
            FETCH cur INTO v_participant_id;
            IF v_done THEN LEAVE read_loop; END IF;
            IF NOT EXISTS (
              SELECT 1 FROM organization_users
              WHERE user_id = v_participant_id AND organization_id = p_organization_id AND status = 'approved'
            ) THEN
              SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Một hoặc nhiều người tham gia không thuộc tổ chức';
            END IF;
            -- Sử dụng INSERT IGNORE để tránh lỗi nếu người tham gia đã được thêm
            INSERT IGNORE INTO conversation_participants (conversation_id, user_id)
            VALUES (v_conversation_id, v_participant_id);
          END LOOP;
          CLOSE cur;
        END IF;
      END
    `)

    await this.db.rawQuery(`
      CREATE PROCEDURE send_message(
        IN p_conversation_id INT, 
        IN p_sender_id INT, 
        IN p_message TEXT
      )
      BEGIN
        -- Kiểm tra người gửi có trong hội thoại
        IF NOT EXISTS (
          SELECT 1 FROM conversation_participants
          WHERE conversation_id = p_conversation_id AND user_id = p_sender_id
        ) THEN
          SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Người gửi không thuộc hội thoại';
        END IF;

        -- Kiểm tra người gửi thuộc tổ chức của hội thoại
        IF NOT EXISTS (
          SELECT 1 FROM organization_users ou
          JOIN conversations c ON ou.organization_id = c.organization_id
          WHERE c.id = p_conversation_id AND ou.user_id = p_sender_id AND ou.status = 'approved'
        ) THEN
          SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Người gửi không thuộc tổ chức của hội thoại';
        END IF;

        -- Thêm tin nhắn
        INSERT INTO messages (conversation_id, sender_id, message)
        VALUES (p_conversation_id, p_sender_id, p_message);
      END
    `)

    await this.db.rawQuery(`
      CREATE PROCEDURE get_conversation_messages(
        IN p_conversation_id INT, 
        IN p_user_id INT
      )
      BEGIN
        SELECT 
            m.id,
            CASE 
                WHEN m.is_recalled = 1 AND m.recall_scope = 'all' THEN 'Tin nhắn này đã bị thu hồi.'
                ELSE m.message
            END AS message,
            m.sender_id,
            m.created_at,
            m.read_at,
            u.id AS user_id,
            u.full_name,
            u.email,
            ud.avatar_url AS sender_avatar
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        LEFT JOIN user_details ud ON u.id = ud.user_id
        LEFT JOIN deleted_messages dm 
            ON m.id = dm.message_id AND dm.user_id = p_user_id
        WHERE 
            m.conversation_id = p_conversation_id
            AND dm.message_id IS NULL
        ORDER BY m.created_at ASC;
      END
    `)
  }

  async down() {
    // Xóa stored procedures
    await this.db.rawQuery('DROP PROCEDURE IF EXISTS get_conversation_messages')
    await this.db.rawQuery('DROP PROCEDURE IF EXISTS send_message')
    await this.db.rawQuery('DROP PROCEDURE IF EXISTS create_conversation')
  }
}
