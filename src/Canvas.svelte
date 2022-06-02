<script>
    import { onMount } from 'svelte';
    let canvas, ctx
    let size = 10
    const GRID_SIZE = 80
    const CANVAS_HEIGHT = window.innerHeight 
    const CANVAS_WIDTH = window.innerWidth
    console.log(window.innerWidth)

    onMount(() => {
        ctx = canvas.getContext('2d');
        canvas.width = CANVAS_WIDTH;
        canvas.height = CANVAS_HEIGHT;
        ctx.fillStyle = 'green';
        ctx.fillRect(10, 10, 100, 100);
        drawGrid()
        
    })

    const refresh = ()=>{
        ctx.fillStyle = 'red';
        ctx.fillRect(10, 10, 10+size, 10+size);
    }

    const drawGrid = ()=>{
        for (let x = 0; x < CANVAS_WIDTH; x+=GRID_SIZE) {
                drawVerticalLine(x)   
        }
         for (let y = 0; y < CANVAS_HEIGHT; y+=GRID_SIZE) {
                drawHorizontalLine(y)   
        }

    }

    const drawHorizontalLine = (y)=>{
        ctx.beginPath();
        ctx.moveTo(0,y);
        ctx.lineTo(CANVAS_WIDTH, y);
        ctx.stroke();
    }

    const drawVerticalLine = (x)=>{
        ctx.beginPath();
        ctx.moveTo(x,0);
        ctx.lineTo(x, CANVAS_HEIGHT);
        ctx.stroke();
    }

    


</script>

<canvas id="canvas" bind:this={canvas}></canvas>
<input type="range" min=0 max=100 bind:value={size} on:change={refresh}>

<style>

    canvas{
        
    }
</style>