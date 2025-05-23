import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    // Thêm các stored procedures liên quan đến tin nhắn
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
      CREATE PROCEDURE get_messages_paginated(
        IN p_conversation_id INT, 
        IN p_user_id INT, 
        IN p_last_visible_id BIGINT, 
        IN p_limit INT
      )
      BEGIN
        IF p_last_visible_id = 0 THEN
          SELECT m.id, m.conversation_id, m.message, m.created_at
          FROM messages m
          LEFT JOIN deleted_messages dm 
              ON m.id = dm.message_id AND dm.user_id = p_user_id
          WHERE m.conversation_id = p_conversation_id
            AND dm.message_id IS NULL
          ORDER BY m.id DESC
          LIMIT p_limit;
        ELSE
          SELECT m.id, m.conversation_id, m.message, m.created_at
          FROM messages m
          LEFT JOIN deleted_messages dm 
              ON m.id = dm.message_id AND dm.user_id = p_user_id
          WHERE m.conversation_id = p_conversation_id
            AND dm.message_id IS NULL
            AND m.id < p_last_visible_id
          ORDER BY m.id DESC
          LIMIT p_limit;
        END IF;
      END
    `)

    await this.db.rawQuery(`
      CREATE PROCEDURE get_new_messages(
        IN p_conversation_id INT, 
        IN p_user_id INT, 
        IN p_last_received_id BIGINT
      )
      BEGIN
        SELECT m.id, m.conversation_id, m.message, m.created_at
        FROM messages m
        LEFT JOIN deleted_messages dm 
            ON m.id = dm.message_id AND dm.user_id = p_user_id
        WHERE m.conversation_id = p_conversation_id
          AND m.id > p_last_received_id
          AND dm.message_id IS NULL
        ORDER BY m.id ASC;
      END
    `)

    await this.db.rawQuery(`
      CREATE PROCEDURE mark_as_read(
        IN p_message_id BIGINT, 
        IN p_user_id INT
      )
      BEGIN
        UPDATE messages
        SET read_at = CURRENT_TIMESTAMP
        WHERE id = p_message_id
          AND sender_id != p_user_id
          AND read_at IS NULL;
      END
    `)

    await this.db.rawQuery(`
      CREATE PROCEDURE recall_message(
        IN p_message_id INT, 
        IN p_user_id INT, 
        IN p_recall_scope ENUM('self','all')
      )
      BEGIN
        DECLARE v_sender_id INT;

        SELECT sender_id INTO v_sender_id 
        FROM messages 
        WHERE id = p_message_id;

        IF v_sender_id != p_user_id THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Chỉ người gửi mới được thu hồi tin nhắn';
        END IF;

        IF p_recall_scope = 'all' THEN
            UPDATE messages
            SET 
                is_recalled = 1,
                recall_scope = 'all',
                message = 'Tin nhắn này đã bị thu hồi.',
                recalled_at = CURRENT_TIMESTAMP
            WHERE id = p_message_id;
        ELSE
            INSERT INTO deleted_messages (message_id, user_id)
            VALUES (p_message_id, p_user_id)
            ON DUPLICATE KEY UPDATE deleted_at = CURRENT_TIMESTAMP;
        END IF;
      END
    `)
  }

  async down() {
    // Xóa stored procedures
    await this.db.rawQuery('DROP PROCEDURE IF EXISTS recall_message')
    await this.db.rawQuery('DROP PROCEDURE IF EXISTS mark_as_read')
    await this.db.rawQuery('DROP PROCEDURE IF EXISTS get_new_messages')
    await this.db.rawQuery('DROP PROCEDURE IF EXISTS get_messages_paginated')
    await this.db.rawQuery('DROP PROCEDURE IF EXISTS send_message')
  }
}
