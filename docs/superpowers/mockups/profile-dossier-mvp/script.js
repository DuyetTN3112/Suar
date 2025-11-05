const navLinks = Array.from(document.querySelectorAll('.section-nav a'))
const sections = navLinks
  .map((link) => document.querySelector(link.getAttribute('href')))
  .filter(Boolean)

const activateNav = (id) => {
  navLinks.forEach((link) => {
    link.classList.toggle('active', link.getAttribute('href') === `#${id}`)
  })
}

const observer = new IntersectionObserver(
  (entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]

    if (visible) {
      activateNav(visible.target.id)
    }
  },
  {
    rootMargin: '-20% 0px -65% 0px',
    threshold: [0.12, 0.3, 0.6],
  }
)

sections.forEach((section) => observer.observe(section))

document.querySelectorAll('[data-filter]').forEach((button) => {
  button.addEventListener('click', () => {
    const filter = button.dataset.filter
    document.querySelectorAll('[data-filter]').forEach((item) => {
      item.classList.toggle('active', item === button)
    })

    document.querySelectorAll('.skill-card').forEach((card) => {
      const isVisible = filter === 'all' || card.dataset.status === filter
      card.classList.toggle('filtered-out', !isVisible)
    })
  })
})

const svgNamespace = 'http://www.w3.org/2000/svg'
const majorLevels = new Set([0, 4, 7, 10, 12, 14])

const parseLevelNumber = (level) => {
  const raw = Number(String(level ?? '').replace(/^l/i, ''))
  if (!Number.isFinite(raw)) return 0
  return Math.max(0, Math.min(14, raw))
}

const polarPoint = (center, angle, distance) => ({
  x: center + Math.cos(angle) * distance,
  y: center + Math.sin(angle) * distance,
})

const pointList = (points, level, radius, center) => {
  const scale = level / 14
  return points
    .map((_point, index) => {
      const angle = (2 * Math.PI * index) / points.length - Math.PI / 2
      const point = polarPoint(center, angle, radius * scale)
      return `${point.x.toFixed(1)},${point.y.toFixed(1)}`
    })
    .join(' ')
}

const setAttributes = (node, attrs) => {
  Object.entries(attrs).forEach(([key, value]) => {
    node.setAttribute(key, String(value))
  })
  return node
}

const createSvgNode = (name, attrs = {}, text = '') => {
  const node = document.createElementNS(svgNamespace, name)
  setAttributes(node, attrs)
  if (text) node.textContent = text
  return node
}

const renderLevelSpider = (container) => {
  const points = JSON.parse(container.dataset.points || '[]')
  if (points.length < 3) return

  const size = 340
  const center = size / 2
  const radius = 106
  const labelRadius = 140
  const svg = createSvgNode('svg', {
    viewBox: `0 0 ${size} ${size}`,
    role: 'img',
    'aria-label': container.getAttribute('aria-label') || 'L0 to L14 spider chart',
  })

  Array.from({ length: 15 }, (_item, level) => {
    if (level === 0) {
      svg.appendChild(
        createSvgNode('circle', {
          cx: center,
          cy: center,
          r: 2,
          class: 'level-ring major',
          'data-level-ring': 'L0',
        })
      )
      return
    }

    svg.appendChild(
      createSvgNode('polygon', {
        points: pointList(points, level, radius, center),
        class: `level-ring${majorLevels.has(level) ? ' major' : ''}`,
        'data-level-ring': `L${level}`,
      })
    )
  })

  points.forEach((_point, index) => {
    const angle = (2 * Math.PI * index) / points.length - Math.PI / 2
    const end = polarPoint(center, angle, radius)
    svg.appendChild(
      createSvgNode('line', {
        x1: center,
        y1: center,
        x2: end.x.toFixed(1),
        y2: end.y.toFixed(1),
        class: 'level-axis',
      })
    )
  })

  ;[0, 4, 7, 10, 12, 14].forEach((level) => {
    const x = center + radius * (level / 14)
    svg.appendChild(
      createSvgNode(
        'text',
        {
          x: (x + 5).toFixed(1),
          y: (center - 5).toFixed(1),
          class: 'level-band-label',
          'data-level-label': `L${level}`,
        },
        `L${level}`
      )
    )
  })

  const dataPoints = points
    .map((point, index) => {
      const level = parseLevelNumber(point.level)
      const angle = (2 * Math.PI * index) / points.length - Math.PI / 2
      const position = polarPoint(center, angle, radius * (level / 14))
      return `${position.x.toFixed(1)},${position.y.toFixed(1)}`
    })
    .join(' ')
  svg.appendChild(createSvgNode('polygon', { points: dataPoints, class: 'level-shape' }))
  svg.appendChild(
    createSvgNode('polyline', {
      points: `${dataPoints} ${dataPoints.split(' ')[0]}`,
      class: 'level-outline',
    })
  )

  points.forEach((point, index) => {
    const level = parseLevelNumber(point.level)
    const angle = (2 * Math.PI * index) / points.length - Math.PI / 2
    const dot = polarPoint(center, angle, radius * (level / 14))
    const label = polarPoint(center, angle, labelRadius)
    const textAnchor = label.x < center - 8 ? 'end' : label.x > center + 8 ? 'start' : 'middle'
    const dotRadius = Math.min(8, 4 + Number(point.reviews || 0) * 0.22)
    const stateClass = ['imported', 'under_dispute', 'stale'].includes(point.state)
      ? point.state
      : 'verified'

    const group = createSvgNode('g', { class: `level-point ${stateClass}` })
    const title = createSvgNode(
      'title',
      {},
      `${point.skill}: ${String(point.level).toUpperCase()} · ${point.reviews} review · ${point.confidence}`
    )
    const circle = createSvgNode('circle', {
      cx: dot.x.toFixed(1),
      cy: dot.y.toFixed(1),
      r: dotRadius.toFixed(1),
      class: `level-dot ${stateClass}`,
      'data-point-level': String(point.level).toUpperCase(),
    })
    const text = createSvgNode('text', {
      x: label.x.toFixed(1),
      y: label.y.toFixed(1),
      'text-anchor': textAnchor,
    })
    const skillName = createSvgNode('tspan', { x: label.x.toFixed(1), class: 'level-axis-label' }, point.skill)
    const levelLabel = createSvgNode(
      'tspan',
      { x: label.x.toFixed(1), dy: '1.15em', class: 'level-axis-level' },
      String(point.level).toUpperCase()
    )

    text.append(skillName, levelLabel)
    group.append(title, circle, text)
    svg.appendChild(group)
  })

  container.replaceChildren(svg)
}

