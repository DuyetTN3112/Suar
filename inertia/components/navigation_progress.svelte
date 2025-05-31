<script lang="ts">
  let progress = $state(0)
  let isVisible = $state(false)
  let timer: number | null = null

  function startProgress(): number {
    isVisible = true
    progress = 0

    // Tăng progress dần dần lên 90%
    const interval = setInterval(() => {
      if (progress >= 90) {
        clearInterval(interval)
        progress = 90
      } else {
        progress += 10
      }
    }, 300) as unknown as number

    return interval
  }

  function completeProgress(): number {
    progress = 100

    // Sau khi hoàn thành, ẩn thanh tiến trình
    const timeout = setTimeout(() => {
      isVisible = false
      progress = 0
    }, 200) as unknown as number

    return timeout
  }

  $effect(() => {
    // Khi bắt đầu chuyển trang
    const handleStart = () => {
      // Xóa timer cũ nếu có
      if (timer) {
        clearInterval(timer)
      }

      timer = startProgress()
    }

    // Khi hoàn thành chuyển trang
    const handleComplete = () => {
      // Xóa timer cũ nếu có
      if (timer) {
        clearInterval(timer)
      }

      timer = completeProgress()
    }

    document.addEventListener('inertia:start', handleStart)
    document.addEventListener('inertia:finish', handleComplete)

    return () => {
      document.removeEventListener('inertia:start', handleStart)
      document.removeEventListener('inertia:finish', handleComplete)

      if (timer) {
        clearInterval(timer)
      }
    }
  })
</script>

<div
  style="width: {progress}%; opacity: {isVisible ? 1 : 0}; transition: width 0.2s ease-in-out, opacity 0.2s ease-in-out;"
  class="fixed top-0 left-0 z-50 h-1 bg-primary shadow-md"
></div>
