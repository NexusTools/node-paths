var assert = require('assert');
var child_process = require("child_process");
var path = require('path');

var pkg;
var topDir = path.dirname(__dirname);
var supportDir = path.resolve(__dirname, "support");
var pkgfile = path.resolve(topDir, "package.json");
it('parse package.json', function(){
    pkg = require(pkgfile);
    if(!pkg)
        throw new Error("Failed to parse `package.json`");
    if(!("main" in pkg))
        throw new Error("`package.json` missing property `main`");
});
var paths;
it("require main", function(){
    paths = require(topDir);
});
describe('api', function() {
    var instance;
    describe('create', function() {
        it('using args', function(){
            var test = new paths();
        });
        it('using multiple args', function(){
            var test = new paths(__dirname, topDir);
            assert.equal(test.resolve("package.json"), pkgfile);
            assert.equal(test.resolve("tests.js"), __filename);
        });
        it('using array arg', function(){
            var test = new paths([__dirname, topDir]);
            assert.equal(test.resolve("package.json"), pkgfile);
            assert.equal(test.resolve("tests.js"), __filename);
        });
        it('using function arg', function(){
            var test = new paths(function(script) {
                return script + ".json";
            });
            test.add([__dirname, topDir]);
            assert.equal(test.resolve("package"), pkgfile);
        });
        it('string arg', function(){
            instance = new paths(topDir);
            assert.equal(instance.resolve("package.json"), pkgfile);
        });
        it('paths arg', function(){
            instance = new paths(instance);
            assert.equal(instance.resolve("package.json"), pkgfile);
        });
        it('unknown type error', function(){
            try {
                new paths(new Date());
                throw new Error("Didn't fail");
            } catch(e) {
                if(!/Cannot handle /.test(e.message))
                    throw e;
            }
        });
    });
    describe('static methods', function() {
        it('isInstance, wrap', function(){
            assert.equal(paths.isInstance(instance), true);
            assert.equal(paths.wrap(instance), instance);
            assert.equal(paths.wrap(topDir).at(0), topDir);
            assert.equal(instance.count(), 1);
        });
    });
    describe('instance methods', function() {
        it('get, count, clear', function(){
            if(!instance.get(instance).at(0))
                throw new Error("Contains no paths");
            var cPaths = instance.get(__dirname);
            assert.equal(cPaths.at(0), __dirname);
            assert.equal(instance.get(cPaths, topDir).count(), 2);
            assert.equal(instance.get([__dirname, supportDir]).count(), 3);
            assert.equal(instance.get(), instance);
            instance.clear();
            assert.equal(instance.count(), 0);
        });
        it('get error', function(){
            try {
                instance.get(new Date());
                throw new Error("Didn't fail");
            } catch(e) {
                if(!/Cannot handle /.test(e.message))
                    throw e;
            }
        });
        it('add, has', function(){
            instance.add(supportDir, topDir);
            assert.equal(instance.has(supportDir), true);
            assert.equal(instance.has(topDir), true);
            instance.add(topDir);
            
            instance.add(new paths(__dirname, topDir, supportDir));
            instance.add(instance);
            instance.add([]);
            instance.add();
            
            assert.equal(instance.count(), 3);
        });
        it('add error', function(){
            try {
                instance.add(new Date());
                throw new Error("Didn't fail");
            } catch(e) {
                if(!/Cannot handle /.test(e.message))
                    throw e;
            }
        });
            
        it('forEach', function(){
            var ran = 0;
            instance.forEach(function() {
                ran ++;
            });
            if(ran < 3)
                throw new Error("Expected to loop at least 3 times");
        });
        it('remove, has', function(){
            instance.remove(new paths(__dirname));
            assert.equal(instance.has(__dirname), false);
            assert.equal(instance.has(supportDir), true);
            assert.equal(instance.has(topDir), true);
            instance.remove([topDir, __dirname]);
            assert.equal(instance.has(supportDir), true);
            assert.equal(instance.has(topDir), false);
            instance.remove(topDir, __dirname);
            instance.remove(instance);
            assert.equal(instance.has(supportDir), false);
            instance.remove(topDir);
            
            assert.equal(instance.count(), 0);
        });
        it('remove error', function(){
            try {
                instance.remove(new Date());
                throw new Error("Didn't fail");
            } catch(e) {
                if(!/Cannot handle /.test(e.message))
                    throw e;
            }
        });
        it('has error', function(){
            try {
                instance.has(new Date());
                throw new Error("Didn't fail");
            } catch(e) {
                if(!/Cannot handle /.test(e.message))
                    throw e;
            }
        });
        it('toString', function(){
            assert.equal(instance.toString(), JSON.stringify([]));
        });
        it('resolve', function(){
            instance.add(topDir);
            assert.equal(instance.resolve("package.json"),
                            pkgfile, instance);
            instance.add(supportDir);
            assert.equal(instance.resolve("env.js"),
                         path.resolve(supportDir, "env.js"),
                        instance);
        });
        it('resolver function', function(){
            instance = new paths(function(input) {
                if(!/\.\w{2,5}$/.test(input))
                   return input + ".js";
                return input;
            });
        });
        it('resolver function error', function(){
            try {
                instance = new paths(function() {
                    throw new Error();
                }, function() {
                    throw new Error();
                });
                throw new Error("Didn't fail");
            } catch(e) {
                if(!/Only one resolver is supported per instance/.test(e.message))
                    throw e;
            }
        });
        it('resolve with resolvers', function(){
            instance.add(topDir);
            assert.equal(instance.resolve("package.json"),
                                        pkgfile, instance);
            assert.equal(instance.resolve("env", supportDir),
                         path.resolve(supportDir, "env.js"),
                        instance);
            instance.add(supportDir);
            assert.equal(instance.resolve("env.js"),
                         path.resolve(supportDir, "env.js"),
                        instance);
            try {
                instance.resolve("farmer");
                throw new Error("Didn't fail");
            } catch(e) {
                if(!/Cannot resolve `farmer.js` /.test(e.message))
                    throw e;
            }
            try {
                var resolver = function(_path, next) {
                    next();
                };
                resolver.toString = function() {
                    return "manson";
                };
                
                instance.resolve(resolver, instance);
            } catch(e) {
                if(!/Cannot resolve `manson` /.test(e.message))
                    throw e;
            }
            assert.equal((new paths()).resolve("env.js",
                            ["not-there", __dirname], true),
                         path.resolve(supportDir, "env.js"), instance);
        });
        it('resolveAsync (-NotImplemented)', function(){
            try {
                instance.resolveAsync("death");
                throw new Error("Didn't fail");
            } catch(e) {
                if(!/Not implemented yet/.test(e.message))
                    throw e;
            }
        });
        it('contaminate _paths', function(){
            instance._paths.push(new Date());
            try {
                instance.resolve("env");
            } catch(e) {
                if(!/Arguments to path.resolve must be strings/.test(e.message))
                    throw e;
            }
        });
        it('verify resolve order');
    });
        

});
