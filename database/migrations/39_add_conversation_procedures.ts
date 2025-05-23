import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    // Thêm các stored procedures liên quan đến hội thoại
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
  }

  async down() {
    // Xóa stored procedures
    await this.db.rawQuery('DROP PROCEDURE IF EXISTS create_conversation')
    await this.db.rawQuery('DROP PROCEDURE IF EXISTS add_organization_id_if_not_exists')
  }
}
