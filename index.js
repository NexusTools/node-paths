var _ = require('lodash');
var path = require('path');
var async = require("async");
var fs = require('fs');

var $break = {_break: true};
var paths = function () {
    var resolve;
    this._paths = paths._convertArgs(arguments, function (input) {
        if (_.isFunction(input)) {
            if (resolve)
                throw new Error("Only one resolver is supported per instance.");
            resolve = input;
            return false;
        } else
            return paths._convert(input);
    });
    this._resolve = resolve || _.identity;
};
paths.sys = {
    _init: function (env, alias) {
        var _paths = undefined;
        alias = alias || env.toLowerCase().replace(/[^a-zA-Z]/, "");
        Object.defineProperty(paths.sys, alias, {
            configurable: true,
            get: function () {
                if (!_paths) {
                    if (env in process.env)
                        _paths = new paths(process.env[env].split(path.delimiter));
                    else
                        _paths = new paths();
                    var err = function () {
                        throw new Error("Cannot modify built-in paths, use .clone() to create a new copy.");
                    };
                    _paths.add = err;
                    _paths.remove = err;

                    Object.defineProperty(paths.sys, alias, {
                        get: function () {
                            return _paths;
                        }
                    });
                }

                return _paths;

            }
        });
    }
};
paths.sys._init("PATH", "path");
paths.sys._init("NODE_PATH", "node");
paths.sys._init("PLUGIN_PATH", "plugin");

paths._convert = function (arg) {
    if (!_.isString(arg)) {
        if (paths.isInstance(arg))
            return arg._paths;

        throw new Error("Cannot handle type `" + (typeof arg) + "`");
    } else {
        var converted = [];
        arg.split(path.delimiter).forEach(function (_path) {
            converted.push(path.normalize("" + _path));
        });
        return converted;
    }
};
paths._convertArgs = function (args, convert) {
    if (!args.length)
        return [];
    convert = convert || paths._convert;
    args = _.flatten(args);

    var output = [];
    args.forEach(function (arg) {
        if ((arg = convert(arg)))
            output = _.union(output, arg);
    });
    return output;
};
paths.isInstance = function (other) {
    try {
        if (!_.isArray(other._paths))
            throw "";
        return true;
    } catch (e) {}
    return false;
};
paths.wrap = function (other) {
    if (paths.isInstance(other))
        return other;
    return new paths(Array.prototype.slice.call(arguments, 0));
};
paths.prototype.at = function (pos) {
    return this._paths[pos];
};
paths.prototype.count = function () {
    return this._paths.length;
};
paths.prototype.get = function (overrides) {
    var overrides = paths._convertArgs(arguments);
    if (overrides.length > 0)
        return new paths(this._resolve, _.union(overrides, this._paths));
    return this;
};
paths.prototype.clear = function () {
    this._paths = [];
};
paths.prototype.add = function () {
    var add = paths._convertArgs(arguments);
    if (add.length)
        this._paths = _.union(add, this._paths);
};
paths.prototype.has = function () {
    try {
        var find = paths._convertArgs(arguments);
        if (find.length > 0) {
            var self = this;
            find.forEach(function (thing) {
                if (self._paths.indexOf(thing) === -1)
                    throw $break;
            });
            return true;
        }
    } catch (e) {
        if (e !== $break)
            throw e;
    }
    return false;
};
paths.prototype.remove = function () {
    var remove = paths._convertArgs(arguments);
    if (remove.length > 0)
        this._paths = _.difference(this._paths, remove);
};
paths.prototype.clone = function () {
    var _paths = new paths();
    _paths._paths = this._paths;
    return _paths;
};
paths.prototype.forEach = function (iterator) {
    this._paths.forEach(iterator);
};
paths.prototype.resolveAsync = function (resolver, callback, _paths, lookDeep) {
    if (_paths)
        _paths = this.get(_paths);
    else
        _paths = this;

    if (!_.isFunction(resolver)) {
        var childString = this._resolve(path.normalize("" + resolver));
        resolver = function (_path, cb) {
            try {
                cb(null, path.resolve(_path, childString));
            } catch(e) {
                console.error(_path);
                throw e;
            }
        };
        resolver.toString = function () {
            return childString;
        };
    }

    var lookIn = function (_paths, callback) {
        async.eachSeries(_paths._paths || _paths, function(_path, cb) {
            resolver(_path, function(err, resolved) {
                if(err) return cb(err);
                
                fs.stat(resolved, function(err) {
                    if(err) return cb(); // next
                    callback(null, resolved);
                });
            });
        }, callback);
    };

    if (lookDeep) {
        async.eachSeries(_paths._paths, function(_path, cb) {
            fs.readdir(_path, function(err, files) {
                if(err) return cb(err);
                
                for (var i = 0; i < files.length; i++)
                    files[i] = path.resolve(_path, files[i]);
                lookIn(files, function(err, resolved) {
                    if(err) return cb(err);
                    if(resolved)
                        callback(null, resolved);
                    else
                        cb();
                });
            });
        }, function(err) {
            if(err) return callback(err);
            callback(new Error("Cannot resolve `" + resolver + "` from " + _paths));
        });
    } else
        lookIn(_paths, callback);
};
paths.prototype.resolve = function (resolver, _paths, lookDeep) {
    if (_paths)
        _paths = this.get(_paths);
    else
        _paths = this;

    var $next = {_next: true};
    if (!_.isFunction(resolver)) {
        var childString = this._resolve(path.normalize("" + resolver));
        resolver = function (_path) {
            return path.resolve(_path, childString);
        };
        resolver.toString = function () {
            return childString;
        };
    }

    var resolved;
    try {
        var lookIn = function (_paths) {
            _paths.forEach(function (_path) {
                try {
                    var _resolved = resolver(_path);
                    try {
                        fs.statSync(_resolved);
                    } catch(e) {
                        throw $next;
                    }
                    resolved = _resolved;
                    throw $break;
                } catch (e) {
                    if (e !== $next)
                        throw e;
                }
            });
        };

        if (lookDeep)
            _paths.forEach(function (_path) {
                var files;
                try {
                    files = fs.readdirSync(_path);
                } catch (e) {
                    return;
                }
                for (var i = 0; i < files.length; i++)
                    files[i] = path.resolve(_path, files[i]);
                lookIn(files);
            });
        else
            lookIn(_paths);
    } catch (e) {
        if (e !== $break)
            throw e;
    }
    if (!resolved)
        throw new Error("Cannot resolve `" + resolver + "` from " + _paths);
    return resolved;
};
paths.prototype.toString = function () {
    return JSON.stringify(this._paths);
};
module.exports = paths;
