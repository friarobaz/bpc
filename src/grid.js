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
  ctx.lineWidth = 1

  for (let x = 0; x < width; x += step) {
    drawVerticalLine(ctx, x, height)
  }
  for (let y = 0; y < height; y += step) {
    drawHorizontalLine(ctx, y, width)
  }
}
