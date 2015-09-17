function loader() {
    'use strict';
    var uniqueId = 0;

    function pubToAllCurrentMapper(subPath, current, data, channel) {
        var self = this;
        return function (k) {
            return pubInPath.bind(self)(subPath, current[k], data, channel);
        };
    }

    /**
     * @this PubSub
     */
    function pubInPath(path, currentSubscriptions, data, channel) {
        var size = path.length;
        var current = currentSubscriptions;
        var i;
        for (i = 0; i < size && current; i++) {
            var currentElement = path[i];
            if (currentElement !== '') {
                if (currentElement !== '*') {
                    //if current subs has wildcard subscribers, also publish to them
                    if (current.hasOwnProperty('*')) {
                        pubInPath.bind(this)(path.slice(i + 1), current['*'], data, channel);
                    }
                    current = current[currentElement];
                } else {
                    Object.keys(current).map(pubToAllCurrentMapper.bind(this)(path.slice(i + 1), current, data, channel));
                }
            }
        }
        if (i === size && current && current._) {
            current._.map(function (useCall) {
                return function (obj) {
                    return useCall ? obj.callback.call(obj, data) : obj.callback.apply(obj, data);
                };
            }(this.useCall));
        }
    }

    /**
     *
     * @private
     * @param {string[]} path current path array
     * @param {{}} currentSubscriptions object holding subscriptions within current path
     * @param {function} callback for the subscription
     * @param {string} channel used in the root callee
     * @param {number[]} handlerIds is an array of IDs that were created for the subscriptions. Can be used to {@link PubSub.prototype.unsubscribe}
     * @returns {number|number[]}
     *
     * @this PubSub
     * @see {@link PubSub.prototype.subscribe}
     * @see {@link PubSub.prototype.unsubscribe}
     */
    function subInPath(path, currentSubscriptions, callback, channel, handlerIds) {
        var size = path.length;
        var current = currentSubscriptions;
        var i, recurs = false;
        for (i = 0; i < size && !recurs; i++) {
            var currentElement = path[i];

            if (currentElement === '*') {
                if (!current['*']) {
                    current['*'] = {};
                }
                return handlerIds.concat(subInPath.bind(this)(path.slice(i + 1), current['*'], callback, channel, handlerIds));
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
            if (this._availableIds.length > 0) {
                newId = this._availableIds.pop();
                this._lookupById[newId] = channel;
            } else {
                newId = uniqueId++;
                this._lookupById.push(channel);
            }
            current._.push({id: newId, callback: callback, channel: channel});
            handlerIds.push(newId);
            return handlerIds;
        }
    }

    function PubSub() {
        this.useCall = true;
        this.subscriptions = {};

        this._lookupById = [];
        this._availableIds = [];
    }

    /**
     *
     * @param {string|string[]} channel
     * @param {*} [data]
     * @returns {boolean}
     */
    PubSub.prototype.publish = function (channel, data) {
        if (!channel || channel === '') {
            return false;
        }
        var path = channel.split('/');
        if (path[0] === '') {
            path = path.slice(1);
        }
        return pubInPath.bind(this)(path, this.subscriptions, data, channel);
    };

    /**
     *
     * @param {string|string[]} channel
     * @param {function} callback
     * @returns {number|number[]}
     */
    PubSub.prototype.subscribe = function (channel, callback) {
        if (!channel || channel === '') {
            return -1;
        }
        var path = channel.split('/');
        if (path[0] === '') {
            path = path.slice(1);
        }
        var res = subInPath.bind(this)(path, this.subscriptions, callback, channel, []);

        if (res.length === 0) {
            return -1;
        } else if (res.length === 1) {
            return res[0];
        }
        return res;
    };

    PubSub.prototype.unsubscribe = function () {

    };

    return new PubSub();

};
if ( typeof define === "function" && define.amd ) {
    define([], loader);
}else{
    window.ps = loader();
}