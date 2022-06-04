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

const drawGrid = (ctx, height, width, step) => {
  ctx.strokeStyle = "black"

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

const findPoints = (myFunction, start = 0, end = 1500, precision = 0.2) => {
  let points = []
  for (let i = start; i < end; i += precision) {
    points.push({ x: i, y: myFunction(i) })
  }
  return points
}

const NX = 8
const NY = 40
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

  /*   let i

  for (i = 1; i < points.length - 2; i++) {
    var xc = (points[i].x + points[i + 1].x) / 2
    var yc = (points[i].y + points[i + 1].y) / 2
    ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc)
  }
  // curve through the last two points
  ctx.quadraticCurveTo(
    points[i].x,
    points[i].y,
    points[i + 1].x,
    points[i + 1].y
  ) */
  ctx.stroke()
}

/**
 * @param {number} x
 * @param {number} y
 * @param {HTMLCanvasElement} canvas
 */
export const draw = (x, y, canvas, lol) => {
  const ctx = canvas.getContext("2d")
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  drawGrid(ctx, canvas.height, canvas.width, 40)
  ctx.fillStyle = "red"
  ctx.fillRect(0, y - 2, 10, 4)
  ctx.fillRect(x - 2, 0, 4, 10)
  ctx.strokeText(`${x}`, x + 15, 10)
  ctx.strokeText(`${y}`, 15, y + 10)
  console.log("coucouqsdf")

  const points = [
    { x: 20, y: 1.5 },
    { x: 30, y: 1 },
    { x: 35, y: 1.3 },
    { x: lol ?? 40, y: 1.7 },
    { x: 50, y: 2.5 },
  ]
  const pointsHeavy = points.map((p) => ({ x: p.x * 2, y: p.y * 2 }))
  drawPoints(ctx, points)
  drawPoints(ctx, pointsHeavy, "green")
  let penis = findPoints(
    (xx) => {
      return xx * xx * 0.005
    },
    100,
    240,
    10
  )
  console.log("coucou", penis)
  drawPoints(ctx, penis, "purple")
  circle(x, x * x * 0.005, ctx, "blue")
  console.log("circle", x, x * x * 0.005)

  ctx.beginPath()
  ctx.strokeStyle = "blue"
  ctx.moveTo(0, 0)
  ctx.lineTo(points[3].x * 10, points[3].y * 10)
  ctx.stroke()
}
