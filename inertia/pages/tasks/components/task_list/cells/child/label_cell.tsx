

interface LabelCellProps {
  label?: unknown
}

export function LabelCell({ label }: LabelCellProps) {
  return (
    <>
      {label ? (
        <div className="text-[11px] inline-flex items-center whitespace-nowrap font-medium"
          style={{ color: label?.color || 'currentColor' }}>
          <span className="h-1.5 w-1.5 rounded-full mr-1"
            style={{ backgroundColor: label?.color || 'currentColor' }}></span>
          {label?.name}
        </div>
      ) : (
        <span className="text-[11px] text-muted-foreground">-</span>
      )}
    </>
  )
}
