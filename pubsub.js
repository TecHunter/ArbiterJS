function loader(_) {
    'use strict';
    var uniqueId = 0;
    var DEBUG = false;

    function pubToAllCurrentMapper(subPath, current, data, channel) {
        var self = this;
        return function (k) {
            return pubInPath.call(self, subPath, current[k], data, channel);
        };
    }

    function trigger(useCall, data, channel) {
        return function (obj) {
            if (DEBUG) {
                console.debug('[ps] triggering ' + obj.id + ' (' + channel + ')', obj, data);
            }

            try {
                return useCall ? obj.callback.call(obj, data, channel) : obj.callback.apply(obj, [channel].concat(data));
            } catch (e) {
                console.error('[ps] trigger error ' + obj.id + ' (' + channel + ')', obj, data);
            }
        };
    }

    /**
     * @this PubSub
     */
    function pubInPath(path, currentSubscriptions, data, channel) {
        var size = path.length, ps = this;
        var current = currentSubscriptions;
        var i;
        for (i = 0; i < size && current; i++) {
            var currentElement = path[i];
            if (currentElement !== '') {
                if (currentElement !== '*') {
                    //if current subs has wildcard subscribers, also publish to them
                    if (current.hasOwnProperty('*')) {
                        //not the last
                        if (i < size - 1 && current['*']._) {
                            current['*']._.map(trigger(this.useCall, data, channel));
                        }
                        pubInPath.call(ps, path.slice(i + 1), current['*'], data, channel);
                    }
                    current = current[currentElement];
                } else {
                    Object.keys(current).map(pubToAllCurrentMapper.call(ps, path.slice(i + 1), current, data, channel));
                }
            }
        }
        if (i === size && current && current._) {
            current._.map(trigger(this.useCall, data, channel));
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
        var size = path.length, ps = this;
        var current = currentSubscriptions;
        var i, recurs = false;
        for (i = 0; i < size && !recurs; i++) {
            var currentElement = path[i];

            if (currentElement === '*') {
                if (!current['*']) {
                    current['*'] = {};
                }
                return _.uniq(handlerIds.concat(subInPath.call(ps, path.slice(i + 1), current['*'], callback, channel, handlerIds)));
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
            return _.uniq(handlerIds);
        }
    }

    function pathFromChannel(channel) {
        var path = channel.split('/');
        //ignore first /
        if (path[0] === '') {
            path = path.slice(1);
        }
        return path;
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
        var path = pathFromChannel(channel);

        if (DEBUG) {
            console.debug('[ps] Publishing \'' + channel + '\'', data);
        }
        return pubInPath.call(this, path, this.subscriptions, data, channel);
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
        var path = pathFromChannel(channel);

        var res = subInPath.call(this, path, this.subscriptions, callback, channel, []);
        if (DEBUG) {
            console.debug('[ps] Subscribing \'' + channel + '\', ' + res.length + '\' handler(s) created', res);
        }
        if (res.length === 0) {
            return -1;
        } else if (res.length === 1) {
            return res[0];
        }
        return res;
    };

    function _unsubByPath(path, subPath, currentSub) {
        var ps = this;
        if (currentSub) {
            if (subPath.length === 1) {
                var pathElement = subPath[0],
                    leaf = currentSub[pathElement];

                //last element, we check if it has underlaying active subscriptions first
                if (leaf._) {
                    _.each(leaf._, function (sub) {
                        ps._lookupById[sub.id] = false;
                        ps._availableIds.push(sub.id);
                    });
                    leaf._ = false;
                }

                //we clean any other branches
                if (Object.keys(leaf).length !== 0) {
                    _.each(leaf, function (sub) {
                        if (sub) {
                            _unsubByPath.call(ps, path.concat(subPath), [key], leaf);
                        }
                    });
                }
                //then we truncate the branch itself
                delete currentSub[pathElement];
            } else if (subPath.length > 1) {
                var next = subPath.pop();
                _unsubByPath.call(ps, path.push(next), subPath, currentSub[subPath[next]]);
            }
        }
    }

    function _unsub(ids) {
        var ps = this, l = ps._lookupById.length,
            path,
            lastChannel = false, tmp, pl, current, i = 0, parent, chann;
        _.each(ids.sort(), function (id) {
            chann = id < l && ps._lookupById[id];
            if (chann) {
                if (DEBUG) {
                    console.debug('[ps][unsubscribe] removing id <' + id + '> in channel \'' + chann + '\'');
                }
                i = 0;
                if (current && chann === lastChannel) {
                    tmp = _.reject(tmp, {id: id});
                } else {
                    if (tmp && current && current._) {
                        current._ = tmp;
                    }
                    path = pathFromChannel(chann);
                    pl = path.length;
                    current = ps.subscriptions;
                    /** fund the correct path */
                    do {
                        parent = current;
                        current = current[path[i++]];
                    } while (current && i < pl);

                    if (current) {
                        if (i === pl && current._) {
                            tmp = _.reject(current._, {id: id});
                            if (tmp.length === 0 && Object.keys(current).length === 1) {
                                _unsubByPath.call(ps, path.splice(0, path.length - 1), [path[path.length - 1]], parent);
                                current = false;
                            }
                        }
                        ps._lookupById[id] = false;
                        ps._availableIds.push(id);
                    } else {
                        console.warn('[ps][unsubscribe] cannot find path <' + chann + '>');
                    }

                    lastChannel = chann;
                }
            } else {
                if (DEBUG) {
                    console.debug('[ps][unsubscribe] skipping id <' + id + '>');
                }
            }
        });

        //last item not yet processed
        if (tmp && current && path && current._ && tmp.length !== current._.length) {
            current._ = tmp;
        }
    }

    PubSub.prototype.unsubscribe = function (ids) {
        if (DEBUG) {
            console.debug('[ps] unsubscribing', ids);
        }
        if (ids !== undefined && ids !== null) {
            if (typeof ids === 'string') {
                var path = pathFromChannel(ids);
                if (path.length > 0) {
                    var last = path.pop();
                    _unsubByPath.call(this, path, [last], this.subscriptions);
                }
            } else {
                _unsub.call(this, ids instanceof Array ? ids : [ids]);
            }
        }
    };

    return new PubSub();

}

if (typeof define === "function" && define.amd) {
    define(['lib/lodash'], loader);
} else {
    /*requires lodash*/
    window.ps = loader(_);
}