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
    seq = seq.map(ts => ts - Math.min(...seq))
    return seq.map(ts => ts / Math.max(...seq))
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

    getRecorder: function (elem, opts) {
        let recorder = Knocker(elem, opts)
        recorder.setFinisher(finishRecord.bind(recorder))
        return recorder
    },

    getGuard: function(elem, opts) {
        let guard = Knocker(elem, opts)
        guard.setFinisher(finishGuard.bind(guard))
        return guard
    },

}
