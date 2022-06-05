
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

    const circle = (x, y, ctx, color = "red", radius = 3) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fill();
    };

    const cursorHelper = (x, y, ctx) => {
      ctx.fillStyle = "red";
      ctx.fillRect(0, y - 2, 10, 4);
      ctx.fillRect(x - 2, 0, 4, 10);
      ctx.strokeStyle = "black";
      ctx.strokeText(`${x}`, x + 15, 10);
      ctx.strokeText(`${y}`, 15, y + 10);
    };

    const findPoints = (myFunction, start = 0, end = 1500, precision = 0.2) => {
      let points = [];
      for (let i = start; i < end; i += precision) {
        points.push({ x: i, y: myFunction(i) });
      }
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
      showPoints = false
    ) => {
      ctx.strokeStyle = color;
      if (showPoints) {
        for (const point of points) {
          circle(point.x, point.y, ctx, color);
        }
      }
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);

      for (const point of points) {
        ctx.lineTo(point.x, point.y);
      }
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    };

    const drawGlide = (ctx, x, y) => {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(x * 10, y * 10);
      ctx.strokeStyle = "red";
      ctx.lineWidth = 1;
      ctx.stroke();
    };

    const draw = (ctx, settings) => {
      ctx.clearRect(0, 0, settings.width, settings.height);
      drawGrid(ctx, settings.height, settings.width, 10, "rgba(0, 100, 255, 0.15)");
      drawGrid(ctx, settings.height, settings.width, 50, "rgba(255, 150, 0, 0.4)");
      cursorHelper(settings.mouseX, settings.mouseY, ctx);

      let testFunction = (i) => {
        return (
          Math.cos((i - settings.D) / settings.C) * settings.A +
          settings.E +
          i / settings.B
        )
      };
      let curvePoints = findPoints(testFunction, 150, 460, 10);
      let lightPoints = findPoints(testFunction, 0, 1500, 10);
      drawCurve(ctx, lightPoints, "rgba(0,0,255,0.1)", 5);
      drawCurve(ctx, curvePoints, "blue", 5);
      if (settings.mouseX < 450 && settings.mouseX > 150) {
        circle(settings.mouseX, testFunction(settings.mouseX), ctx, "red");
        drawGlide(ctx, settings.mouseX, testFunction(settings.mouseX));
      }
    };

    /* src/Canvas.svelte generated by Svelte v3.48.0 */
    const file = "src/Canvas.svelte";

    function create_fragment(ctx) {
    	let canvas_1;
    	let t0;
    	let br0;
    	let t1;
    	let input0;
    	let t2;
    	let input1;
    	let t3;
    	let input2;
    	let t4;
    	let input3;
    	let t5;
    	let input4;
    	let t6;
    	let br1;
    	let t7;
    	let t8_value = /*settings*/ ctx[1].A + "";
    	let t8;
    	let t9;
    	let t10_value = /*settings*/ ctx[1].B + "";
    	let t10;
    	let t11;
    	let t12_value = /*settings*/ ctx[1].C + "";
    	let t12;
    	let t13;
    	let t14_value = /*settings*/ ctx[1].D + "";
    	let t14;
    	let t15;
    	let t16_value = /*settings*/ ctx[1].E + "";
    	let t16;
    	let t17;
    	let br2;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			canvas_1 = element("canvas");
    			t0 = space();
    			br0 = element("br");
    			t1 = text("\nA: ");
    			input0 = element("input");
    			t2 = text("\nB: ");
    			input1 = element("input");
    			t3 = text("\nC: ");
    			input2 = element("input");
    			t4 = text("\nD:");
    			input3 = element("input");
    			t5 = text("\nE:");
    			input4 = element("input");
    			t6 = space();
    			br1 = element("br");
    			t7 = text("\nA: ");
    			t8 = text(t8_value);
    			t9 = text("\nB: ");
    			t10 = text(t10_value);
    			t11 = text("\nC: ");
    			t12 = text(t12_value);
    			t13 = text("\nD: ");
    			t14 = text(t14_value);
    			t15 = text("\nD: ");
    			t16 = text(t16_value);
    			t17 = space();
    			br2 = element("br");
    			attr_dev(canvas_1, "id", "canvas");
    			attr_dev(canvas_1, "class", "svelte-1wrfk9w");
    			add_location(canvas_1, file, 34, 0, 764);
    			add_location(br0, file, 35, 0, 814);
    			attr_dev(input0, "type", "range");
    			attr_dev(input0, "min", "0");
    			attr_dev(input0, "max", "100");
    			add_location(input0, file, 36, 3, 822);
    			attr_dev(input1, "type", "range");
    			attr_dev(input1, "min", "1");
    			attr_dev(input1, "max", "10");
    			attr_dev(input1, "step", "0.1");
    			add_location(input1, file, 37, 3, 885);
    			attr_dev(input2, "type", "range");
    			attr_dev(input2, "min", "20");
    			attr_dev(input2, "max", "120");
    			add_location(input2, file, 38, 3, 956);
    			attr_dev(input3, "type", "range");
    			attr_dev(input3, "min", "0");
    			attr_dev(input3, "max", "100");
    			add_location(input3, file, 39, 2, 1019);
    			attr_dev(input4, "type", "range");
    			attr_dev(input4, "min", "0");
    			attr_dev(input4, "max", "200");
    			add_location(input4, file, 40, 2, 1081);
    			add_location(br1, file, 41, 0, 1141);
    			add_location(br2, file, 47, 0, 1226);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, canvas_1, anchor);
    			/*canvas_1_binding*/ ctx[2](canvas_1);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, br0, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, input0, anchor);
    			set_input_value(input0, /*settings*/ ctx[1].A);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, input1, anchor);
    			set_input_value(input1, /*settings*/ ctx[1].B);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, input2, anchor);
    			set_input_value(input2, /*settings*/ ctx[1].C);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, input3, anchor);
    			set_input_value(input3, /*settings*/ ctx[1].D);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, input4, anchor);
    			set_input_value(input4, /*settings*/ ctx[1].E);
    			insert_dev(target, t6, anchor);
    			insert_dev(target, br1, anchor);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, t8, anchor);
    			insert_dev(target, t9, anchor);
    			insert_dev(target, t10, anchor);
    			insert_dev(target, t11, anchor);
    			insert_dev(target, t12, anchor);
    			insert_dev(target, t13, anchor);
    			insert_dev(target, t14, anchor);
    			insert_dev(target, t15, anchor);
    			insert_dev(target, t16, anchor);
    			insert_dev(target, t17, anchor);
    			insert_dev(target, br2, anchor);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "change", /*input0_change_input_handler*/ ctx[3]),
    					listen_dev(input0, "input", /*input0_change_input_handler*/ ctx[3]),
    					listen_dev(input1, "change", /*input1_change_input_handler*/ ctx[4]),
    					listen_dev(input1, "input", /*input1_change_input_handler*/ ctx[4]),
    					listen_dev(input2, "change", /*input2_change_input_handler*/ ctx[5]),
    					listen_dev(input2, "input", /*input2_change_input_handler*/ ctx[5]),
    					listen_dev(input3, "change", /*input3_change_input_handler*/ ctx[6]),
    					listen_dev(input3, "input", /*input3_change_input_handler*/ ctx[6]),
    					listen_dev(input4, "change", /*input4_change_input_handler*/ ctx[7]),
    					listen_dev(input4, "input", /*input4_change_input_handler*/ ctx[7])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*settings*/ 2) {
    				set_input_value(input0, /*settings*/ ctx[1].A);
    			}

    			if (dirty & /*settings*/ 2) {
    				set_input_value(input1, /*settings*/ ctx[1].B);
    			}

    			if (dirty & /*settings*/ 2) {
    				set_input_value(input2, /*settings*/ ctx[1].C);
    			}

    			if (dirty & /*settings*/ 2) {
    				set_input_value(input3, /*settings*/ ctx[1].D);
    			}

    			if (dirty & /*settings*/ 2) {
    				set_input_value(input4, /*settings*/ ctx[1].E);
    			}

    			if (dirty & /*settings*/ 2 && t8_value !== (t8_value = /*settings*/ ctx[1].A + "")) set_data_dev(t8, t8_value);
    			if (dirty & /*settings*/ 2 && t10_value !== (t10_value = /*settings*/ ctx[1].B + "")) set_data_dev(t10, t10_value);
    			if (dirty & /*settings*/ 2 && t12_value !== (t12_value = /*settings*/ ctx[1].C + "")) set_data_dev(t12, t12_value);
    			if (dirty & /*settings*/ 2 && t14_value !== (t14_value = /*settings*/ ctx[1].D + "")) set_data_dev(t14, t14_value);
    			if (dirty & /*settings*/ 2 && t16_value !== (t16_value = /*settings*/ ctx[1].E + "")) set_data_dev(t16, t16_value);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(canvas_1);
    			/*canvas_1_binding*/ ctx[2](null);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(br0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(input0);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(input1);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(input2);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(input3);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(input4);
    			if (detaching) detach_dev(t6);
    			if (detaching) detach_dev(br1);
    			if (detaching) detach_dev(t7);
    			if (detaching) detach_dev(t8);
    			if (detaching) detach_dev(t9);
    			if (detaching) detach_dev(t10);
    			if (detaching) detach_dev(t11);
    			if (detaching) detach_dev(t12);
    			if (detaching) detach_dev(t13);
    			if (detaching) detach_dev(t14);
    			if (detaching) detach_dev(t15);
    			if (detaching) detach_dev(t16);
    			if (detaching) detach_dev(t17);
    			if (detaching) detach_dev(br2);
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
    	let canvas, ctx;
    	const CANVAS_HEIGHT = window.innerHeight - 100;
    	const CANVAS_WIDTH = window.innerWidth - 100;

    	let settings = {
    		mouseX: null,
    		mouseY: null,
    		A: 50,
    		B: 3,
    		C: 85,
    		D: 17,
    		E: 100,
    		width: CANVAS_WIDTH,
    		height: CANVAS_HEIGHT
    	};

    	onMount(() => {
    		$$invalidate(0, canvas.width = CANVAS_WIDTH, canvas);
    		$$invalidate(0, canvas.height = CANVAS_HEIGHT, canvas);
    		ctx = canvas.getContext("2d");
    		draw(ctx, settings);
    	});

    	document.onmousemove = e => {
    		$$invalidate(1, settings.mouseX = e.clientX - canvas.offsetLeft, settings);
    		$$invalidate(1, settings.mouseY = e.clientY - canvas.offsetTop, settings);
    		draw(ctx, settings);
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Canvas> was created with unknown prop '${key}'`);
    	});

    	function canvas_1_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			canvas = $$value;
    			$$invalidate(0, canvas);
    		});
    	}

    	function input0_change_input_handler() {
    		settings.A = to_number(this.value);
    		$$invalidate(1, settings);
    	}

    	function input1_change_input_handler() {
    		settings.B = to_number(this.value);
    		$$invalidate(1, settings);
    	}

    	function input2_change_input_handler() {
    		settings.C = to_number(this.value);
    		$$invalidate(1, settings);
    	}

    	function input3_change_input_handler() {
    		settings.D = to_number(this.value);
    		$$invalidate(1, settings);
    	}

    	function input4_change_input_handler() {
    		settings.E = to_number(this.value);
    		$$invalidate(1, settings);
    	}

    	$$self.$capture_state = () => ({
    		onMount,
    		draw,
    		canvas,
    		ctx,
    		CANVAS_HEIGHT,
    		CANVAS_WIDTH,
    		settings
    	});

    	$$self.$inject_state = $$props => {
    		if ('canvas' in $$props) $$invalidate(0, canvas = $$props.canvas);
    		if ('ctx' in $$props) ctx = $$props.ctx;
    		if ('settings' in $$props) $$invalidate(1, settings = $$props.settings);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		canvas,
    		settings,
    		canvas_1_binding,
    		input0_change_input_handler,
    		input1_change_input_handler,
    		input2_change_input_handler,
    		input3_change_input_handler,
    		input4_change_input_handler
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
