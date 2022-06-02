<script>
	import * as THREE from 'three';
	import * as SC from 'svelte-cubed';

	let width = 1;
	let height = 1;
	let depth = 1;
	let size = 1;

	let spin = 0;

	SC.onFrame(() => {
		spin += 0.01;
	});
</script>

<SC.Canvas
	antialias
	background={new THREE.Color('black')}
	shadows
>
	<SC.Group position={[0, 0, 0]}>

		<SC.Primitive
			object={new THREE.GridHelper(50, 50, 'red', 'white')}
			position={[0, 0, 0]}
		/>
	</SC.Group>

	<SC.Mesh
		geometry={new THREE.LineSegments()}
		material={new THREE.MeshStandardMaterial({ color: 0xff0000 })}
		scale={[size, height, size]}
		rotation={[0, 0, 0]}
		castShadow
		position={[0, size/2, 0]}
	/>

	

	<SC.PerspectiveCamera position={[5, 15, 5]}  target={[5, 0, 5]} />
	<SC.OrbitControls enableZoom={false} maxPolarAngle={Math.PI * 0.51} />
	<SC.AmbientLight intensity={0.6} />
	<SC.DirectionalLight intensity={0.6} position={[-2, 3, 2]} shadow={{ mapSize: [2048, 2048] }} />
</SC.Canvas>

<div class="controls">
	<label><input type="range" bind:value={width} min={0.1} max={3} step={0.1} /> width</label>
	<label><input type="range" bind:value={height} min={0.1} max={3} step={0.1} /> height</label>
	<label><input type="range" bind:value={depth} min={0.1} max={3} step={0.1} /> depth</label>
	<label><input type="range" bind:value={size} min={0.1} max={3} step={0.1} /> size</label>
</div>

<style>
	.controls {
		position: absolute;
		left: 1em;
		top: 1em;
	}

	label {
		display: flex;
		width: 60px;
		gap: 0.5em;
		align-items: center;
	}

	input {
		width: 80px;
		margin: 0;
	}
</style>
