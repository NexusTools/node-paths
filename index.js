"use strict";
/// <reference types="node" />
var _ = require("lodash");
var path = require("path");
var async = require("async");
var fs = require("fs");
var $next = { _next: true };
var $break = { _break: true };
var Paths = (function () {
    function Paths() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        var resolve;
        var remain = [];
        args.forEach(function (arg) {
            if (_.isFunction(arg)) {
                if (resolve)
                    throw new Error("Only one resolver is supported per instance");
                resolve = arg;
            }
            else
                remain.push(arg);
        });
        this._paths = Paths._convertArgs(remain);
        this._resolve = resolve || _.identity;
    }
    /**
     * Return a path by index.
     */
    Paths.prototype.at = function (index) {
        return this._paths[index];
    };
    /**
     * Return the number of paths.
     */
    Paths.prototype.count = function () {
        return this._paths.length;
    };
    /**
     * Extend this Paths instance, with args, if any.
     */
    Paths.prototype.get = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        var overrides = Paths._convertArgs(args);
        if (overrides.length > 0)
            return new Paths(this._resolve, _.union(overrides, this._paths));
        return this;
    };
    /**
     * Clears this Paths instance.
     */
    Paths.prototype.clear = function () {
        this._paths = [];
    };
    /**
     * Add args to this Paths.
     */
    Paths.prototype.add = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        var add = Paths._convertArgs(args);
        if (add.length)
            this._paths = _.union(add, this._paths);
    };
    /**
     * Check whether or not args are contained by Paths.
     */
    Paths.prototype.has = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        try {
            var find = Paths._convertArgs(args);
            if (find.length > 0) {
                var self = this;
                find.forEach(function (thing) {
                    if (self._paths.indexOf(thing) === -1)
                        throw $break;
                });
                return true;
            }
        }
        catch (e) {
            if (e !== $break)
                throw e;
        }
        return false;
    };
    /**
     * Remove args from paths.
     */
    Paths.prototype.remove = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        var remove = Paths._convertArgs(args);
        if (remove.length > 0)
            this._paths = _.difference(this._paths, remove);
    };
    /**
     * Clone this Paths.
     */
    Paths.prototype.clone = function () {
        return new Paths(this._resolve, this._paths);
    };
    /**
     * Iterate over the paths.
     */
    Paths.prototype.forEach = function (iterator) {
        this._paths.forEach(iterator);
    };
    /**
     * Asynchroniously resolve a file within these Paths.
     */
    Paths.prototype.resolveAsync = function (resolver, callback, _paths, lookDeep) {
        if (lookDeep === void 0) { lookDeep = false; }
        if (_paths)
            _paths = this.get(_paths);
        else
            _paths = this;
        if (!_.isFunction(resolver)) {
            var childString = this._resolve(path.normalize("" + resolver));
            resolver = function (_path, cb) {
                try {
                    cb(null, path.resolve(_path, childString));
                }
                catch (e) {
                    console.error(_path);
                    throw e;
                }
            };
            resolver.toString = function () {
                return childString;
            };
        }
        var lookIn = function (_paths, callback) {
            async.eachSeries(_paths instanceof Paths ? _paths._paths : _paths, function (_path, cb) {
                resolver(_path, function (err, resolved) {
                    if (err)
                        return cb(err);
                    fs.stat(resolved, function (err) {
                        if (err)
                            return cb(); // next
                        callback(null, resolved);
                    });
                });
            }, callback);
        };
        if (lookDeep) {
            async.eachSeries(_paths._paths, function (_path, cb) {
                fs.readdir(_path, function (err, files) {
                    if (err)
                        return cb(err);
                    for (var i = 0; i < files.length; i++)
                        files[i] = path.resolve(_path, files[i]);
                    lookIn(files, function (err, resolved) {
                        if (err)
                            return cb(err);
                        if (resolved)
                            callback(null, resolved);
                        else
                            cb();
                    });
                });
            }, function (err) {
                if (err)
                    return callback(err);
                callback(new Error("Cannot resolve `" + resolver + "` from " + _paths));
            });
        }
        else
            lookIn(_paths, callback);
    };
    ;
    /**
     * Resolve a file within these Paths.
     */
    Paths.prototype.resolve = function (resolver, _paths, lookDeep) {
        if (lookDeep === void 0) { lookDeep = false; }
        if (_paths)
            _paths = this.get(_paths);
        else
            _paths = this;
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
                        }
                        catch (e) {
                            throw $next;
                        }
                        resolved = _resolved;
                        throw $break;
                    }
                    catch (e) {
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
                    }
                    catch (e) {
                        return;
                    }
                    for (var i = 0; i < files.length; i++)
                        files[i] = path.resolve(_path, files[i]);
                    lookIn(files);
                });
            else
                lookIn(_paths);
        }
        catch (e) {
            if (e !== $break)
                throw e;
        }
        if (!resolved)
            throw new Error("Cannot resolve `" + resolver + "` from " + _paths);
        return resolved;
    };
    ;
    Paths.prototype.toString = function () {
        var json = JSON.stringify(this._paths);
        return "Paths<" + json.substring(1, json.length - 1) + ">";
    };
    ;
    Paths.wrap = function (other) {
        var more = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            more[_i - 1] = arguments[_i];
        }
        if (other instanceof Paths && !more.length)
            return other;
        return new Paths(Array.prototype.slice.call(arguments, 0));
    };
    Paths.isInstance = function (obj) {
        return obj instanceof Paths;
    };
    Paths._convertArgs = function (args, converter) {
        if (converter === void 0) { converter = Paths._convert; }
        if (!args.length)
            return [];
        return _.uniq(converter(_.flatten(args)));
    };
    ;
    Paths._convert = function (arg) {
        if (arg instanceof Paths)
            return arg._paths;
        if (Array.isArray(arg)) {
            var converted = [];
            arg.forEach(function (arg) {
                if (arg) {
                    if (arg instanceof Paths)
                        arg._paths.forEach(function (path) {
                            converted.push(path);
                        });
                    else if (_.isString(arg))
                        converted.push(path.normalize(arg));
                    else
                        throw new Error("Cannot handle `" + (typeof arg) + "` as path");
                }
            });
            return converted;
        }
        if (_.isString(arg)) {
            var converted = [];
            arg.split(path.delimiter).forEach(function (_path) {
                converted.push(path.normalize("" + _path));
            });
            return converted;
        }
        throw new Error("Paths._convert cannot handle type `" + (typeof arg) + "`");
    };
    return Paths;
}());
Paths.sys = {
    path: Paths,
    node: Paths,
    plugin: Paths,
    _init: function (env, alias) {
        var _paths = undefined;
        alias = alias || env.toLowerCase().replace(/[^a-zA-Z]/, "");
        Object.defineProperty(Paths.sys, alias, {
            configurable: true,
            get: function () {
                if (!_paths) {
                    if (env in process.env)
                        _paths = new Paths(process.env[env].split(path.delimiter));
                    else
                        _paths = new Paths();
                    var err = function () {
                        throw new Error("Cannot modify built-in paths, use .clone() to create a new copy.");
                    };
                    _paths.add = err;
                    _paths.remove = err;
                    Object.defineProperty(Paths.sys, alias, {
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
Paths.sys._init("PATH", "path");
Paths.sys._init("NODE_PATH", "node");
Paths.sys._init("PLUGIN_PATH", "plugin");
module.exports = Paths;
//# sourceMappingURL=index.js.map