document.querySelectorAll('[data-level-spider]').forEach(renderLevelSpider)

const updateReviewCount = (scope) => {
  const countTarget = document.querySelector(`[data-review-count="${scope}"]`)
  if (!countTarget) return

  const visibleCount = document.querySelectorAll(
    `[data-review-scope="${scope}"]:not(.filtered-out)`
  ).length
  countTarget.textContent = `${visibleCount} dòng`
}

const reviewKindOrder = {
  received: {
    manager: 1,
    peer: 2,
    delivery: 3,
  },
  authored: {
    task: 1,
    manager: 2,
    environment: 3,
  },
}

const reviewTextSorter = new Intl.Collator('vi', {
  sensitivity: 'base',
  numeric: true,
})

const getReviewCards = (scope) =>
  Array.from(document.querySelectorAll(`[data-review-scope="${scope}"]`))

const compareReviewCards = (scope, mode) => (cardA, cardB) => {
  if (mode === 'date') {
    return String(cardB.dataset.reviewDate).localeCompare(String(cardA.dataset.reviewDate))
  }

  if (mode === 'kind') {
    const scopedOrder = reviewKindOrder[scope] || {}
    const kindDelta =
      (scopedOrder[cardA.dataset.reviewKind] || 99) -
      (scopedOrder[cardB.dataset.reviewKind] || 99)
    if (kindDelta !== 0) return kindDelta
    return reviewTextSorter.compare(cardA.dataset.reviewTitle || '', cardB.dataset.reviewTitle || '')
  }

  if (mode === 'score-asc') {
    return Number(cardA.dataset.reviewScore || 0) - Number(cardB.dataset.reviewScore || 0)
  }

  return Number(cardB.dataset.reviewScore || 0) - Number(cardA.dataset.reviewScore || 0)
}

const sortReviewLane = (scope, mode = 'score') => {
  const reviewList = document.querySelector(`[data-review-lane="${scope}"] .review-list`)
  if (!reviewList) return

  getReviewCards(scope).sort(compareReviewCards(scope, mode)).forEach((card) => {
    reviewList.appendChild(card)
  })
}

document.querySelectorAll('[data-review-sort-group]').forEach((select) => {
  select.addEventListener('change', () => {
    sortReviewLane(select.dataset.reviewSortGroup, select.value)
  })
})

document.querySelectorAll('[data-review-filter]').forEach((button) => {
  button.addEventListener('click', () => {
    const filter = button.dataset.reviewFilter
    const filterGroup = button.closest('[data-review-filter-group]')
    const scope = filterGroup?.dataset.reviewFilterGroup
    if (!filter || !scope) return

    filterGroup.querySelectorAll('[data-review-filter]').forEach((item) => {
      item.classList.toggle('active', item === button)
    })

    document.querySelectorAll(`[data-review-scope="${scope}"]`).forEach((card) => {
      const isVisible = filter === 'all' || card.dataset.reviewKind === filter
      card.classList.toggle('filtered-out', !isVisible)
    })

    const activeSort = document.querySelector(`[data-review-sort-group="${scope}"]`)
    sortReviewLane(scope, activeSort?.value)
    updateReviewCount(scope)
  })
})

document.querySelector('[data-toggle="skills"]')?.addEventListener('click', (event) => {
  const panel = document.querySelector('#skills')
  panel.classList.toggle('skills-expanded')
  event.currentTarget.textContent = panel.classList.contains('skills-expanded')
    ? 'Thu gọn kỹ năng'
    : 'Xem thêm kỹ năng'
})

document.querySelector('[data-toggle="history"]')?.addEventListener('click', (event) => {
  const panel = document.querySelector('#history')
  panel.classList.toggle('history-expanded')
  event.currentTarget.textContent = panel.classList.contains('history-expanded')
    ? 'Thu gọn timeline'
    : 'Mở rộng timeline'
})

const snapshotTrigger = document.querySelector('[data-snapshot-trigger]')
const snapshotPopover = document.querySelector('#snapshot-popover')

const setSnapshotOpen = (isOpen) => {
  if (!snapshotTrigger || !snapshotPopover) return

  snapshotPopover.hidden = !isOpen
  snapshotTrigger.setAttribute('aria-expanded', String(isOpen))
  document.body.classList.toggle('snapshot-open', isOpen)
}

snapshotTrigger?.addEventListener('click', (event) => {
  event.stopPropagation()
  setSnapshotOpen(snapshotPopover?.hidden ?? true)
})

snapshotPopover?.addEventListener('click', (event) => {
  event.stopPropagation()
})

document.addEventListener('click', () => {
  setSnapshotOpen(false)
})

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    setSnapshotOpen(false)
  }
})
