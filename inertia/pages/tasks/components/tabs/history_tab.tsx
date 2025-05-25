import React from 'react'
import { formatDate } from '../task_detail_utils'
import type { AuditLog } from '../task_detail_types'

export interface HistoryTabProps {
  auditLogs: AuditLog[]
}

export const HistoryTab: React.FC<HistoryTabProps> = ({ auditLogs }) => {
  return (
    <div className="space-y-4">
      <div className="max-h-[350px] overflow-y-auto space-y-2 border rounded-md p-4">
        {auditLogs.length === 0 ? (
          <EmptyHistoryView />
        ) : (
          auditLogs.map((log, index) => (
            <LogEntry key={index} log={log} />
          ))
        )}
      </div>
    </div>
  )
}

// Component hiển thị khi không có lịch sử
function EmptyHistoryView() {
  return (
    <div className="text-center text-muted-foreground py-8">
      Chưa có lịch sử thay đổi
    </div>
  )
}

// Component hiển thị một mục nhật ký
function LogEntry({ log }: { log: AuditLog }) {
  return (
    <div className="flex gap-2 text-sm border-b pb-2 last:border-0">
      <div className="text-muted-foreground min-w-[120px] text-xs">
        {formatDate(log.created_at)}
      </div>
      <div>
        <div className="font-medium">{log.user?.username || 'Người dùng'}</div>
        <div className="text-xs">{log.action}</div>
        {log.changes && (
          <div className="text-xs mt-1 text-muted-foreground">
            {typeof log.changes === 'string'
              ? log.changes
              : JSON.stringify(log.changes)}
          </div>
        )}
      </div>
    </div>
  )
}
