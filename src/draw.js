// @ts-check
const drawHorizontalLine = (ctx, y, xMax) => {
  ctx.beginPath()
  ctx.moveTo(0, y)
  ctx.lineTo(xMax, y)
  ctx.stroke()
}

const drawVerticalLine = (ctx, x, yMax) => {
  ctx.beginPath()
  ctx.moveTo(x, 0)
  ctx.lineTo(x, yMax)
  ctx.stroke()
}

const drawGrid = (ctx, height, width, step, color = "black") => {
  ctx.strokeStyle = color
  ctx.lineWidth = 1

  for (let x = 0; x < width; x += step) {
    drawVerticalLine(ctx, x, height)
  }
  for (let y = 0; y < height; y += step) {
    drawHorizontalLine(ctx, y, width)
  }
}

const circle = (x, y, ctx, color = "red", radius = 3) => {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, 2 * Math.PI)
  ctx.fill()
}

const cursorHelper = (x, y, ctx) => {
  ctx.fillStyle = "red"
  ctx.fillRect(0, y - 2, 10, 4)
  ctx.fillRect(x - 2, 0, 4, 10)
  ctx.strokeStyle = "black"
  ctx.strokeText(`${x}`, x + 15, 10)
  ctx.strokeText(`${y}`, 15, y + 10)
}

const findPoints = (myFunction, start = 0, end = 1500, precision = 0.2) => {
  let points = []
  for (let i = start; i < end; i += precision) {
    points.push({ x: i, y: myFunction(i) })
  }
  return points
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param points
 * @param {string} color
 */
const drawCurve = (
  ctx,
  points,
  color = "red",
  lineWidth = 2,
  showPoints = false
) => {
  ctx.strokeStyle = color
  if (showPoints) {
    for (const point of points) {
      circle(point.x, point.y, ctx, color)
    }
  }
  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)

  for (const point of points) {
    ctx.lineTo(point.x, point.y)
  }
  ctx.lineWidth = lineWidth
  ctx.stroke()
}

export const draw = (ctx, settings) => {
  ctx.clearRect(0, 0, settings.width, settings.height)
  drawGrid(ctx, settings.height, settings.width, 10, "rgba(0, 100, 255, 0.15)")
  drawGrid(ctx, settings.height, settings.width, 50, "rgba(255, 150, 0, 0.4)")
  cursorHelper(settings.mouseX, settings.mouseY, ctx)

  let testFunction = (i) => {
    return Math.cos((i - 50) / 80) * 50 + 100 + i / 3
  }
  let curvePoints = findPoints(testFunction, 150, 450, 10)
  drawCurve(ctx, curvePoints, "blue", 5)
  if (settings.mouseX < 450 && settings.mouseX > 150) {
    circle(settings.mouseX, testFunction(settings.mouseX), ctx, "red")
  }
}

const rien = (ctx) => {
  const points = [
    { x: 20, y: 1.5 },
    { x: 30, y: 1 },
    { x: 35, y: 1.3 },
    { x: 40, y: 1.7 },
    { x: 50, y: 2.5 },
  ]
  const pointsHeavy = points.map((p) => ({ x: p.x * 2, y: p.y * 2 }))
  drawPoints(ctx, points)
  drawPoints(ctx, pointsHeavy, "green")
  ctx.beginPath()
  ctx.strokeStyle = "blue"
  ctx.moveTo(0, 0)
  ctx.lineTo(points[3].x * 10, points[3].y * 10)
  ctx.stroke()
}
