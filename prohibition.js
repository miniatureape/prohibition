// head
function getListenerName() {
    return 'ontouchend' in window ? 'touchend' : 'click'
}

function max(prev, current) {
    return Math.abs(current[0] - current[1]) > prev ? Math.abs(current[0] - current[1]) : prev
}

function total(prev, current) {
    return Math.abs(current[0] - current[1]) + prev
}

function normalize(seq) {
    const min = Math.min(...seq)
    const max = Math.max(...seq) - min
    return seq.map(ts => (ts - min) / max)
}

function finishRecord() {
    this.removeListener()
    this.fire('recordDone', this.knock)
}

function finishGuard() {
    this.removeListener()
    this.fire('guardDone', this.knock)
}

const Knocker = function(elem, opts = {}) {

    let options = Object.assign({
        defaultTimeout: 1500, // ms
    }, opts)

    let timer

    let events = {}

    return {

        knock: [],
        maxThreshold: .03,
        totalThreshold: .05,

        setFinisher: function(finisher) {
            this.finisher = finisher;
        },

        start: function() {
            this.knock = [];
            this.handler = this.handleKnock.bind(this)
            elem.addEventListener(getListenerName(), this.handler)
        },

        handleKnock: function(e) {
            this.fire('knock', e)
            this.knock.push(e.timeStamp)
            if (timer) {
                timer = clearTimeout(timer)
            }
            timer = setTimeout(this.finish.bind(this), options.defaultTimeout)
        },

        finish: function() {
            timer = clearTimeout(timer)
            this.finisher()
        },

        removeListener: function() {
            elem.removeEventListener(getListenerName(), this.handler)
        },

        fire: function(name, args) {
            if (events[name]) {
                events[name].forEach((fn) => fn(args))
            }
        },

        getKnock: function() {
            return this.knock;
        },

        setKnock: function(knock) {
            this.knock = knock
        },

        listen: function(name, fn) {
            if (!events[name]) {
                events[name] = []
            }
            events[name].push(fn)
        },

        test: function(secretKnock) {
            if (this.knock.length != secretKnock.length) {
                return false
            }

            let nKnock = normalize(this.knock)
            let nSecretKnock = normalize(secretKnock)
            let pairs = nKnock.map((k, i) => [k, nSecretKnock[i]])

            let maxDiff = pairs.reduce(max, 0)
            let totalDiff = pairs.reduce(total, 0)

            console.log('testing', maxDiff, this.maxThreshold, totalDiff, this.totalThreshold)
            return maxDiff < this.maxThreshold && totalDiff < this.totalThreshold;
        }

    }

}

export const Prohibition = {

    /**
     * Initialized with a dom element, this returns
     * and object that can listen to knocks (`knock` event)
     * and after a short wait will fire a `recordDone` event.
     *
     * It has a method `getKnock` that will return the knock
     * as an array of a normalized timestamps.
     */
    getRecorder: function (elem, opts) {
        let recorder = Knocker(elem, opts)
        recorder.setFinisher(finishRecord.bind(recorder))
        return recorder
    },

    /**
     * Initialized with a dom element, this returns
     * and object that can listen to knocks (`knock` event)
     * and after a short wait will fire a `guardDone` event.
     *
     * It has a test event that can test a knock.
     */
    getGuard: function(elem, opts) {
        let guard = Knocker(elem, opts)
        guard.setFinisher(finishGuard.bind(guard))
        return guard
    },

}

