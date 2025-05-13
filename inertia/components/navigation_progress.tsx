import React, { useEffect, useRef, useState } from 'react'

export function NavigationProgress() {
  const barRef = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(0)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    let timer: number | null = null

    const startProgress = () => {
      setIsVisible(true)
      setProgress(0)

      // Tăng progress dần dần lên 90%
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(interval)
            return 90
          }
          return prev + 10
        })
      }, 300)

      return interval
    }

    const completeProgress = () => {
      setProgress(100)

      // Sau khi hoàn thành, ẩn thanh tiến trình
      const timeout = setTimeout(() => {
        setIsVisible(false)
        setProgress(0)
      }, 200)

      return timeout
    }

    // Khi bắt đầu chuyển trang
    const handleStart = () => {
      // Xóa timer cũ nếu có
      if (timer) {
        clearInterval(timer)
      }

      timer = startProgress() as unknown as number
    }

    // Khi hoàn thành chuyển trang
    const handleComplete = () => {
      // Xóa timer cũ nếu có
      if (timer) {
        clearInterval(timer)
      }

      timer = completeProgress() as unknown as number
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
  }, [])

  return React.createElement('div', {
    ref: barRef,
    style: {
      width: `${progress}%`,
      opacity: isVisible ? 1 : 0,
      transition: 'width 0.2s ease-in-out, opacity 0.2s ease-in-out',
    },
    className: "fixed top-0 left-0 z-50 h-1 bg-primary shadow-md"
  })
}
