import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    // Thêm các triggers liên quan đến tin nhắn và hội thoại
    await this.db.rawQuery(`
      CREATE TRIGGER after_message_delete
      AFTER DELETE ON messages
      FOR EACH ROW
      BEGIN
        UPDATE conversations 
        SET last_message_id = (
            SELECT id 
            FROM messages 
            WHERE conversation_id = OLD.conversation_id 
            ORDER BY created_at DESC 
            LIMIT 1
        )
        WHERE id = OLD.conversation_id;
      END
    `)

    await this.db.rawQuery(`
      CREATE TRIGGER before_message_update
      BEFORE UPDATE ON messages
      FOR EACH ROW
      BEGIN
        SET NEW.updated_at = CURRENT_TIMESTAMP;
      END
    `)

    await this.db.rawQuery(`
      CREATE TRIGGER update_last_message_at
      AFTER INSERT ON messages
      FOR EACH ROW
      BEGIN
        UPDATE conversations
        SET last_message_at = NEW.created_at
        WHERE id = NEW.conversation_id;
      END
    `)

    // Thêm các triggers liên quan đến tổ chức
    await this.db.rawQuery(`
      CREATE TRIGGER after_organization_insert
      AFTER INSERT ON organizations
      FOR EACH ROW
      BEGIN
        -- Thêm owner vào organization_users với role mặc định (ví dụ: role_id = 1 là admin)
        INSERT INTO organization_users (organization_id, user_id, role_id)
        VALUES (NEW.id, NEW.owner_id, 1); 
      END
    `)

    await this.db.rawQuery(`
      CREATE TRIGGER before_organization_insert
      BEFORE INSERT ON organizations
      FOR EACH ROW
      BEGIN
        IF NEW.slug IS NULL OR NEW.slug = '' THEN
          SET NEW.slug = LOWER(REGEXP_REPLACE(NEW.name, '[^a-z0-9]+', '-'));
          SET NEW.slug = REGEXP_REPLACE(NEW.slug, '^-|-$', '');
        END IF;
      END
    `)

    await this.db.rawQuery(`
      CREATE TRIGGER after_organization_user_update
      AFTER UPDATE ON organization_users
      FOR EACH ROW
      BEGIN
        IF OLD.status = 'approved' AND NEW.status != 'approved' THEN
          DELETE FROM conversation_participants
          WHERE user_id = NEW.user_id
          AND conversation_id IN (
            SELECT id FROM conversations WHERE organization_id = NEW.organization_id
          );
        END IF;
      END
    `)
  }

  async down() {
    // Xóa triggers
    await this.db.rawQuery('DROP TRIGGER IF EXISTS after_organization_user_update')
    await this.db.rawQuery('DROP TRIGGER IF EXISTS before_organization_insert')
    await this.db.rawQuery('DROP TRIGGER IF EXISTS after_organization_insert')
    await this.db.rawQuery('DROP TRIGGER IF EXISTS update_last_message_at')
    await this.db.rawQuery('DROP TRIGGER IF EXISTS before_message_update')
    await this.db.rawQuery('DROP TRIGGER IF EXISTS after_message_delete')
  }
}
