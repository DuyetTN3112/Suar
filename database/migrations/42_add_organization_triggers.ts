import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    // Thêm triggers liên quan đến tổ chức
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
  }
}
