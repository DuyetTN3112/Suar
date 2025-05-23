import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    // Thêm triggers liên quan đến tin nhắn và hội thoại
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
  }

  async down() {
    // Xóa triggers
    await this.db.rawQuery('DROP TRIGGER IF EXISTS update_last_message_at')
    await this.db.rawQuery('DROP TRIGGER IF EXISTS before_message_update')
    await this.db.rawQuery('DROP TRIGGER IF EXISTS after_message_delete')
  }
}
