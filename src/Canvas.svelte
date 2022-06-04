<script>
    import { onMount } from 'svelte';
    import {draw} from './draw'
    let canvas, ctx
    const CANVAS_HEIGHT = window.innerHeight - 100
    const CANVAS_WIDTH = window.innerWidth - 100
    
    let settings = {
        mouseX:null,
        mouseY:null,
        A:50,
        B:3,
        C:80,
        D:40,
        E:100,
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
<br>
A: <input type="range" min=0 max=100 bind:value={settings.A} >
B: <input type="range" min=1 max=10 step=0.1 bind:value={settings.B} >
C: <input type="range" min=20 max=120 bind:value={settings.C} >
D:<input type="range" min=0 max=100 bind:value={settings.D} >
E:<input type="range" min=0 max=200 bind:value={settings.E} >
<br>
A: {settings.A}
B: {settings.B}
C: {settings.C}
D: {settings.D}
D: {settings.E}
<br>





<style>

    canvas{
        cursor: crosshair;
    }
</style>