const NS = 'http://www.w3.org/2000/svg'

export const INNER_R = 13
export const OUTER_R = 19
export const INNER_CIRC = 2 * Math.PI * INNER_R
export const OUTER_CIRC = 2 * Math.PI * OUTER_R

export interface BadgeRefs {
  badgeEl: HTMLDivElement
  innerFill: SVGCircleElement
  outerFill: SVGCircleElement
  outerTrack: SVGCircleElement
}

export function createBadge(): BadgeRefs {
  if (!document.getElementById('carryover-styles')) {
    const style = document.createElement('style')
    style.id = 'carryover-styles'
    style.textContent = [
      '#carryover-badge {',
      '  position: fixed; bottom: 20px; right: 20px;',
      '  z-index: 2147483647; cursor: pointer;',
      '}',
      '#carryover-badge .co-ring-outer-track,',
      '#carryover-badge .co-ring-outer-fill,',
      '#carryover-badge .co-ring-inner-track,',
      '#carryover-badge .co-ring-inner-fill {',
      '  fill: none; stroke-linecap: round;',
      '  transition: stroke-dashoffset 0.3s ease;',
      '}',
      '#carryover-badge .co-ring-outer-track { stroke: #333; stroke-width: 3; }',
      '#carryover-badge .co-ring-outer-fill  { stroke: #4ecf8a; stroke-width: 3; }',
      '#carryover-badge .co-ring-inner-track { stroke: #333; stroke-width: 3; }',
      '#carryover-badge .co-ring-inner-fill  { stroke: #7c6af7; stroke-width: 3; }',
      '#carryover-panel {',
      '  position: fixed; bottom: 74px; right: 20px;',
      '  z-index: 2147483646;',
      '  background: #1a1a1a; border: 1px solid #2a2a2a;',
      '  color: #e0e0e0; border-radius: 8px; padding: 12px 16px;',
      '  min-width: 220px; box-shadow: 0 4px 12px rgba(0,0,0,0.5);',
      '  font-family: system-ui, sans-serif;',
      '}',
      '.co-panel-header {',
      '  font-weight: 600; font-size: 13px; margin-bottom: 8px;',
      '}',
      '.co-panel-divider {',
      '  border: none; border-top: 1px solid #2a2a2a; margin: 8px 0;',
      '}',
      '.co-panel-row {',
      '  display: flex; justify-content: space-between; align-items: center;',
      '  font-size: 12px; margin: 4px 0;',
      '}',
      '.co-panel-value {',
      '  color: #a0a0a0; font-variant-numeric: tabular-nums;',
      '}',
      '.co-btn-compress {',
      '  width: 100%; margin-top: 8px; padding: 6px 0;',
      '  background: #2a2a2a; color: #666; border: 1px solid #3a3a3a;',
      '  border-radius: 4px; font-size: 12px; cursor: not-allowed;',
      '  opacity: 0.6; transition: background 0.15s, color 0.15s, opacity 0.15s;',
      '}',
      '.co-btn-compress:not([disabled]):hover {',
      '  background: #3a3a3a;',
      '}',
    ].join('\n')
    document.head.appendChild(style)
  }

  const badge = document.createElement('div')
  badge.id = 'carryover-badge'

  const svg = document.createElementNS(NS, 'svg')
  svg.setAttribute('viewBox', '0 0 44 44')
  svg.setAttribute('width', '44')
  svg.setAttribute('height', '44')

  function mkCircle(cls: string, r: number): SVGCircleElement {
    const c = document.createElementNS(NS, 'circle')
    c.setAttribute('class', cls)
    c.setAttribute('cx', '22')
    c.setAttribute('cy', '22')
    c.setAttribute('r', String(r))
    return c
  }

  const outerTrack = mkCircle('co-ring-outer-track', OUTER_R)
  const outerFill  = mkCircle('co-ring-outer-fill',  OUTER_R)
  const innerTrack = mkCircle('co-ring-inner-track', INNER_R)
  const innerFill  = mkCircle('co-ring-inner-fill',  INNER_R)

  // Start progress arcs from 12 o'clock
  outerFill.setAttribute('transform', 'rotate(-90 22 22)')
  innerFill.setAttribute('transform', 'rotate(-90 22 22)')

  // Initial dasharray — offset = full circumference → 0% fill
  outerFill.style.strokeDasharray  = `${OUTER_CIRC}`
  outerFill.style.strokeDashoffset = `${OUTER_CIRC}`
  innerFill.style.strokeDasharray  = `${INNER_CIRC}`
  innerFill.style.strokeDashoffset = `${INNER_CIRC}`

  // Outer ring hidden until platform usage data is available
  outerTrack.style.display = 'none'
  outerFill.style.display  = 'none'

  svg.appendChild(outerTrack)
  svg.appendChild(outerFill)
  svg.appendChild(innerTrack)
  svg.appendChild(innerFill)
  badge.appendChild(svg)
  document.body.appendChild(badge)

  return { badgeEl: badge, innerFill, outerFill, outerTrack }
}
