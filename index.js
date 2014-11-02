var _ = require('underscore');
var path = require('path');
var fs = require('fs');

var $break = {_break:true};
var paths = function() {
    var resolve;
    this._paths = paths._convertArgs(arguments, function(input) {
        if(_.isFunction(input)) {
            if(resolve)
                throw new Error("Only one resolver is supported per instance.");
           resolve = input;
           return false;
        } else
           return paths._convert(input);
    });
    this._resolve = resolve || _.identity;
};
paths._convert = function(arg) {
    if(!_.isString(arg)) {
        if(paths.isInstance(arg))
            return arg._paths;
        
        throw new Error("Cannot handle type `" + (typeof arg) + "`");
    } else
        return path.normalize("" + arg);
}
paths._convertArgs = function(args, convert) {
    if(!args.length)
        return [];
    convert = convert || paths._convert;
    args = _.flatten(args);
    
    var output = [];
    args.forEach(function(arg) {
        if(arg = convert(arg)) {
            if(!_.isArray(arg))
                arg = [arg];
            output = _.union(output, arg);
        }
    });
    return output;
}
paths.isInstance = function(other) {
    try {
        if(!_.isArray(other._paths))
            throw "";
        return true;
    } catch(e) {}
    return false;
}
paths.wrap = function(other) {
    if(paths.isInstance(other))
        return other;
    return new paths(Array.prototype.slice.call(arguments, 0));
}
paths.prototype.at = function(pos) {
    return this._paths[pos];
};
paths.prototype.count = function() {
    return this._paths.length;
};
paths.prototype.get = function(overrides) {
    var combinedPath;
    var overrides = paths._convertArgs(arguments);
    if(overrides.length > 0)
        return new paths(this._resolve, _.union(overrides, this._paths));
    return this;
};
paths.prototype.clear = function() {
    this._paths = [];
};
paths.prototype.add = function() {
    var add = paths._convertArgs(arguments);
    if(add.length)
        this._paths = _.union(add, this._paths);
};
paths.prototype.has = function() {
    try {
        var find = paths._convertArgs(arguments);
        if(find.length > 0) {
            var self = this;
            find.forEach(function(thing) {
                if(self._paths.indexOf(thing) == -1)
                    throw $break;
            });
            return true;
        }
    } catch(e) {
        if(e !== $break)
            throw e;
    }
    return false;
};
paths.prototype.remove = function(cpath) {
    var remove = paths._convertArgs(arguments);
    if(remove.length > 0)
        this._paths = _.difference(this._paths, remove);
};
paths.prototype.forEach = function(iterator) {
    this._paths.forEach(iterator);
};
paths.prototype.resolveAsync = function(resolver, callback, _paths, lookDeep) {
    throw new Error("Not implemented yet");
}
paths.prototype.resolve = function(resolver, _paths, lookDeep) {
    if(_paths) {
        if(_.isString(_paths))
            _paths = this.get(_paths.split(":"));
        else
            _paths = this.get(_paths);
    } else
        _paths = this;
    
    var $next = {_next:true};
    var next = function() {
        throw $next;
    }
    if(!_.isFunction(resolver)) {
        var childString = this._resolve(path.normalize("" + resolver));
        resolver = function(_path, next) {
            _path = path.resolve(_path, childString);
            if(!fs.existsSync(_path))
                next();
            return _path;
        };
        resolver.toString = function() {
            return childString;
        };
    }
    
    var resolved;
    try {
        var lookIn = function(_paths) {
            _paths.forEach(function(_path) {
                try {
                    resolved = resolver(_path, next);
                    return;
                } catch(e) {
                    if(e !== $next)
                        throw e;
                }
            });
        };
        
        if(lookDeep)
            _paths.forEach(function(_path) {
                var files;
                try {
                    files = fs.readdirSync(_path);
                } catch(e) {
                    return;
                }
                for(var i=0;i<files.length;i++)
                    files[i] = path.resolve(_path, files[i]);
                lookIn(files);
            });
        else
            lookIn(_paths);
    } catch(e) {
        if(e !== $break)
            throw e;
    }
    if(!resolved)
        throw new Error("Cannot resolve `" + resolver + "` from " + _paths);
    return resolved;
};
paths.prototype.toString = function() {
    return JSON.stringify(this._paths);
}
module.exports = paths;
