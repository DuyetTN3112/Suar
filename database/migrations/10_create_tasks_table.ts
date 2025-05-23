import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'tasks'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.string('title', 255).notNullable()
      table.text('description').notNullable()
      table
        .integer('status_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('task_status')
        .onUpdate('CASCADE')
      table
        .integer('label_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('task_labels')
        .onUpdate('CASCADE')
      table
        .integer('priority_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('task_priorities')
        .onUpdate('CASCADE')
      table
        .integer('assigned_to')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
        .onUpdate('CASCADE')
      table
        .integer('creator_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
        .onUpdate('CASCADE')
      table
        .integer('updated_by')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
        .onUpdate('CASCADE')
      table.dateTime('due_date').notNullable()
      table
        .integer('parent_task_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('tasks')
        .onDelete('SET NULL')
        .onUpdate('CASCADE')
        .comment('Tham chiếu đến task cha (nếu có)')
      table.decimal('estimated_time', 10, 2).defaultTo(0).comment('Thời gian dự kiến (giờ)')
      table.decimal('actual_time', 10, 2).defaultTo(0).comment('Thời gian thực tế (giờ)')
      table
        .integer('organization_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('organizations')
        .onDelete('CASCADE')

      table.timestamp('deleted_at', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())
    })

    // Creating indexes for optimized queries
    this.db.rawQuery('CREATE INDEX idx_tasks_status ON tasks(status_id)')
    this.db.rawQuery('CREATE INDEX idx_tasks_priority ON tasks(priority_id)')
    this.db.rawQuery('CREATE INDEX idx_tasks_label ON tasks(label_id)')
    this.db.rawQuery('CREATE INDEX idx_tasks_deleted_at ON tasks(deleted_at)')
    this.db.rawQuery('CREATE INDEX idx_tasks_assigned_status ON tasks(assigned_to, status_id)')
    this.db.rawQuery('CREATE INDEX fk_parent_task ON tasks(parent_task_id)')
    this.db.rawQuery('CREATE INDEX fk_task_organization ON tasks(organization_id)')
    this.db.rawQuery('CREATE INDEX fk_tasks_updated_by ON tasks(updated_by)')
    this.db.rawQuery('CREATE INDEX idx_tasks_organization ON tasks(organization_id)')

    // Create trigger to check if assigned user belongs to organization
    this.db.rawQuery(`
      CREATE TRIGGER check_assigned_to_organization
      BEFORE INSERT ON tasks
      FOR EACH ROW
      BEGIN
          DECLARE is_same_org BOOLEAN;
          SELECT EXISTS (
              SELECT 1 
              FROM organization_users 
              WHERE user_id = NEW.assigned_to 
              AND organization_id = NEW.organization_id
          ) INTO is_same_org;
          
          IF NOT is_same_org THEN
              SIGNAL SQLSTATE '45000' 
              SET MESSAGE_TEXT = 'Người được gán phải thuộc cùng tổ chức';
          END IF;
      END
    `)

    // Create trigger to check if creator belongs to organization
    this.db.rawQuery(`
      CREATE TRIGGER check_creator_organization
      BEFORE INSERT ON tasks
      FOR EACH ROW
      BEGIN
          IF NOT EXISTS (
              SELECT 1 FROM organization_users
              WHERE user_id = NEW.creator_id AND organization_id = NEW.organization_id
          ) THEN
              SIGNAL SQLSTATE '45000'
              SET MESSAGE_TEXT = 'Người tạo task phải thuộc tổ chức của task';
          END IF;
      END
    `)

    // Create trigger to store task versions on update
    this.db.rawQuery(`
      CREATE TRIGGER task_version_trigger
      BEFORE UPDATE ON tasks
      FOR EACH ROW
      BEGIN
          IF NEW <> OLD THEN -- Chỉ lưu khi có thay đổi
              INSERT INTO task_versions (
                  task_id, title, description, status_id, 
                  label_id, priority_id, assigned_to, changed_by
              ) VALUES (
                  OLD.id, OLD.title, OLD.description, OLD.status_id,
                  OLD.label_id, OLD.priority_id, OLD.assigned_to, OLD.updated_by
              );
          END IF;
      END
    `)

    // Create trigger to check update constraints
    this.db.rawQuery(`
      CREATE TRIGGER before_task_update
      BEFORE UPDATE ON tasks
      FOR EACH ROW
      BEGIN
          -- Kiểm tra assigned_to có thuộc tổ chức không
          IF NEW.assigned_to IS NOT NULL THEN
              IF NOT EXISTS (
                  SELECT 1 FROM organization_users 
                  WHERE user_id = NEW.assigned_to 
                      AND organization_id = NEW.organization_id
              ) THEN
                  SIGNAL SQLSTATE '45000' 
                  SET MESSAGE_TEXT = 'Người được gán phải thuộc cùng tổ chức';
              END IF;
          END IF;

          -- Kiểm tra creator_id có thuộc tổ chức không (nếu organization_id thay đổi)
          IF NEW.organization_id <> OLD.organization_id THEN
              IF NOT EXISTS (
                  SELECT 1 FROM organization_users 
                  WHERE user_id = NEW.creator_id 
                      AND organization_id = NEW.organization_id
              ) THEN
                  SIGNAL SQLSTATE '45000' 
                  SET MESSAGE_TEXT = 'Người tạo task phải thuộc tổ chức mới';
              END IF;
          END IF;
      END
    `)
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
