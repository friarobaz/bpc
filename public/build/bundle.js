
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function to_number(value) {
        return value === '' ? null : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.48.0' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    // @ts-check

    const circle = (ctx, x, y, color = "red", radius = 3) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fill();
    };

    const cursorHelper = (ctx, x, y) => {
      ctx.setLineDash([5, 3]); /*dashes are 5px and spaces are 3px*/
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, y);
      ctx.moveTo(0, y);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.strokeStyle = "black";
      ctx.setLineDash([]);
      ctx.lineWidth = 1;
      ctx.strokeText(`${x / 10} km/h`, x + 5, 8);
      ctx.strokeText(`-${y / 100} m/s`, 0, y + 13);
    };

    const findPoints = (
      myFunction,
      start = 0,
      end = 1500,
      precision = 0.2,
      origin = { x: 0, y: 0 }
    ) => {
      let points = [];
      let bestGlide = 0;
      let bestGlideIndex = 0;
      for (let x = start; x < end; x += precision) {
        const y = myFunction(x);
        const glide = (x - origin.x) / (y - origin.y);
        points.push({ x, y, glide, bestGlide: false });
        if (glide > bestGlide) {
          bestGlide = glide;
          bestGlideIndex = points.length - 1;
        }
      }
      points[bestGlideIndex].bestGlide = true;
      return points
    };

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
      origin,
      showGlide = true
    ) => {
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);

      for (const point of points) {
        ctx.lineTo(point.x, point.y);
      }
      ctx.lineWidth = lineWidth;
      ctx.stroke();
      if (showGlide) {
        const bestGlidePoint = points.filter((x) => x.bestGlide)[0];
        circle(ctx, bestGlidePoint.x, bestGlidePoint.y, `red`, 5);
        drawGlide(ctx, bestGlidePoint.x, bestGlidePoint.y, origin);
      }
    };

    const drawGlide = (ctx, x, y, origin) => {
      if (!origin) return
      (x - origin.x) / (y - origin.y);
      ctx.beginPath();
      ctx.moveTo(origin.x, origin.y);
      ctx.lineTo(x + (x - origin.x) * 5, y + (y - origin.y) * 5);
      //ctx.lineTo(800, 800 / glide)
      ctx.strokeStyle = "red";
      ctx.lineWidth = 1;
      ctx.stroke();
    };

    const drawMouseLayer = (ctx, settings) => {
      cursorHelper(ctx, settings.mouse.x, settings.mouse.y);
    };

    const drawCurveLayer = (ctx, curve, origin) => {
      const curveFunction = (i) => {
        return Math.cos((i - curve.D) / curve.C) * curve.A + curve.E + i / curve.B
      };
      const mainCurvePoints = findPoints(curveFunction, 150, 460, 2, origin);
      const allCurvePoints = findPoints(curveFunction, 0, 1500, 10);
      drawCurve(ctx, allCurvePoints, "rgba(0,0,255,0.1)", 5, origin, false);
      drawCurve(ctx, mainCurvePoints, "blue", 5, origin);
    };

    // @ts-check
    const drawHorizontalLine = (ctx, y, xMax) => {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(xMax, y);
      ctx.stroke();
    };

    const drawVerticalLine = (ctx, x, yMax) => {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, yMax);
      ctx.stroke();
    };

    const drawGrid = (ctx, height, width, step, color = "black") => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;

      for (let x = 0; x < width; x += step) {
        drawVerticalLine(ctx, x, height);
      }
      for (let y = 0; y < height; y += step) {
        drawHorizontalLine(ctx, y, width);
      }
    };

    /* src/Canvas.svelte generated by Svelte v3.48.0 */

    const { console: console_1 } = globals;
    const file = "src/Canvas.svelte";

    function create_fragment(ctx) {
    	let div0;
    	let canvas0;
    	let t0;
    	let canvas1;
    	let t1;
    	let canvas2;
    	let t2;
    	let br0;
    	let t3;
    	let div2;
    	let t4;
    	let input0;
    	let t5;
    	let input1;
    	let t6;
    	let input2;
    	let t7;
    	let input3;
    	let t8;
    	let input4;
    	let t9;
    	let br1;
    	let t10;
    	let t11_value = /*curveNumbers*/ ctx[1].A + "";
    	let t11;
    	let t12;
    	let t13_value = /*curveNumbers*/ ctx[1].B + "";
    	let t13;
    	let t14;
    	let t15_value = /*curveNumbers*/ ctx[1].C + "";
    	let t15;
    	let t16;
    	let t17_value = /*curveNumbers*/ ctx[1].D + "";
    	let t17;
    	let t18;
    	let t19_value = /*curveNumbers*/ ctx[1].E + "";
    	let t19;
    	let t20;
    	let br2;
    	let t21;
    	let div1;
    	let t22;
    	let input5;
    	let t23;
    	let t24_value = /*origin*/ ctx[0].x + "";
    	let t24;
    	let t25;
    	let br3;
    	let t26;
    	let input6;
    	let t27;
    	let t28_value = /*origin*/ ctx[0].y + "";
    	let t28;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			canvas0 = element("canvas");
    			t0 = space();
    			canvas1 = element("canvas");
    			t1 = space();
    			canvas2 = element("canvas");
    			t2 = space();
    			br0 = element("br");
    			t3 = space();
    			div2 = element("div");
    			t4 = text("A: ");
    			input0 = element("input");
    			t5 = text("\n    B: ");
    			input1 = element("input");
    			t6 = text("\n    C: ");
    			input2 = element("input");
    			t7 = text("\n    D:");
    			input3 = element("input");
    			t8 = text("\n    E:");
    			input4 = element("input");
    			t9 = space();
    			br1 = element("br");
    			t10 = text("\n    A: ");
    			t11 = text(t11_value);
    			t12 = text("\n    B: ");
    			t13 = text(t13_value);
    			t14 = text("\n    C: ");
    			t15 = text(t15_value);
    			t16 = text("\n    D: ");
    			t17 = text(t17_value);
    			t18 = text("\n    E: ");
    			t19 = text(t19_value);
    			t20 = space();
    			br2 = element("br");
    			t21 = space();
    			div1 = element("div");
    			t22 = text("Vent de face:");
    			input5 = element("input");
    			t23 = space();
    			t24 = text(t24_value);
    			t25 = space();
    			br3 = element("br");
    			t26 = text("\n        Thermique:");
    			input6 = element("input");
    			t27 = space();
    			t28 = text(t28_value);
    			attr_dev(canvas0, "id", "grid");
    			attr_dev(canvas0, "class", "svelte-19yrjb4");
    			add_location(canvas0, file, 55, 1, 1850);
    			attr_dev(canvas1, "id", "curve");
    			attr_dev(canvas1, "class", "svelte-19yrjb4");
    			add_location(canvas1, file, 56, 1, 1902);
    			attr_dev(canvas2, "id", "mouse");
    			attr_dev(canvas2, "class", "svelte-19yrjb4");
    			add_location(canvas2, file, 57, 1, 1956);
    			attr_dev(div0, "id", "container");
    			attr_dev(div0, "class", "svelte-19yrjb4");
    			add_location(div0, file, 54, 0, 1806);
    			add_location(br0, file, 60, 0, 2017);
    			attr_dev(input0, "type", "range");
    			attr_dev(input0, "min", "0");
    			attr_dev(input0, "max", "100");
    			add_location(input0, file, 62, 7, 2049);
    			attr_dev(input1, "type", "range");
    			attr_dev(input1, "min", "1");
    			attr_dev(input1, "max", "10");
    			attr_dev(input1, "step", "0.1");
    			add_location(input1, file, 63, 7, 2119);
    			attr_dev(input2, "type", "range");
    			attr_dev(input2, "min", "20");
    			attr_dev(input2, "max", "120");
    			add_location(input2, file, 64, 7, 2198);
    			attr_dev(input3, "type", "range");
    			attr_dev(input3, "min", "0");
    			attr_dev(input3, "max", "500");
    			add_location(input3, file, 65, 6, 2269);
    			attr_dev(input4, "type", "range");
    			attr_dev(input4, "min", "0");
    			attr_dev(input4, "max", "200");
    			add_location(input4, file, 66, 6, 2339);
    			add_location(br1, file, 67, 4, 2407);
    			add_location(br2, file, 73, 4, 2536);
    			attr_dev(input5, "type", "range");
    			attr_dev(input5, "min", "-200");
    			attr_dev(input5, "max", "200");
    			add_location(input5, file, 75, 21, 2572);
    			add_location(br3, file, 75, 93, 2644);
    			attr_dev(input6, "type", "range");
    			attr_dev(input6, "min", "-100");
    			attr_dev(input6, "max", "100");
    			add_location(input6, file, 76, 18, 2667);
    			add_location(div1, file, 74, 4, 2545);
    			attr_dev(div2, "id", "controls");
    			attr_dev(div2, "class", "svelte-19yrjb4");
    			add_location(div2, file, 61, 0, 2022);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			append_dev(div0, canvas0);
    			/*canvas0_binding*/ ctx[7](canvas0);
    			append_dev(div0, t0);
    			append_dev(div0, canvas1);
    			/*canvas1_binding*/ ctx[8](canvas1);
    			append_dev(div0, t1);
    			append_dev(div0, canvas2);
    			/*canvas2_binding*/ ctx[9](canvas2);
    			/*div0_binding*/ ctx[10](div0);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, br0, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, div2, anchor);
    			append_dev(div2, t4);
    			append_dev(div2, input0);
    			set_input_value(input0, /*curveNumbers*/ ctx[1].A);
    			append_dev(div2, t5);
    			append_dev(div2, input1);
    			set_input_value(input1, /*curveNumbers*/ ctx[1].B);
    			append_dev(div2, t6);
    			append_dev(div2, input2);
    			set_input_value(input2, /*curveNumbers*/ ctx[1].C);
    			append_dev(div2, t7);
    			append_dev(div2, input3);
    			set_input_value(input3, /*curveNumbers*/ ctx[1].D);
    			append_dev(div2, t8);
    			append_dev(div2, input4);
    			set_input_value(input4, /*curveNumbers*/ ctx[1].E);
    			append_dev(div2, t9);
    			append_dev(div2, br1);
    			append_dev(div2, t10);
    			append_dev(div2, t11);
    			append_dev(div2, t12);
    			append_dev(div2, t13);
    			append_dev(div2, t14);
    			append_dev(div2, t15);
    			append_dev(div2, t16);
    			append_dev(div2, t17);
    			append_dev(div2, t18);
    			append_dev(div2, t19);
    			append_dev(div2, t20);
    			append_dev(div2, br2);
    			append_dev(div2, t21);
    			append_dev(div2, div1);
    			append_dev(div1, t22);
    			append_dev(div1, input5);
    			set_input_value(input5, /*origin*/ ctx[0].x);
    			append_dev(div1, t23);
    			append_dev(div1, t24);
    			append_dev(div1, t25);
    			append_dev(div1, br3);
    			append_dev(div1, t26);
    			append_dev(div1, input6);
    			set_input_value(input6, /*origin*/ ctx[0].y);
    			append_dev(div1, t27);
    			append_dev(div1, t28);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "change", /*input0_change_input_handler*/ ctx[11]),
    					listen_dev(input0, "input", /*input0_change_input_handler*/ ctx[11]),
    					listen_dev(input1, "change", /*input1_change_input_handler*/ ctx[12]),
    					listen_dev(input1, "input", /*input1_change_input_handler*/ ctx[12]),
    					listen_dev(input2, "change", /*input2_change_input_handler*/ ctx[13]),
    					listen_dev(input2, "input", /*input2_change_input_handler*/ ctx[13]),
    					listen_dev(input3, "change", /*input3_change_input_handler*/ ctx[14]),
    					listen_dev(input3, "input", /*input3_change_input_handler*/ ctx[14]),
    					listen_dev(input4, "change", /*input4_change_input_handler*/ ctx[15]),
    					listen_dev(input4, "input", /*input4_change_input_handler*/ ctx[15]),
    					listen_dev(input5, "change", /*input5_change_input_handler*/ ctx[16]),
    					listen_dev(input5, "input", /*input5_change_input_handler*/ ctx[16]),
    					listen_dev(input6, "change", /*input6_change_input_handler*/ ctx[17]),
    					listen_dev(input6, "input", /*input6_change_input_handler*/ ctx[17])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*curveNumbers*/ 2) {
    				set_input_value(input0, /*curveNumbers*/ ctx[1].A);
    			}

    			if (dirty & /*curveNumbers*/ 2) {
    				set_input_value(input1, /*curveNumbers*/ ctx[1].B);
    			}

    			if (dirty & /*curveNumbers*/ 2) {
    				set_input_value(input2, /*curveNumbers*/ ctx[1].C);
    			}

    			if (dirty & /*curveNumbers*/ 2) {
    				set_input_value(input3, /*curveNumbers*/ ctx[1].D);
    			}

    			if (dirty & /*curveNumbers*/ 2) {
    				set_input_value(input4, /*curveNumbers*/ ctx[1].E);
    			}

    			if (dirty & /*curveNumbers*/ 2 && t11_value !== (t11_value = /*curveNumbers*/ ctx[1].A + "")) set_data_dev(t11, t11_value);
    			if (dirty & /*curveNumbers*/ 2 && t13_value !== (t13_value = /*curveNumbers*/ ctx[1].B + "")) set_data_dev(t13, t13_value);
    			if (dirty & /*curveNumbers*/ 2 && t15_value !== (t15_value = /*curveNumbers*/ ctx[1].C + "")) set_data_dev(t15, t15_value);
    			if (dirty & /*curveNumbers*/ 2 && t17_value !== (t17_value = /*curveNumbers*/ ctx[1].D + "")) set_data_dev(t17, t17_value);
    			if (dirty & /*curveNumbers*/ 2 && t19_value !== (t19_value = /*curveNumbers*/ ctx[1].E + "")) set_data_dev(t19, t19_value);

    			if (dirty & /*origin*/ 1) {
    				set_input_value(input5, /*origin*/ ctx[0].x);
    			}

    			if (dirty & /*origin*/ 1 && t24_value !== (t24_value = /*origin*/ ctx[0].x + "")) set_data_dev(t24, t24_value);

    			if (dirty & /*origin*/ 1) {
    				set_input_value(input6, /*origin*/ ctx[0].y);
    			}

    			if (dirty & /*origin*/ 1 && t28_value !== (t28_value = /*origin*/ ctx[0].y + "")) set_data_dev(t28, t28_value);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			/*canvas0_binding*/ ctx[7](null);
    			/*canvas1_binding*/ ctx[8](null);
    			/*canvas2_binding*/ ctx[9](null);
    			/*div0_binding*/ ctx[10](null);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(br0);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(div2);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Canvas', slots, []);
    	let gridCanvas, curveCanvas, mouseCanvas, grid, curve, mouse, container;
    	const CANVAS_HEIGHT = window.innerHeight - 200;
    	const CANVAS_WIDTH = window.innerWidth - 100;

    	let settings = {
    		mouse: { x: 0, y: 0 },
    		width: CANVAS_WIDTH,
    		height: CANVAS_HEIGHT
    	};

    	let origin = { x: 0, y: 0 };
    	let curveNumbers = { A: 40, B: 3, C: 85, D: 17, E: 100 };

    	onMount(() => {
    		$$invalidate(2, gridCanvas.width = CANVAS_WIDTH, gridCanvas);
    		$$invalidate(3, curveCanvas.width = CANVAS_WIDTH, curveCanvas);
    		$$invalidate(4, mouseCanvas.width = CANVAS_WIDTH, mouseCanvas);
    		$$invalidate(2, gridCanvas.height = CANVAS_HEIGHT, gridCanvas);
    		$$invalidate(3, curveCanvas.height = CANVAS_HEIGHT, curveCanvas);
    		$$invalidate(4, mouseCanvas.height = CANVAS_HEIGHT, mouseCanvas);
    		grid = gridCanvas.getContext("2d");
    		$$invalidate(6, curve = curveCanvas.getContext("2d"));
    		mouse = mouseCanvas.getContext("2d");
    		drawGrid(grid, CANVAS_HEIGHT, CANVAS_WIDTH, 10, "rgba(0, 100, 255, 0.15)");
    		drawGrid(grid, CANVAS_HEIGHT, CANVAS_WIDTH, 50, "rgba(255, 150, 0, 0.4)");
    		drawCurveLayer(curve, settings);
    	});

    	document.onmousemove = e => {
    		const x = e.clientX - container.offsetLeft;
    		const y = e.clientY - container.offsetTop;
    		settings.mouse.x = x;
    		settings.mouse.y = y;
    		mouse.clearRect(0, 0, settings.width, settings.height);

    		if (x >= 0 && x <= CANVAS_WIDTH && y >= 0 && y <= CANVAS_HEIGHT) {
    			console.log('updating mouse');
    			drawMouseLayer(mouse, settings);
    		}
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<Canvas> was created with unknown prop '${key}'`);
    	});

    	function canvas0_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			gridCanvas = $$value;
    			$$invalidate(2, gridCanvas);
    		});
    	}

    	function canvas1_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			curveCanvas = $$value;
    			$$invalidate(3, curveCanvas);
    		});
    	}

    	function canvas2_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			mouseCanvas = $$value;
    			$$invalidate(4, mouseCanvas);
    		});
    	}

    	function div0_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			container = $$value;
    			$$invalidate(5, container);
    		});
    	}

    	function input0_change_input_handler() {
    		curveNumbers.A = to_number(this.value);
    		$$invalidate(1, curveNumbers);
    	}

    	function input1_change_input_handler() {
    		curveNumbers.B = to_number(this.value);
    		$$invalidate(1, curveNumbers);
    	}

    	function input2_change_input_handler() {
    		curveNumbers.C = to_number(this.value);
    		$$invalidate(1, curveNumbers);
    	}

    	function input3_change_input_handler() {
    		curveNumbers.D = to_number(this.value);
    		$$invalidate(1, curveNumbers);
    	}

    	function input4_change_input_handler() {
    		curveNumbers.E = to_number(this.value);
    		$$invalidate(1, curveNumbers);
    	}

    	function input5_change_input_handler() {
    		origin.x = to_number(this.value);
    		$$invalidate(0, origin);
    	}

    	function input6_change_input_handler() {
    		origin.y = to_number(this.value);
    		$$invalidate(0, origin);
    	}

    	$$self.$capture_state = () => ({
    		onMount,
    		drawMouseLayer,
    		drawCurveLayer,
    		drawGrid,
    		gridCanvas,
    		curveCanvas,
    		mouseCanvas,
    		grid,
    		curve,
    		mouse,
    		container,
    		CANVAS_HEIGHT,
    		CANVAS_WIDTH,
    		settings,
    		origin,
    		curveNumbers
    	});

    	$$self.$inject_state = $$props => {
    		if ('gridCanvas' in $$props) $$invalidate(2, gridCanvas = $$props.gridCanvas);
    		if ('curveCanvas' in $$props) $$invalidate(3, curveCanvas = $$props.curveCanvas);
    		if ('mouseCanvas' in $$props) $$invalidate(4, mouseCanvas = $$props.mouseCanvas);
    		if ('grid' in $$props) grid = $$props.grid;
    		if ('curve' in $$props) $$invalidate(6, curve = $$props.curve);
    		if ('mouse' in $$props) mouse = $$props.mouse;
    		if ('container' in $$props) $$invalidate(5, container = $$props.container);
    		if ('settings' in $$props) settings = $$props.settings;
    		if ('origin' in $$props) $$invalidate(0, origin = $$props.origin);
    		if ('curveNumbers' in $$props) $$invalidate(1, curveNumbers = $$props.curveNumbers);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*curve, curveNumbers, origin*/ 67) {
    			if (curve) {
    				console.log('updating curve');
    				curve.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    				drawCurveLayer(curve, curveNumbers, origin);
    			}
    		}
    	};

    	return [
    		origin,
    		curveNumbers,
    		gridCanvas,
    		curveCanvas,
    		mouseCanvas,
    		container,
    		curve,
    		canvas0_binding,
    		canvas1_binding,
    		canvas2_binding,
    		div0_binding,
    		input0_change_input_handler,
    		input1_change_input_handler,
    		input2_change_input_handler,
    		input3_change_input_handler,
    		input4_change_input_handler,
    		input5_change_input_handler,
    		input6_change_input_handler
    	];
    }

    class Canvas extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Canvas",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    //import App from './App.svelte';

    const app = new Canvas({
      target: document.body,
      props: {
        name: "world",
      },
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
