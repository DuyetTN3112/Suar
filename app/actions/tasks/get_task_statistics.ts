import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'

interface TaskStatistic {
  status: string
  task_count: number
}

@inject()
export default class GetTaskStatistics {
  constructor(protected ctx: HttpContext) {}

  async handle(): Promise<TaskStatistic[]> {
    try {
      // Sử dụng stored procedure để lấy thống kê task
      const result = await db.rawQuery('CALL get_task_statistics()')
      // Kết quả từ stored procedure MySQL thường nằm ở phần tử đầu tiên của mảng
      if (result && Array.isArray(result) && result[0]) {
        return result[0] as TaskStatistic[]
      }
      return []
    } catch (error) {
      console.error('Lỗi khi lấy thống kê task:', error)
      return []
    }
  }
}
