import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'projects'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('creator_id').unsigned().notNullable().references('id').inTable('users')
      table.string('name', 255).notNullable()
      table.text('description').nullable()
      table
        .integer('organization_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('organizations')
      table.timestamp('created_at').notNullable().defaultTo(this.now())
      table.timestamp('updated_at').notNullable().defaultTo(this.now())
      table.timestamp('deleted_at').nullable()
      table.dateTime('start_date').nullable()
      table.dateTime('end_date').nullable()
      table.integer('status_id').unsigned().nullable().references('id').inTable('project_status')
      table.decimal('budget', 15, 2).defaultTo(0.0)
      table.integer('manager_id').unsigned().nullable().references('id').inTable('users')
      table.integer('owner_id').unsigned().nullable().references('id').inTable('users')
      table.enum('visibility', ['public', 'private', 'team']).defaultTo('team').notNullable()
      // Indexes
      table.index(['organization_id'], 'idx_projects_organization')
      table.index(['organization_id', 'status_id'], 'idx_projects_org_status')
      table.index(['start_date', 'end_date'], 'idx_projects_dates')
      table.index(['manager_id'], 'idx_projects_manager')
    })

    // Thêm triggers
    await this.db.rawQuery(`
      CREATE TRIGGER before_insert_project
      BEFORE INSERT ON projects
      FOR EACH ROW
      BEGIN
          DECLARE is_superadmin INT;
          
          -- Kiểm tra xem người tạo project có phải là superadmin của tổ chức không
          SELECT COUNT(*) INTO is_superadmin
          FROM organization_users
          WHERE user_id = NEW.owner_id -- Giả sử owner_id là người tạo
            AND organization_id = NEW.organization_id
            AND role_id = 1
            AND status = 'approved';
          
          IF is_superadmin = 0 THEN
              SIGNAL SQLSTATE '45000'
              SET MESSAGE_TEXT = 'Chỉ superadmin của tổ chức mới có thể tạo project';
          END IF;
          
          -- Đảm bảo manager_id không mâu thuẫn (nếu cần)
          IF NEW.manager_id IS NOT NULL AND NEW.manager_id != NEW.owner_id THEN
              SET NEW.manager_id = NEW.owner_id; -- Gán superadmin làm manager mặc định
          END IF;
      END
    `)
  }

  async down() {
    await this.db.rawQuery('DROP TRIGGER IF EXISTS before_insert_project')
    this.schema.dropTable(this.tableName)
  }
}
