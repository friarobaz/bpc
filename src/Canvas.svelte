<script>
    import { onMount } from 'svelte';
    import {draw} from './draw'
    let canvas, ctx
    let size = 10
    let gridSize = 40
    const CANVAS_HEIGHT = window.innerHeight - 100
    const CANVAS_WIDTH = window.innerWidth - 100
    
    document.onmousemove = e =>{
        const x = e.clientX - canvas.offsetLeft
        const y = e.clientY - canvas.offsetTop
        draw(x, y, canvas, gridSize)
    }
    
    onMount(() => {
        canvas.width = CANVAS_WIDTH;
        canvas.height = CANVAS_HEIGHT;
        draw(0, 0, canvas)
    })

    $:if(ctx && gridSize){
        //draw()
    }

   

    


</script>

<canvas id="canvas" bind:this={canvas}></canvas>
<input type="range" min=20 max=80 bind:value={gridSize} >
Grid size: {gridSize}

<style>

    canvas{
        cursor: crosshair;
    }
</style>