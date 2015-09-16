var uniqueId = 0;

var lookupById = [];
var availableIds = [];

function pubInPath(path, currentSubscriptions, data, channel) {
    var size = path.length;
    var current = currentSubscriptions;
    var i;
    for (i = 0; i < size && current; i++) {
        var currentElement = path[i];
        if (currentElement !== '') {
            //if current subs has wildcard subscribers, also publish to them
            if (current.hasOwnProperty('*') && i + 1 < size) {
                pubInPath(path.slice(i + 1), current['*'], data, channel);
            }
            current = current[currentElement];
        }
    }
    if (i === size && current && current._) {
        current._.map(function (obj) {
            return obj.callback.call(window, data, channel);
        });
    }
}

function subInPath(path, currentSubscriptions, callback, channel) {
    var size = path.length;
    var current = currentSubscriptions;
    var i, recurs = false;
    for (i = 0; i < size && !recurs; i++) {
        var currentElement = path[i];

        if (currentElement === '*') {
            if (!current['*']) {
                current['*'] = {};
            }
            return subInPath(path.slice(i + 1), current['*'], callback, channel);
        } else {
            if (!current[currentElement]) {
                current[currentElement] = {};
            }
            current = current[currentElement];
        }
    }
    if (!recurs) {
        if (!current._) {
            current._ = [];
        }
        var newId;
        if (availableIds.length > 0) {
            newId = availableIds.pop();
            lookupById[newId] = channel;
        } else {
            newId = uniqueId++;
            lookupById.push(channel);
        }
        current._.push({id: newId, callback: callback, channel: channel});
        return newId;
    }
}

var Arbiter = new (function () {
    var self = this;
    this.apply = true;
    this.subscriptions = {};

    this.publish = function (channel, data) {
        console.debug('[Arbiter] publish',channel);

        if (!channel || channel === '') {
            return false;
        }
        var path = channel.split('/');
        if (path[0] === '') {
            path = path.slice(1);
        }
        return pubInPath(path, self.subscriptions, data, channel);
    };

    this.subscribe = function (channel, callback) {
        console.debug('[Arbiter] subscribe',channel);
        if (!channel || channel === '') {
            return false;
        }
        var path = channel.split('/');
        if (path[0] === '') {
            path = path.slice(1);
        }
        return subInPath(path, self.subscriptions, callback, channel);
    };

    this.unsubscribe = function () {

    };
})();


