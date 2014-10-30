var assert = require('assert');
var child_process = require("child_process");
var path = require('path');

var pkg;
var topDir = path.dirname(__dirname);
it('parse package.json', function(){
    var pkgfile = path.resolve(topDir, "package.json");
    pkg = require(pkgfile);
    if(!pkg)
        throw new Error("Failed to parse `" + rel + "`");
    if(!("main" in pkg))
        throw new Error("`" + rel + "` missing property `main`");
});
var paths;
it("require main", function(){
    paths = require(topDir);
});
describe('api', function() {
    var instance;
    describe('create', function() {
        it('using multiple args', function(){
            var test = new paths(__dirname, topDir);
            assert.equal(test.resolve("package.json"),
                         path.resolve(topDir, "package.json"));
            assert.equal(test.resolve("tests.js"), __filename);
        });
        it('using array arg', function(){
            var test = new paths([__dirname, topDir]);
            assert.equal(test.resolve("package.json"),
                         path.resolve(topDir, "package.json"));
            assert.equal(test.resolve("tests.js"), __filename);
        });
        it('using function arg', function(){
            var test = new paths(function(script) {
                return script + ".json";
            });
            test.add([__dirname, topDir]);
            assert.equal(test.resolve("package"),
                         path.resolve(topDir, "package.json"));
        });
        it('string arg', function(){
            instance = new paths(topDir);
            assert.equal(instance.resolve("package.json"),
                         path.resolve(topDir, "package.json"));
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
    describe('other', function() {
        it('isInstance, wrap', function(){
            assert.equal(paths.isInstance(instance), true);
            assert.equal(paths.wrap(instance), instance);
            assert.equal(paths.wrap(topDir).at(0), topDir);
            assert.equal(instance.count(), 1);
        });
        it('get, count', function(){
            assert.equal(instance.get(__dirname).at(0), __dirname);
            assert.equal(instance.get(__dirname, topDir).count(), 2);
            assert.equal(instance.get([__dirname, path.resolve(topDir, "lib")]).count(), 3);
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
        it('add', function(){
            instance.add(path.resolve(topDir, "lib"), topDir);
            instance.add(new paths(__dirname));
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
        it('remove', function(){
            instance.remove([topDir, __dirname]);
            instance.remove(topDir, __dirname, path.resolve(topDir, "lib"));
            instance.remove(new paths());
            instance.remove(instance);
            instance.remove(topDir);
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
        it('forEach', function(){
            instance.forEach(function() {
                throw new Error("Should be empty");
            });
        });
    });

});
