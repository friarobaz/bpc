
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
      ctx.strokeStyle = "black";
      ctx.stroke();
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

    const drawGlide = (ctx, x, y, origin, color = "red") => {
      if (!origin) return
      (x - origin.x) / (y - origin.y);
      ctx.beginPath();
      ctx.moveTo(origin.x, origin.y);
      ctx.lineTo(x + (x - origin.x) * 5, y + (y - origin.y) * 5);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.stroke();
    };

    const drawMouseLayer = (ctx, mouseCoordinates, origin, curve) => {
      cursorHelper(ctx, mouseCoordinates.x, mouseCoordinates.y);
      const curveFunction = (i) => {
        return Math.cos((i - curve.D) / curve.C) * curve.A + curve.E + i / curve.B
      };
      if (mouseCoordinates.x > 150 && mouseCoordinates.x < 350) {
        drawGlide(
          ctx,
          mouseCoordinates.x,
          curveFunction(mouseCoordinates.x),
          origin,
          "green"
        );
        circle(ctx, mouseCoordinates.x, curveFunction(mouseCoordinates.x), "green");
      }
    };

    const drawCurveLayer = (
      ctx,
      curve,
      origin,
      showEntireCurve = false,
      showAllPTV
    ) => {
      const curveFunction = (i) => {
        return Math.cos((i - curve.D) / curve.C) * curve.A + curve.E + i / curve.B
      };
      const mainCurvePoints = findPoints(curveFunction, 150, 350, 2, origin);
      const allCurvePoints = findPoints(curveFunction, 0, 1500, 10);
      const heavyCurvePoints = mainCurvePoints.map((p) => ({
        x: p.x * 1.5,
        y: p.y * 1.5,
        bestGlide: p.bestGlide,
      }));
      const lightCurvePoints = mainCurvePoints.map((p) => ({
        x: p.x / 1.5,
        y: p.y / 1.5,
        bestGlide: p.bestGlide,
      }));
      if (showEntireCurve) {
        drawCurve(ctx, allCurvePoints, "rgba(0,0,255,0.1)", 5, origin, false);
      }
      if (showAllPTV) {
        drawCurve(ctx, heavyCurvePoints, "purple", 5, origin);
        drawCurve(ctx, lightCurvePoints, "cyan", 5, origin);
      }
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

    // (89:4) {#if showCurveControls}
    function create_if_block(ctx) {
    	let t0;
    	let input0;
    	let t1;
    	let input1;
    	let t2;
    	let input2;
    	let t3;
    	let input3;
    	let t4;
    	let input4;
    	let t5;
    	let br0;
    	let t6;
    	let t7_value = /*curveNumbers*/ ctx[1].A + "";
    	let t7;
    	let t8;
    	let t9_value = /*curveNumbers*/ ctx[1].B + "";
    	let t9;
    	let t10;
    	let t11_value = /*curveNumbers*/ ctx[1].C + "";
    	let t11;
    	let t12;
    	let t13_value = /*curveNumbers*/ ctx[1].D + "";
    	let t13;
    	let t14;
    	let t15_value = /*curveNumbers*/ ctx[1].E + "";
    	let t15;
    	let t16;
    	let br1;
    	let t17;
    	let div;
    	let t18;
    	let input5;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			t0 = text("A: ");
    			input0 = element("input");
    			t1 = text("\n            B: ");
    			input1 = element("input");
    			t2 = text("\n            C: ");
    			input2 = element("input");
    			t3 = text("\n            D:");
    			input3 = element("input");
    			t4 = text("\n            E:");
    			input4 = element("input");
    			t5 = space();
    			br0 = element("br");
    			t6 = text("\n            A: ");
    			t7 = text(t7_value);
    			t8 = text("\n            B: ");
    			t9 = text(t9_value);
    			t10 = text("\n            C: ");
    			t11 = text(t11_value);
    			t12 = text("\n            D: ");
    			t13 = text(t13_value);
    			t14 = text("\n            E: ");
    			t15 = text(t15_value);
    			t16 = space();
    			br1 = element("br");
    			t17 = space();
    			div = element("div");
    			t18 = text("Montrer toute la courbe : \n                ");
    			input5 = element("input");
    			attr_dev(input0, "type", "range");
    			attr_dev(input0, "min", "0");
    			attr_dev(input0, "max", "100");
    			add_location(input0, file, 91, 15, 2919);
    			attr_dev(input1, "type", "range");
    			attr_dev(input1, "min", "1");
    			attr_dev(input1, "max", "10");
    			attr_dev(input1, "step", "0.1");
    			add_location(input1, file, 92, 15, 2997);
    			attr_dev(input2, "type", "range");
    			attr_dev(input2, "min", "40");
    			attr_dev(input2, "max", "120");
    			add_location(input2, file, 93, 15, 3084);
    			attr_dev(input3, "type", "range");
    			attr_dev(input3, "min", "0");
    			attr_dev(input3, "max", "1000");
    			add_location(input3, file, 94, 14, 3163);
    			attr_dev(input4, "type", "range");
    			attr_dev(input4, "min", "0");
    			attr_dev(input4, "max", "200");
    			add_location(input4, file, 95, 14, 3242);
    			add_location(br0, file, 96, 12, 3318);
    			add_location(br1, file, 102, 12, 3495);
    			attr_dev(input5, "type", "checkbox");
    			add_location(input5, file, 106, 16, 3590);
    			add_location(div, file, 104, 12, 3525);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, input0, anchor);
    			set_input_value(input0, /*curveNumbers*/ ctx[1].A);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, input1, anchor);
    			set_input_value(input1, /*curveNumbers*/ ctx[1].B);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, input2, anchor);
    			set_input_value(input2, /*curveNumbers*/ ctx[1].C);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, input3, anchor);
    			set_input_value(input3, /*curveNumbers*/ ctx[1].D);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, input4, anchor);
    			set_input_value(input4, /*curveNumbers*/ ctx[1].E);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, br0, anchor);
    			insert_dev(target, t6, anchor);
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
    			insert_dev(target, br1, anchor);
    			insert_dev(target, t17, anchor);
    			insert_dev(target, div, anchor);
    			append_dev(div, t18);
    			append_dev(div, input5);
    			input5.checked = /*showEntireCurve*/ ctx[2];

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "change", /*input0_change_input_handler_1*/ ctx[19]),
    					listen_dev(input0, "input", /*input0_change_input_handler_1*/ ctx[19]),
    					listen_dev(input1, "change", /*input1_change_input_handler_1*/ ctx[20]),
    					listen_dev(input1, "input", /*input1_change_input_handler_1*/ ctx[20]),
    					listen_dev(input2, "change", /*input2_change_input_handler*/ ctx[21]),
    					listen_dev(input2, "input", /*input2_change_input_handler*/ ctx[21]),
    					listen_dev(input3, "change", /*input3_change_input_handler*/ ctx[22]),
    					listen_dev(input3, "input", /*input3_change_input_handler*/ ctx[22]),
    					listen_dev(input4, "change", /*input4_change_input_handler*/ ctx[23]),
    					listen_dev(input4, "input", /*input4_change_input_handler*/ ctx[23]),
    					listen_dev(input5, "change", /*input5_change_handler*/ ctx[24])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*curveNumbers*/ 2) {
    				set_input_value(input0, /*curveNumbers*/ ctx[1].A);
    			}

    			if (dirty[0] & /*curveNumbers*/ 2) {
    				set_input_value(input1, /*curveNumbers*/ ctx[1].B);
    			}

    			if (dirty[0] & /*curveNumbers*/ 2) {
    				set_input_value(input2, /*curveNumbers*/ ctx[1].C);
    			}

    			if (dirty[0] & /*curveNumbers*/ 2) {
    				set_input_value(input3, /*curveNumbers*/ ctx[1].D);
    			}

    			if (dirty[0] & /*curveNumbers*/ 2) {
    				set_input_value(input4, /*curveNumbers*/ ctx[1].E);
    			}

    			if (dirty[0] & /*curveNumbers*/ 2 && t7_value !== (t7_value = /*curveNumbers*/ ctx[1].A + "")) set_data_dev(t7, t7_value);
    			if (dirty[0] & /*curveNumbers*/ 2 && t9_value !== (t9_value = /*curveNumbers*/ ctx[1].B + "")) set_data_dev(t9, t9_value);
    			if (dirty[0] & /*curveNumbers*/ 2 && t11_value !== (t11_value = /*curveNumbers*/ ctx[1].C + "")) set_data_dev(t11, t11_value);
    			if (dirty[0] & /*curveNumbers*/ 2 && t13_value !== (t13_value = /*curveNumbers*/ ctx[1].D + "")) set_data_dev(t13, t13_value);
    			if (dirty[0] & /*curveNumbers*/ 2 && t15_value !== (t15_value = /*curveNumbers*/ ctx[1].E + "")) set_data_dev(t15, t15_value);

    			if (dirty[0] & /*showEntireCurve*/ 4) {
    				input5.checked = /*showEntireCurve*/ ctx[2];
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(input0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(input1);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(input2);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(input3);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(input4);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(br0);
    			if (detaching) detach_dev(t6);
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
    			if (detaching) detach_dev(br1);
    			if (detaching) detach_dev(t17);
    			if (detaching) detach_dev(div);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(89:4) {#if showCurveControls}",
    		ctx
    	});

    	return block;
    }

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
    	let div1;
    	let t4;
    	let input0;
    	let t5;
    	let t6_value = /*origin*/ ctx[0].x + "";
    	let t6;
    	let t7;
    	let br1;
    	let t8;
    	let input1;
    	let t9;
    	let t10_value = /*origin*/ ctx[0].y + "";
    	let t10;
    	let t11;
    	let br2;
    	let t12;
    	let button;
    	let t14;
    	let br3;
    	let t15;
    	let input2;
    	let t16;
    	let br4;
    	let t17;
    	let input3;
    	let t18;
    	let br5;
    	let t19;
    	let mounted;
    	let dispose;
    	let if_block = /*showCurveControls*/ ctx[8] && create_if_block(ctx);

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
    			div1 = element("div");
    			t4 = text("Vent de face:");
    			input0 = element("input");
    			t5 = space();
    			t6 = text(t6_value);
    			t7 = space();
    			br1 = element("br");
    			t8 = text("\n        Thermique:");
    			input1 = element("input");
    			t9 = space();
    			t10 = text(t10_value);
    			t11 = space();
    			br2 = element("br");
    			t12 = space();
    			button = element("button");
    			button.textContent = "Reinitialiser";
    			t14 = space();
    			br3 = element("br");
    			t15 = text("\n      Montrer différentes charges alaires : \n");
    			input2 = element("input");
    			t16 = space();
    			br4 = element("br");
    			t17 = text("\n    Modifier la polaire : \n");
    			input3 = element("input");
    			t18 = space();
    			br5 = element("br");
    			t19 = space();
    			if (if_block) if_block.c();
    			attr_dev(canvas0, "id", "grid");
    			attr_dev(canvas0, "class", "svelte-wzchmf");
    			add_location(canvas0, file, 67, 1, 2205);
    			attr_dev(canvas1, "id", "curve");
    			attr_dev(canvas1, "class", "svelte-wzchmf");
    			add_location(canvas1, file, 68, 1, 2257);
    			attr_dev(canvas2, "id", "mouse");
    			attr_dev(canvas2, "class", "svelte-wzchmf");
    			add_location(canvas2, file, 69, 1, 2311);
    			attr_dev(div0, "id", "container");
    			attr_dev(div0, "class", "svelte-wzchmf");
    			add_location(div0, file, 66, 0, 2161);
    			add_location(br0, file, 72, 0, 2372);
    			attr_dev(input0, "type", "range");
    			attr_dev(input0, "min", "-300");
    			attr_dev(input0, "max", "200");
    			add_location(input0, file, 76, 21, 2425);
    			add_location(br1, file, 76, 93, 2497);
    			attr_dev(input1, "type", "range");
    			attr_dev(input1, "min", "-100");
    			attr_dev(input1, "max", "100");
    			add_location(input1, file, 77, 18, 2520);
    			add_location(div1, file, 75, 0, 2398);
    			add_location(br2, file, 79, 4, 2607);
    			add_location(button, file, 80, 4, 2616);
    			add_location(br3, file, 81, 4, 2668);
    			attr_dev(input2, "type", "checkbox");
    			add_location(input2, file, 83, 0, 2718);
    			add_location(br4, file, 84, 0, 2768);
    			attr_dev(input3, "type", "checkbox");
    			add_location(input3, file, 86, 0, 2800);
    			add_location(br5, file, 87, 0, 2857);
    			attr_dev(div2, "id", "controls");
    			attr_dev(div2, "class", "svelte-wzchmf");
    			add_location(div2, file, 73, 0, 2377);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			append_dev(div0, canvas0);
    			/*canvas0_binding*/ ctx[11](canvas0);
    			append_dev(div0, t0);
    			append_dev(div0, canvas1);
    			/*canvas1_binding*/ ctx[12](canvas1);
    			append_dev(div0, t1);
    			append_dev(div0, canvas2);
    			/*canvas2_binding*/ ctx[13](canvas2);
    			/*div0_binding*/ ctx[14](div0);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, br0, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div1);
    			append_dev(div1, t4);
    			append_dev(div1, input0);
    			set_input_value(input0, /*origin*/ ctx[0].x);
    			append_dev(div1, t5);
    			append_dev(div1, t6);
    			append_dev(div1, t7);
    			append_dev(div1, br1);
    			append_dev(div1, t8);
    			append_dev(div1, input1);
    			set_input_value(input1, /*origin*/ ctx[0].y);
    			append_dev(div1, t9);
    			append_dev(div1, t10);
    			append_dev(div2, t11);
    			append_dev(div2, br2);
    			append_dev(div2, t12);
    			append_dev(div2, button);
    			append_dev(div2, t14);
    			append_dev(div2, br3);
    			append_dev(div2, t15);
    			append_dev(div2, input2);
    			input2.checked = /*showAllPTV*/ ctx[3];
    			append_dev(div2, t16);
    			append_dev(div2, br4);
    			append_dev(div2, t17);
    			append_dev(div2, input3);
    			input3.checked = /*showCurveControls*/ ctx[8];
    			append_dev(div2, t18);
    			append_dev(div2, br5);
    			append_dev(div2, t19);
    			if (if_block) if_block.m(div2, null);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "change", /*input0_change_input_handler*/ ctx[15]),
    					listen_dev(input0, "input", /*input0_change_input_handler*/ ctx[15]),
    					listen_dev(input1, "change", /*input1_change_input_handler*/ ctx[16]),
    					listen_dev(input1, "input", /*input1_change_input_handler*/ ctx[16]),
    					listen_dev(button, "click", /*reset*/ ctx[9], false, false, false),
    					listen_dev(input2, "change", /*input2_change_handler*/ ctx[17]),
    					listen_dev(input3, "change", /*input3_change_handler*/ ctx[18])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*origin*/ 1) {
    				set_input_value(input0, /*origin*/ ctx[0].x);
    			}

    			if (dirty[0] & /*origin*/ 1 && t6_value !== (t6_value = /*origin*/ ctx[0].x + "")) set_data_dev(t6, t6_value);

    			if (dirty[0] & /*origin*/ 1) {
    				set_input_value(input1, /*origin*/ ctx[0].y);
    			}

    			if (dirty[0] & /*origin*/ 1 && t10_value !== (t10_value = /*origin*/ ctx[0].y + "")) set_data_dev(t10, t10_value);

    			if (dirty[0] & /*showAllPTV*/ 8) {
    				input2.checked = /*showAllPTV*/ ctx[3];
    			}

    			if (dirty[0] & /*showCurveControls*/ 256) {
    				input3.checked = /*showCurveControls*/ ctx[8];
    			}

    			if (/*showCurveControls*/ ctx[8]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(div2, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			/*canvas0_binding*/ ctx[11](null);
    			/*canvas1_binding*/ ctx[12](null);
    			/*canvas2_binding*/ ctx[13](null);
    			/*div0_binding*/ ctx[14](null);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(br0);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(div2);
    			if (if_block) if_block.d();
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
    		width: CANVAS_WIDTH,
    		height: CANVAS_HEIGHT
    	};

    	const defaultCurveNumbers = { A: 58, B: 3, C: 85, D: 500, E: 90 };
    	let mouseCoordinates = { x: 0, y: 0 };
    	let origin = { x: 0, y: 0 };
    	let curveNumbers = structuredClone(defaultCurveNumbers);
    	let showEntireCurve = false;
    	let showCurveControls = false;
    	let showAllPTV = true;

    	onMount(() => {
    		$$invalidate(4, gridCanvas.width = CANVAS_WIDTH, gridCanvas);
    		$$invalidate(5, curveCanvas.width = CANVAS_WIDTH, curveCanvas);
    		$$invalidate(6, mouseCanvas.width = CANVAS_WIDTH, mouseCanvas);
    		$$invalidate(4, gridCanvas.height = CANVAS_HEIGHT, gridCanvas);
    		$$invalidate(5, curveCanvas.height = CANVAS_HEIGHT, curveCanvas);
    		$$invalidate(6, mouseCanvas.height = CANVAS_HEIGHT, mouseCanvas);
    		grid = gridCanvas.getContext("2d");
    		$$invalidate(10, curve = curveCanvas.getContext("2d"));
    		mouse = mouseCanvas.getContext("2d");
    		drawGrid(grid, CANVAS_HEIGHT, CANVAS_WIDTH, 10, "rgba(0, 100, 255, 0.15)");
    		drawGrid(grid, CANVAS_HEIGHT, CANVAS_WIDTH, 50, "rgba(255, 150, 0, 0.4)");
    		drawCurveLayer(curve, settings);
    	});

    	document.onmousemove = e => {
    		const x = e.clientX - container.offsetLeft;
    		const y = e.clientY - container.offsetTop;
    		mouseCoordinates.x = x;
    		mouseCoordinates.y = y;
    		mouse.clearRect(0, 0, settings.width, settings.height);

    		if (x >= 0 && x <= CANVAS_WIDTH && y >= 0 && y <= CANVAS_HEIGHT) {
    			console.log('updating mouse');
    			drawMouseLayer(mouse, mouseCoordinates, origin, curveNumbers);
    		}
    	};

    	const reset = () => {
    		$$invalidate(0, origin = { x: 0, y: 0 });
    		$$invalidate(1, curveNumbers = structuredClone(defaultCurveNumbers));
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<Canvas> was created with unknown prop '${key}'`);
    	});

    	function canvas0_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			gridCanvas = $$value;
    			$$invalidate(4, gridCanvas);
    		});
    	}

    	function canvas1_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			curveCanvas = $$value;
    			$$invalidate(5, curveCanvas);
    		});
    	}

    	function canvas2_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			mouseCanvas = $$value;
    			$$invalidate(6, mouseCanvas);
    		});
    	}

    	function div0_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			container = $$value;
    			$$invalidate(7, container);
    		});
    	}

    	function input0_change_input_handler() {
    		origin.x = to_number(this.value);
    		$$invalidate(0, origin);
    	}

    	function input1_change_input_handler() {
    		origin.y = to_number(this.value);
    		$$invalidate(0, origin);
    	}

    	function input2_change_handler() {
    		showAllPTV = this.checked;
    		$$invalidate(3, showAllPTV);
    	}

    	function input3_change_handler() {
    		showCurveControls = this.checked;
    		$$invalidate(8, showCurveControls);
    	}

    	function input0_change_input_handler_1() {
    		curveNumbers.A = to_number(this.value);
    		$$invalidate(1, curveNumbers);
    	}

    	function input1_change_input_handler_1() {
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

    	function input5_change_handler() {
    		showEntireCurve = this.checked;
    		$$invalidate(2, showEntireCurve);
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
    		defaultCurveNumbers,
    		mouseCoordinates,
    		origin,
    		curveNumbers,
    		showEntireCurve,
    		showCurveControls,
    		showAllPTV,
    		reset
    	});

    	$$self.$inject_state = $$props => {
    		if ('gridCanvas' in $$props) $$invalidate(4, gridCanvas = $$props.gridCanvas);
    		if ('curveCanvas' in $$props) $$invalidate(5, curveCanvas = $$props.curveCanvas);
    		if ('mouseCanvas' in $$props) $$invalidate(6, mouseCanvas = $$props.mouseCanvas);
    		if ('grid' in $$props) grid = $$props.grid;
    		if ('curve' in $$props) $$invalidate(10, curve = $$props.curve);
    		if ('mouse' in $$props) mouse = $$props.mouse;
    		if ('container' in $$props) $$invalidate(7, container = $$props.container);
    		if ('settings' in $$props) settings = $$props.settings;
    		if ('mouseCoordinates' in $$props) mouseCoordinates = $$props.mouseCoordinates;
    		if ('origin' in $$props) $$invalidate(0, origin = $$props.origin);
    		if ('curveNumbers' in $$props) $$invalidate(1, curveNumbers = $$props.curveNumbers);
    		if ('showEntireCurve' in $$props) $$invalidate(2, showEntireCurve = $$props.showEntireCurve);
    		if ('showCurveControls' in $$props) $$invalidate(8, showCurveControls = $$props.showCurveControls);
    		if ('showAllPTV' in $$props) $$invalidate(3, showAllPTV = $$props.showAllPTV);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*curve, curveNumbers, origin, showEntireCurve, showAllPTV*/ 1039) {
    			if (curve) {
    				console.log('updating curve');
    				curve.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    				drawCurveLayer(curve, curveNumbers, origin, showEntireCurve, showAllPTV);
    			}
    		}
    	};

    	return [
    		origin,
    		curveNumbers,
    		showEntireCurve,
    		showAllPTV,
    		gridCanvas,
    		curveCanvas,
    		mouseCanvas,
    		container,
    		showCurveControls,
    		reset,
    		curve,
    		canvas0_binding,
    		canvas1_binding,
    		canvas2_binding,
    		div0_binding,
    		input0_change_input_handler,
    		input1_change_input_handler,
    		input2_change_handler,
    		input3_change_handler,
    		input0_change_input_handler_1,
    		input1_change_input_handler_1,
    		input2_change_input_handler,
    		input3_change_input_handler,
    		input4_change_input_handler,
    		input5_change_handler
    	];
    }

    class Canvas extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {}, null, [-1, -1]);

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
