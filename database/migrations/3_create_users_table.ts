import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.string('first_name', 100).notNullable()
      table.string('last_name', 100).notNullable()
      table.string('username', 100).notNullable().unique()
      table.string('email', 100).notNullable().unique()
      table.string('password', 255).notNullable()
      table
        .integer('status_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('user_status')
        .onUpdate('CASCADE')
      table
        .integer('role_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('user_roles')
        .onUpdate('CASCADE')
      table.integer('current_organization_id').unsigned().nullable()
      // MySQL specific: GENERATED ALWAYS AS (CONCAT(first_name, ' ', last_name)) STORED
      // AdonisJS doesn't have a direct method for GENERATED columns, this will be handled at the model level
      table.timestamp('deleted_at', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())
    })

    // Creating index for optimized queries
    this.db.rawQuery('CREATE INDEX idx_users_email ON users(email)')
    this.db.rawQuery('CREATE INDEX idx_users_username ON users(username)')
    this.db.rawQuery('CREATE INDEX idx_users_deleted_at ON users(deleted_at)')
    this.db.rawQuery('CREATE INDEX idx_users_role_status ON users(role_id, status_id)')
    // Voor MySQL: Add full_name computed column and index
    this.db.rawQuery(`
      ALTER TABLE users
      ADD COLUMN full_name VARCHAR(201) 
      GENERATED ALWAYS AS (CONCAT(first_name, ' ', last_name)) STORED
    `)
    this.db.rawQuery('CREATE INDEX idx_users_full_name ON users(full_name)')

    // Email validation constraint (for MySQL)
    this.db.rawQuery(`
      ALTER TABLE users
      ADD CONSTRAINT chk_email 
      CHECK (email REGEXP '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,4}$')
    `)

    // Trigger để tự động cập nhật updated_at
    this.db.rawQuery(`
      CREATE TRIGGER before_user_update
      BEFORE UPDATE ON users
      FOR EACH ROW
      BEGIN
          SET NEW.updated_at = CURRENT_TIMESTAMP;
      END
    `)

    // Trigger kiểm tra current_organization_id khi update
    this.db.rawQuery(`
      CREATE TRIGGER before_update_user_current_org
      BEFORE UPDATE ON users
      FOR EACH ROW
      BEGIN
          IF NEW.current_organization_id IS NOT NULL THEN
              IF NOT EXISTS (
                  SELECT 1 FROM organization_users 
                  WHERE user_id = NEW.id 
                      AND organization_id = NEW.current_organization_id
              ) THEN
                  SIGNAL SQLSTATE '45000'
                  SET MESSAGE_TEXT = 'Người dùng không thuộc tổ chức này';
              END IF;
          END IF;
      END
    `)

    // Trigger ngăn việc đặt current_organization_id khi thêm mới
    this.db.rawQuery(`
      CREATE TRIGGER before_user_insert
      BEFORE INSERT ON users
      FOR EACH ROW
      BEGIN
          IF NEW.current_organization_id IS NOT NULL THEN
              SIGNAL SQLSTATE '45000'
              SET MESSAGE_TEXT = 'Không thể đặt current_organization_id khi thêm mới người dùng. Hãy thêm người dùng vào tổ chức sau.';
          END IF;
      END
    `)

    // Lưu ý: Trường current_organization_id sẽ được thêm sau khi bảng organizations đã được tạo
    // Xem migrations/1718826885940_create_organizations_table.ts
  }

  public async down() {
    // Xóa các trigger
    this.db.rawQuery('DROP TRIGGER IF EXISTS before_user_update')
    this.db.rawQuery('DROP TRIGGER IF EXISTS before_update_user_current_org')
    this.db.rawQuery('DROP TRIGGER IF EXISTS before_user_insert')
    this.schema.dropTable(this.tableName)
  }
}
