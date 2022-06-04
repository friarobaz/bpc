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

export const drawGrid = (ctx, height, width, step, color = "black") => {
  ctx.strokeStyle = color

  for (let x = 0; x < width; x += step) {
    drawVerticalLine(ctx, x, height)
  }
  for (let y = 0; y < height; y += step) {
    drawHorizontalLine(ctx, y, width)
  }
}

export const circle = (x, y, ctx, color = "red", radius = 3) => {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, 2 * Math.PI)
  ctx.fill()
}

export const findPoints = (
  myFunction,
  start = 0,
  end = 1500,
  precision = 0.2
) => {
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
const drawPoints = (ctx, points, color = "red") => {
  ctx.strokeStyle = color
  for (const point of points) {
    circle(point.x, point.y, ctx, color)
  }
  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)

  for (const point of points) {
    ctx.lineTo(point.x, point.y)
  }

  ctx.stroke()
}

export const draw = (ctx, settings) => {
  ctx.clearRect(0, 0, settings.width, settings.height)
  drawGrid(ctx, settings.height, settings.width, 10, "rgba(0, 100, 255, 0.15)")
  drawGrid(ctx, settings.height, settings.width, 50, "rgba(255, 150, 0, 0.4)")
  ctx.fillStyle = "red"
  ctx.fillRect(0, settings.mouseY - 2, 10, 4)
  ctx.fillRect(settings.mouseX - 2, 0, 4, 10)
  ctx.strokeStyle = "black"
  ctx.strokeText(`${settings.mouseX}`, settings.mouseX + 15, 10)
  ctx.strokeText(`${settings.mouseY}`, 15, settings.mouseY + 10)

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
  let testFunction = (i) => {
    return Math.cos((i - 50) / 80) * 50 + 100 + i / 3
  }
  let curvePoints = findPoints(testFunction, 150, 450, 3)
  drawPoints(ctx, curvePoints, "blue")
  if (settings.mouseX < 450 && settings.mouseX > 150) {
    circle(settings.mouseX, testFunction(settings.mouseX), ctx, "red")
  }

  ctx.beginPath()
  ctx.strokeStyle = "blue"
  ctx.moveTo(0, 0)
  ctx.lineTo(points[3].x * 10, points[3].y * 10)
  ctx.stroke()
}
