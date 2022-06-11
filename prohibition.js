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
    if (seq.length == 1) {
        return [.5];
    }
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
        maxThreshold: 100.03,
        totalThreshold: 100.05,

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
            this.knock.last = e.timeStamp
            this.fire('knockChanged', this.knock)
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

export const createDOMRenderer = function(mount, opts) {

    const defaults = {
        width: 500,
        height: 50,
        horizontalPadding: 20,
        knockHeight: 10,
        knockWidth: 20,
        bgColor: "#EFEFEF",
        fgColor: "#AFAFAF",
        knockColor: "#9F9F9F",
    }

    let options = Object.assign(defaults, opts);
    let knocks = [];
    let knockEls = [];
    let surface;

    function element(name, attrs) {
        let elem = document.createElement(name)
        for (const [key, value] of Object.entries(attrs)) {
            elem.setAttribute(key, value)
        }
        return elem
    }

    function rebalanceKnocks() {
        let normKnocks = normalize(knocks)
        console.log(normKnocks);
        normKnocks.forEach((k, i) => {
            setTimeout(function() {
                let left = Math.max(options.horizontalPadding, (k * (options.width - options.horizontalPadding - options.knockWidth))) + "px";
                knockEls[i].style.left = left;
                knockEls[i].style.opacity = 1
            }, 1)
        });
    }

    return {
        drawContainer: function() {
            surface = element('div', {'class': 'prohibition-container'})
            const line = element('div', {'class': 'prohibition-spine'})
            surface.appendChild(line)
            mount.appendChild(surface)
            return surface
        },

        updateKnock: function(knock) {
            let numEls = knockEls.length;
            if (knock.length != numEls) {
                for (let i = numEls; i < knock.length; i++) {
                    let knockEl = element('div', {
                        'class': 'prohibition-knock',
                    })
                    knockEls.push(knockEl);
                    surface.appendChild(knockEl)
                }
            }
            knocks = knock
            console.log(knocks);
            rebalanceKnocks()
        },
    }
}
