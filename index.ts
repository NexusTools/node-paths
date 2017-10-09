/// <reference types="node" />

import _ = require('lodash');
import path = require('path');
import async = require("async");
import fs = require('fs');

const $next = {_next: true};
const $break = {_break: true};
class Paths {
    _paths: string[];
    _resolve: (input: any) => any;
    constructor(...args: any[]) {
        var resolve: (input: any) => any;
        var remain: string[] = [];
        args.forEach(function(arg) {
            if(_.isFunction(arg)) {
                if(resolve)
                    throw new Error("Only one resolver is supported per instance");
                resolve = arg;
            } else
                remain.push(arg);
        })
        this._paths = Paths._convertArgs(remain);
        this._resolve = resolve || _.identity;
    }
    at(pos: number) {
        return this._paths[pos];
    }
    count() {
        return this._paths.length;
    };
    get(...args: any[]) {
        var overrides = Paths._convertArgs(args);
        if (overrides.length > 0)
            return new Paths(this._resolve, _.union(overrides, this._paths));
        return this;
    };
    clear() {
        this._paths = [];
    };
    add(...args: any[]) {
        var add = Paths._convertArgs(args);
        if (add.length)
            this._paths = _.union(add, this._paths);
    };
    has(...args: any[]) {
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
        } catch (e) {
            if (e !== $break)
                throw e;
        }
        return false;
    };
    remove(...args: any[]) {
        var remove = Paths._convertArgs(args);
        if (remove.length > 0)
            this._paths = _.difference(this._paths, remove);
    }
    clone() {
        var _paths = new Paths();
        _paths._paths = this._paths;
        return _paths;
    }
    forEach(iterator: (path: string) => void) {
        this._paths.forEach(iterator);
    }
    resolveAsync(resolver: string|Function, callback: (err: Error, path?: string) => void, _paths?: Paths, lookDeep = false) {
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

        var lookIn = function (_paths: string[]|Paths, callback: (err: Error, path?: string) => void) {
            async.eachSeries(_paths instanceof Paths ? _paths._paths : _paths, function(_path, cb) {
                (resolver as Function)(_path, function(err, resolved) {
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
            }, function(err: Error) {
                if(err) return callback(err);
                callback(new Error("Cannot resolve `" + resolver + "` from " + _paths));
            });
        } else
            lookIn(_paths, callback);
    };
    resolve(resolver: string|Function, _paths?: Paths, lookDeep = false) {
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
            var lookIn = function (_paths: string[]|Paths) {
                (_paths.forEach as any)(function (_path: string) {
                    try {
                        var _resolved = (resolver as Function)(_path);
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
                    var files: string[];
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
    toString() {
        const json = JSON.stringify(this._paths);
        return `Paths<${json.substring(1, json.length-1)}>`;
    };
    static wrap = function (other, ...more: any[]) {
        if (other instanceof Paths && !more.length)
            return other;
        return new Paths(Array.prototype.slice.call(arguments, 0));
    }
    static isInstance(obj: any) {
        return obj instanceof Paths;
    }
    static _convertArgs(args: any[], converter: (arg: string|any[]|Paths) => string[] = Paths._convert) {
        if (!args.length)
            return [];
        return _.uniq(converter(_.flatten(args)));
    };
    static _convert(arg: string|any[]|Paths): string[]{
        if (arg instanceof Paths)
            return arg._paths;
            
        if (Array.isArray(arg)) {
            var converted: string[] = [];
            arg.forEach(function(arg) {
                if(arg) {
                    if(arg instanceof Paths)
                        arg._paths.forEach(function(path) {
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
            var converted: string[] = [];
            arg.split(path.delimiter).forEach(function (_path) {
                converted.push(path.normalize("" + _path));
            });
            return converted;
        }

        throw new Error("Paths._convert cannot handle type `" + (typeof arg) + "`");
    }
    static readonly sys = {
        path: Paths,
        node: Paths,
        plugin: Paths,
        _init(env: string, alias: string) {
            var _paths: Paths = undefined;
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
    }
}

Paths.sys._init("PATH", "path");
Paths.sys._init("NODE_PATH", "node");
Paths.sys._init("PLUGIN_PATH", "plugin");

export = Paths;