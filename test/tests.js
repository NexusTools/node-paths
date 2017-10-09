"use strict";
exports.__esModule = true;
var assert = require("assert");
var paths = require("../index");
var path = require("path");
var a = path.resolve(__dirname, "a");
var b = path.resolve(__dirname, "b");
var c = path.resolve(__dirname, "c");
var one = path.resolve(a, "one.json");
var two = path.resolve(c, "two.json");
var three = path.resolve(b, "three.json");
var z = path.resolve(b, "z.json");
var instance;
describe('create', function () {
    it('using array arg', function () {
        var test = new paths([__dirname, a, c, b]);
        assert.equal(test.resolve("tests.js"), __filename, "Resolve tests.js");
    });
    it('using function arg', function () {
        var test = new paths(function (script) {
            return script + ".json";
        });
        test.add([__dirname, a, b, c]);
        assert.equal(test.resolve("one"), one);
        assert.equal(test.resolve("two"), two);
    });
    it('string arg', function () {
        instance = new paths(b);
        assert.equal(instance.resolve("three.json"), three);
    });
    it('paths arg', function () {
        instance = new paths(instance);
        assert.equal(instance.resolve("z.json"), z);
    });
    it('unknown type error', function () {
        try {
            new paths(new Date());
            throw new Error("Didn't fail");
        }
        catch (e) {
            if (!/Cannot handle /.test(e.message))
                throw e;
        }
    });
});
describe('static methods', function () {
    it('isInstance, wrap', function () {
        assert.equal(paths.isInstance(instance), true);
        assert.equal(paths.wrap(instance), instance);
        assert.equal(paths.wrap(b).at(0), b);
        assert.equal(instance.count(), 1);
    });
});
describe('instance methods', function () {
    it('get, count, clear', function () {
        if (!instance.get(instance).at(0))
            throw new Error("Contains no paths");
        var cPaths = instance.get(__dirname);
        assert.equal(cPaths.at(0), __dirname);
        assert.equal(instance.get(), instance);
        instance.clear();
        assert.equal(instance.count(), 0);
    });
    it('get error', function () {
        try {
            instance.get(new Date());
            throw new Error("Didn't fail");
        }
        catch (e) {
            if (!/Cannot handle /.test(e.message))
                throw e;
        }
    });
    it('add, has', function () {
        instance.add(a, c);
        assert.equal(instance.has(c), true);
        assert.equal(instance.has(a), true);
        instance.add(__dirname);
        instance.add(new paths(__dirname, a, b));
        instance.add(instance);
        instance.add([]);
        instance.add();
        assert.equal(instance.count(), 4);
    });
    it('add error', function () {
        try {
            instance.add(new Date());
            throw new Error("Didn't fail");
        }
        catch (e) {
            if (!/Cannot handle /.test(e.message))
                throw e;
        }
    });
    it('forEach', function () {
        var ran = 0;
        instance.forEach(function () {
            ran++;
        });
        if (ran < 3)
            throw new Error("Expected to loop at least 3 times");
    });
    it('remove, has', function () {
        instance.remove(new paths(__dirname));
        assert.equal(instance.has(__dirname), false);
        assert.equal(instance.has(a), true);
        assert.equal(instance.has(b), true);
        instance.remove([a, __dirname]);
        assert.equal(instance.has(b), true);
        assert.equal(instance.has(a), false);
        instance.remove(b, __dirname);
        instance.remove(instance);
        assert.equal(instance.has(b), false);
        instance.remove(c);
        assert.equal(instance.count(), 0);
    });
    it('remove error', function () {
        try {
            instance.remove(new Date());
            throw new Error("Didn't fail");
        }
        catch (e) {
            if (!/Cannot handle /.test(e.message))
                throw e;
        }
    });
    it('has error', function () {
        try {
            instance.has(new Date());
            throw new Error("Didn't fail");
        }
        catch (e) {
            if (!/Cannot handle /.test(e.message))
                throw e;
        }
    });
    it('toString', function () {
        assert.equal(instance.toString(), "Paths<>");
    });
    it('resolve', function () {
        instance.add(a);
        assert.equal(instance.resolve("one.json"), one);
        instance.add(__dirname);
        assert.equal(instance.resolve("tests.js"), __filename);
    });
    it('resolveAsync', function (cb) {
        instance.resolveAsync("tests.js", function (err, resolved) {
            if (err)
                return cb(err);
            if (!resolved)
                return cb(new Error("tests.json could be resolved"));
            cb();
        });
    });
    it('resolveAsync lookDeep', function (cb) {
        instance.resolveAsync("one.json", function (err, resolved) {
            if (err)
                return cb(err);
            if (!resolved)
                return cb(new Error("one.json could be resolved"));
            cb();
        }, null, true);
    });
    it('resolver function', function () {
        instance = new paths(function (input) {
            if (!/\.\w{2,5}$/.test(input))
                return input + ".js";
            return input;
        });
    });
    it('resolver function error', function () {
        try {
            instance = new paths(function () {
                throw new Error();
            }, function () {
                throw new Error();
            });
            throw new Error("Didn't fail");
        }
        catch (e) {
            if (!/Only one resolver is supported per instance/.test(e.message))
                throw e;
        }
    });
    it('contaminate _paths', function () {
        instance._paths.push(new Date());
        try {
            instance.resolve("env");
        }
        catch (e) {
            if (!/^(Arguments to path.resolve must be strings|Path must be a string)\./.test(e.message))
                throw e;
        }
    });
});
//# sourceMappingURL=tests.js.map