import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'project_members'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('project_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('projects')
        .onDelete('CASCADE')
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.enum('role', ['owner', 'manager', 'member']).defaultTo('member')
      table.timestamp('created_at').notNullable().defaultTo(this.now())
      // Unique constraint
      table.unique(['project_id', 'user_id'])
    })

    // Thêm triggers
    await this.db.rawQuery(`
      CREATE TRIGGER before_insert_project_member
      BEFORE INSERT ON project_members
      FOR EACH ROW
      BEGIN
          DECLARE is_member INT;
          
          -- Kiểm tra xem thành viên có thuộc tổ chức của project không
          SELECT COUNT(*) INTO is_member
          FROM organization_users ou
          JOIN projects p ON ou.organization_id = p.organization_id
          WHERE ou.user_id = NEW.user_id
            AND p.id = NEW.project_id
            AND ou.status = 'approved';
          
          IF is_member = 0 THEN
              SIGNAL SQLSTATE '45000'
              SET MESSAGE_TEXT = 'Thành viên không thuộc tổ chức của project';
          END IF;
      END
    `)

    await this.db.rawQuery(`
      CREATE TRIGGER before_delete_project_member
      BEFORE DELETE ON project_members
      FOR EACH ROW
      BEGIN
          DECLARE is_owner INT;
          DECLARE new_owner_id INT;
          
          -- Kiểm tra xem người bị xóa có phải là owner_id không
          SELECT COUNT(*) INTO is_owner
          FROM projects
          WHERE id = OLD.project_id AND owner_id = OLD.user_id;
          
          IF is_owner > 0 THEN
              -- Tìm superadmin hoặc admin khác trong project
              SELECT user_id INTO new_owner_id
              FROM project_members pm
              JOIN organization_users ou ON pm.user_id = ou.user_id
              WHERE pm.project_id = OLD.project_id
                AND ou.organization_id = (SELECT organization_id FROM projects WHERE id = OLD.project_id)
                AND ou.role_id IN (1, 2) -- superadmin hoặc admin
                AND ou.status = 'approved'
                AND pm.user_id != OLD.user_id
              LIMIT 1;
              
              IF new_owner_id IS NULL THEN
                  SIGNAL SQLSTATE '45000'
                  SET MESSAGE_TEXT = 'Vui lòng chỉ định superadmin hoặc admin khác làm chủ sở hữu trước khi rời project';
              ELSE
                  UPDATE projects
                  SET owner_id = new_owner_id
                  WHERE id = OLD.project_id;
              END IF;
          END IF;
      END
    `)
  }

  async down() {
    await this.db.rawQuery('DROP TRIGGER IF EXISTS before_delete_project_member')
    await this.db.rawQuery('DROP TRIGGER IF EXISTS before_insert_project_member')
    this.schema.dropTable(this.tableName)
  }
}
