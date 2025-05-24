import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    // Cập nhật stored procedure send_message để cho phép người dùng thường gửi tin nhắn
    await this.db.rawQuery(`
      DROP PROCEDURE IF EXISTS send_message
    `)

    await this.db.rawQuery(`
      CREATE PROCEDURE send_message(
        IN p_conversation_id INT, 
        IN p_sender_id INT, 
        IN p_message TEXT
      )
      BEGIN
        DECLARE v_organization_id INT;
        DECLARE v_sender_role VARCHAR(50);
        
        -- Lấy organization_id từ cuộc trò chuyện
        SELECT organization_id INTO v_organization_id
        FROM conversations 
        WHERE id = p_conversation_id;
        
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
          WHERE ou.organization_id = v_organization_id 
          AND ou.user_id = p_sender_id 
          AND ou.status = 'approved'
        ) THEN
          SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Người gửi không thuộc tổ chức của hội thoại';
        END IF;

        -- Thêm tin nhắn
        INSERT INTO messages (conversation_id, sender_id, message)
        VALUES (p_conversation_id, p_sender_id, p_message);
      END
    `)
  }

  async down() {
    // Khôi phục stored procedure cũ
    await this.db.rawQuery(`
      DROP PROCEDURE IF EXISTS send_message
    `)

    // Tạo lại stored procedure cũ từ migration 50
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
  }
}
