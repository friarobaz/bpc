<script>
    import { onMount } from 'svelte';
    import {draw} from './draw'
    let canvas, ctx
    const CANVAS_HEIGHT = window.innerHeight - 100
    const CANVAS_WIDTH = window.innerWidth - 100
    
    let settings = {
        mouseX:null,
        mouseY:null,
        range:40,
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
    }

    onMount(() => {
        canvas.width = CANVAS_WIDTH;
        canvas.height = CANVAS_HEIGHT;
        ctx = canvas.getContext("2d")
        draw(ctx, settings)
    })

    document.onmousemove = e =>{
        settings.mouseX = e.clientX - canvas.offsetLeft
        settings.mouseY = e.clientY - canvas.offsetTop
        draw(ctx, settings)
    }

</script>

<canvas id="canvas" bind:this={canvas} ></canvas>
<input type="range" min=20 max=80 bind:value={settings.range} >
Range: {settings.range}

<style>

    canvas{
        cursor: crosshair;
    }
</style>