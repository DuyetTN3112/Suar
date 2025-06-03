<script lang="ts">
  /**
   * ProfileCompleteness — circular progress indicator for profile completion.
   */
  interface Props {
    completeness: number
    class?: string
  }

  const { completeness, class: className = '' }: Props = $props()

  // SVG circle math
  const svgSize = 80
  const strokeWidth = 6
  const r = (svgSize - strokeWidth) / 2
  const circumference = 2 * Math.PI * r
  const offset = $derived(circumference - (completeness / 100) * circumference)

  const color = $derived(
    completeness >= 80
      ? 'text-green-500'
      : completeness >= 50
        ? 'text-yellow-500'
        : 'text-red-500'
  )
</script>

<div class="flex flex-col items-center gap-2 {className}">
  <div class="relative" style="width: {svgSize}px; height: {svgSize}px;">
    <svg width={svgSize} height={svgSize} class="-rotate-90">
      <!-- Background circle -->
      <circle
        cx={svgSize / 2}
        cy={svgSize / 2}
        {r}
        fill="none"
        stroke="currentColor"
        stroke-width={strokeWidth}
        class="text-muted/30"
      />
      <!-- Progress circle -->
      <circle
        cx={svgSize / 2}
        cy={svgSize / 2}
        {r}
        fill="none"
        stroke="currentColor"
        stroke-width={strokeWidth}
        stroke-linecap="round"
        stroke-dasharray={circumference}
        stroke-dashoffset={offset}
        class="{color} transition-all duration-500"
      />
    </svg>
    <div class="absolute inset-0 flex items-center justify-center">
      <span class="text-sm font-semibold">{completeness}%</span>
    </div>
  </div>
  <span class="text-xs text-muted-foreground">Hoàn thiện hồ sơ</span>
</div>
