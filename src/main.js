//import App from './App.svelte';
import App from "./Canvas.svelte"

const app = new App({
  target: document.body,
  props: {
    name: "world",
  },
})

export default app
