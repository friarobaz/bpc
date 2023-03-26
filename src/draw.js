// @ts-check

const circle = (ctx, x, y, color = "red", radius = 3) => {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, 2 * Math.PI)
  ctx.fill()
}

const cursorHelper = (ctx, x, y) => {
  ctx.setLineDash([5, 3]) /*dashes are 5px and spaces are 3px*/
  ctx.lineWidth = 0.5
  ctx.beginPath()
  ctx.moveTo(x, 0)
  ctx.lineTo(x, y)
  ctx.moveTo(0, y)
  ctx.lineTo(x, y)
  ctx.strokeStyle = "black"
  ctx.stroke()
  ctx.setLineDash([])
  ctx.lineWidth = 1
  ctx.font = "18px sans-serif";
  ctx.fillStyle = "black"
  ctx.fillText(`${Math.floor(x / 6)-4} km/h`, x + 5, 18)
  ctx.fillText(`-${y / 100} m/s`, 0, y + 20)
}

export const findPoints = (
  myFunction,
  start = 0,
  end = 1500,
  precision = 0.2,
  origin = { x: 0, y: 0 }
) => {
  let points = []
  let bestGlide = 0
  let bestGlideIndex = 0
  for (let x = start; x < end; x += precision) {
    const y = myFunction(x)
    const glide = (x - origin.x) / (y - origin.y)
    points.push({ x, y, glide, bestGlide: false })
    if (glide > bestGlide) {
      bestGlide = glide
      bestGlideIndex = points.length - 1
    }
  }
  points[bestGlideIndex].bestGlide = true
  return points
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param points
 * @param {string} color
 */
export const drawCurve = (
  ctx,
  points,
  color = "red",
  lineWidth = 2,
  origin,
  showGlide = true
) => {
  ctx.strokeStyle = color
  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)

  for (const point of points) {
    ctx.lineTo(point.x, point.y)
  }
  ctx.lineWidth = lineWidth
  ctx.stroke()
  if (showGlide) {
    const bestGlidePoint = points.filter((x) => x.bestGlide)[0]
    circle(ctx, bestGlidePoint.x, bestGlidePoint.y, `red`, 5)
    drawGlide(ctx, bestGlidePoint.x, bestGlidePoint.y, origin)
  }
}

export const drawGlide = (ctx, x, y, origin, color = "red") => {
  if (!origin) return
  const glide = (x - origin.x) / (y - origin.y)
  ctx.beginPath()
  ctx.moveTo(origin.x, origin.y)
  ctx.lineTo(x + (x - origin.x) * 5, y + (y - origin.y) * 5)
  ctx.strokeStyle = color
  ctx.lineWidth = 1
  ctx.stroke()
}

const distance = (pointA, pointB) => {
  const a = pointA.x - pointB.x
  const b = pointA.y - pointB.y
  return Math.sqrt(a * a + b * b)
}

export const drawMouseLayer = (ctx, mouseCoordinates, origin, curve, showGlide = true, showCursorHelper = true) => {
  if (showCursorHelper) {
    cursorHelper(ctx, mouseCoordinates.x, mouseCoordinates.y)
  }
  const curveFunction = (i) => {
    return Math.cos((i - curve.D) / curve.C) * curve.A + curve.E + i / curve.B
  }
  if (mouseCoordinates.x > 150 && mouseCoordinates.x < 350 && showGlide) {
    drawGlide(
      ctx,
      mouseCoordinates.x,
      curveFunction(mouseCoordinates.x),
      origin,
      "green"
    )
    circle(ctx, mouseCoordinates.x, curveFunction(mouseCoordinates.x), "green")
  }
}

export const drawCurveLayer = (
  ctx,
  curve,
  origin,
  showEntireCurve = false,
  showAllPTV,
  showBestGlide
) => {
  const curveFunction = (i) => {
    return Math.cos((i - curve.D) / curve.C) * curve.A + curve.E + i / curve.B
  }
  const mainCurvePoints = findPoints(curveFunction, 150, 350, 2, origin)
  const allCurvePoints = findPoints(curveFunction, 0, 1500, 10)
  const heavyCurvePoints = mainCurvePoints.map((p) => ({
    x: p.x * 1.5,
    y: p.y * 1.5,
    bestGlide: p.bestGlide,
  }))
  const lightCurvePoints = mainCurvePoints.map((p) => ({
    x: p.x / 1.5,
    y: p.y / 1.5,
    bestGlide: p.bestGlide,
  }))
  if (showEntireCurve) {
    drawCurve(ctx, allCurvePoints, "rgba(0,0,255,0.1)", 5, origin, false)
  }
  if (showAllPTV) {
    drawCurve(ctx, heavyCurvePoints, "purple", 5, origin, showBestGlide)
    drawCurve(ctx, lightCurvePoints, "cyan", 5, origin, showBestGlide)
  }
  drawCurve(ctx, mainCurvePoints, "blue", 5, origin, showBestGlide)
}
