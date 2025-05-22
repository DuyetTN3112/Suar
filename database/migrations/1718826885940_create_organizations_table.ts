import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'organizations'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.string('name').notNullable()
      table.string('slug').notNullable().unique()
      table.text('description').nullable()
      table.string('logo').nullable()
      table.string('website').nullable()
      table.string('plan', 50).nullable()
      table
        .integer('owner_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')

      table.timestamp('deleted_at').nullable()
      table.timestamp('created_at').notNullable().defaultTo(this.now())
      table.timestamp('updated_at').notNullable().defaultTo(this.now())
    })

    // Tạo chỉ mục
    this.db.rawQuery('CREATE INDEX idx_organizations_slug ON organizations(slug)')
    this.db.rawQuery('CREATE INDEX idx_organizations_owner ON organizations(owner_id)')

    // Thêm trigger để tự động thêm owner vào organization_users
    this.db.rawQuery(`
      CREATE TRIGGER after_organization_insert
      AFTER INSERT ON organizations
      FOR EACH ROW
      BEGIN
          -- Thêm owner vào organization_users với role mặc định (ví dụ: role_id = 1 là admin)
          INSERT INTO organization_users (organization_id, user_id, role_id)
          VALUES (NEW.id, NEW.owner_id, 1); 
      END
    `)

    // Thêm trigger để tự động tạo slug nếu không được cung cấp
    this.db.rawQuery(`
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

    // Thêm foreign key constraint cho users.current_organization_id
    this.db.rawQuery(`
      ALTER TABLE users
      ADD COLUMN current_organization_id INT UNSIGNED NULL,
      ADD CONSTRAINT fk_users_current_org FOREIGN KEY (current_organization_id) 
      REFERENCES organizations(id) ON DELETE SET NULL
    `)
  }

  async down() {
    // Xóa foreign key và column từ users table trước
    this.db.rawQuery(`
      ALTER TABLE users
      DROP FOREIGN KEY fk_users_current_org,
      DROP COLUMN current_organization_id
    `)
    // Xóa triggers
    this.db.rawQuery('DROP TRIGGER IF EXISTS after_organization_insert')
    this.db.rawQuery('DROP TRIGGER IF EXISTS before_organization_insert')
    this.schema.dropTable(this.tableName)
  }
}