export const createSVGRenderer = function(mount, options) {

    return {

        options: Object.assign({
            width: 500,
            height: 50,
            horizontalPadding: 20,
            knockHeight: 10,
            knockWidth: 20,
            bgColor: "#EFEFEF",
            fgColor: "#AFAFAF",
            knockColor: "#9F9F9F",
        }, options),

        knock: [],

        element: function(name, attrs) {
            let elem = document.createElementNS('http://www.w3.org/2000/svg', name)
            for (const [key, value] of Object.entries(attrs)) {
                elem.setAttribute(key, value)
            }
            return elem;
        },

        drawContainer: function() {
            this.svg = this.element('svg', {
                viewbox: `0 0 ${this.options.width} ${this.options.height}`,
                height: this.options.height,
                width: this.options.width,
            });
            mount.appendChild(this.svg);
            this.drawSurface()
            this.drawSpline()
        },

        drawKnock: function(knock) {
            if (knock.length && knock[knock.length - 1] > 1) {
                knock = normalize(knock)
            }
            const padding = this.options.horizontalPadding
            const effectiveWidth = this.options.width - (padding * 2)
            knock.forEach((timestamp) => {
                let x = padding + (effectiveWidth * timestamp)
                let circle = this.element('circle', {
                    cx: x,
                    cy: this.options.height / 2,
                    r: 10,
                    fill: this.options.knockColor
                })
                circle.appendChild(this.element('animate', {
                    attributeName: 'r',
                    values: `0; ${this.options.knockHeight * 1.5}; ${this.options.knockHeight}`,
                    keyTimes: "0; .25; 1",
                    dur: '300ms',
                    repeatCount: 1,
                    begin: 0,
                }));
                this.svg.append(circle);
            });
        },

        drawSpline: function() {
            this.svg.append(this.element('line', {
                x1: 0,
                x2: this.options.width,
                y1: this.options.height / 2,
                y2: this.options.height / 2,
                stroke: this.options.fgColor,
            }));
        },

        drawSurface: function() {
            this.svg.append(this.element('rect', {
                height: this.options.height,
                width: this.options.width,
                fill: this.options.bgColor,
            }))
        }
    }
}

export const CanvasRenderer = {

    options: {
        width: 500,
        height: 50,
        horizontalPadding: 20,
        knockHeight: 10,
        knockWidth: 20,
        bgColor: "#EFEFEF",
        fgColor: "#AFAFAF",
        knockColor: "#9F9F9F",
    },

    circle: function(canvas, x, y, rad) {
        canvas.beginPath()
        canvas.arc(x, y, rad, 0, 2 * Math.PI)
        canvas.fill()
    },

    render: function(knock, canvas, options) {
        this.options = Object.assign(this.options, options || {})
        this.clearCanvas(canvas || this.createCanvas(options))
        this.drawSpine(canvas)
        this.drawKnock(canvas, knock)
    },

    createCanvas: function() {
        let canvas = document.createElement('canvas');
        canvas.setAttribute('context', '2d');
        return canvas.getContext('2d');
    },

    clearCanvas: function(canvas) {
        canvas.save()
        canvas.canvas.setAttribute('width', this.options.width);
        canvas.canvas.setAttribute('height', this.options.height);
        canvas.fillStyle = this.options.bgColor;
        canvas.fillRect(0, 0, this.options.width, this.options.height);
        canvas.restore()
        return canvas;
    },

    drawSpine: function(canvas) {
        const halfKnock = this.options.knockWidth / 2;
        canvas.save()
        canvas.strokeStyle = this.options.fgColor;
        canvas.moveTo(0, this.options.height / 2);
        canvas.lineTo(this.options.width, this.options.height / 2);
        canvas.stroke();
        canvas.restore()
    },

    drawKnock: function(canvas, knock) {
        // If its not already normalized, normalize it.
        if (knock.length && knock[knock.length - 1] > 1) {
            knock = normalize(knock)
        }
        const halfKnock = this.options.knockWidth / 2;
        canvas.save()
        canvas.fillStyle = this.options.knockColor
        const padding = this.options.horizontalPadding
        const effectiveWidth = this.options.width - (padding * 2)
        knock.forEach((timestamp) => {
            let x = padding + (effectiveWidth * timestamp)
            this.circle(canvas, x, this.options.height / 2, this.options.knockHeight)
        });
        canvas.restore()
    }

}
