import { BaseSeeder } from '@adonisjs/lucid/seeders'
import db from '@adonisjs/lucid/services/db'

export default class extends BaseSeeder {
  async run() {
    try {
      // Drop password column from users table
      await db.rawQuery('ALTER TABLE users DROP COLUMN password')
      console.log('✅ Dropped password column from users table')
    } catch (error) {
      console.log('ℹ️  Password column already removed or does not exist')
    }

    try {
      // Drop password_reset_tokens table
      await db.rawQuery('DROP TABLE IF EXISTS password_reset_tokens')
      console.log('✅ Dropped password_reset_tokens table')
    } catch (error) {
      console.log('ℹ️  password_reset_tokens table already removed or does not exist')
    }

    console.log('\n✅ Password removal completed successfully!')
  }
}
