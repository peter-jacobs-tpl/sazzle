/*!
 * test/test-session.js - SASL Session Tests
 */

var promised_io = require("promised-io"),
    SASLSession = require("../lib/session.js").SASLSession;

module.exports = {
    "test create" : function(test) {
        var mech = {
            "name": "mech",
            "stepStart" : function(config) {
                var deferred = new promised_io.Deferred();
                deferred.resolve(new Buffer("client initial"));
                return deferred.promise;
            }
        };
        var config,
            session;

        config = {};
        session = new SASLSession(mech, config);
        test.equal(session.mechanism, mech.name);
        test.notStrictEqual(session.config, config);
        test.ok(!session.completed);
        test.equal(session.config.state, "start");

        config = { state:"complete" };
        session = new SASLSession(mech, config);
        test.equal(session.mechanism, mech.name);
        test.notStrictEqual(session.config, config);
        test.ok(!session.completed);
        test.equal(session.config.state, "start");

        config = {
            username:"bilbo.baggins",
            password:"! 84G3nd"
        };
        session = new SASLSession(mech, config);
        config.state = "start";
        test.equal(session.mechanism, mech.name);
        test.notStrictEqual(session.config, config);
        test.ok(!session.completed);
        test.deepEqual(session.config, config);

        session = new SASLSession(mech);
        test.equal(session.mechanism, mech.name);
        test.ok(session.config);
        test.ok(!session.completed);
        test.equal(session.config.state, "start");

        test.done();
    },
    "test step single-stage success": function(test) {
        var config,
            session;
        var mech = {
            name : "MOCK-MECH",
            stepStart: function(config, input) {
                test.strictEqual(config, session.config);
                test.ok(!input);
                test.equal(config.state, "start");

                config.state = "complete";
                var deferred = new promised_io.Deferred();
                deferred.resolve(new Buffer("client initial"));
                return deferred.promise;
            }
        };
        config = {};
        session = new SASLSession(mech, config);
        var promise = session.step();
        test.ok(promise);
        test.equal(typeof(promise.then), "function");
        promise.then(function(output) {
            test.ok(output instanceof Buffer);
            test.equal(output.toString(), "client initial");
            test.ok(session.completed);
            test.done();
        }, function(err) {
            test.fail(err && err.message);
            test.done();
        });
    },
    "test step single-stage success (config data)": function(test) {
        var config,
            session;
        var mech = {
            name : "MOCK-MECH",
            stepStart: function(config, input) {
                test.strictEqual(config, session.config);
                test.ok(!input);
                test.equal(config.state, "start");

                config.state = "complete";
                var deferred = new promised_io.Deferred();
                deferred.resolve(new Buffer("client initial:" +
                                            config.username + ":" +
                                            config.password));
                return deferred.promise;
            }
        };
        config = {username:"bilbo.baggins", password:"! 84G3nd"};
        session = new SASLSession(mech, config);
        var promise = session.step();
        test.ok(promise);
        test.equal(typeof(promise.then), "function");
        promise.then(function(output) {
            test.ok(output instanceof Buffer);
            test.equal(output.toString(), "client initial:bilbo.baggins:! 84G3nd");
            test.ok(session.completed);
            test.done();
        }, function(err) {
            test.fail(err && err.message);
            test.done();
        });
    },
    "test step single-stage failure (from mech)": function(test) {
        var config,
            session;
        var mech = {
            name : "MOCK-MECH",
            stepStart: function(config, input) {
                test.strictEqual(config, session.config);
                test.ok(!input);
                test.equal(config.state, "start");

                var deferred = new promised_io.Deferred();
                deferred.reject(new Error("mechanism failure"));
                return deferred.promise;
            }
        };
        config = {};
        session = new SASLSession(mech, config);
        var promise = session.step();
        test.ok(promise);
        test.equal(typeof(promise.then), "function");
        promise.then(function(output) {
            test.fail();
            test.done();
        }, function(err) {
            test.ok(err instanceof Error);
            test.equal(err.message, "mechanism failure");
            test.ok(session.completed);
            test.done();
        });
    },
    "test step single-stage failure (invalid state)": function(test) {
        var config,
            session;
        var mech = {
            name : "MOCK-MECH",
            stepStart: function(config, input) {
                test.strictEqual(config, session.config);
                test.ok(!input);
                test.equal(config.state, "start");

                config.state = "complete";
                var deferred = new promised_io.Deferred();
                deferred.resolve(new Buffer("client initial"));
                return deferred.promise;
            }
        };
        config = {};
        session = new SASLSession(mech, config);
        var promise = session.step();
        test.ok(promise);
        test.equal(typeof(promise.then), "function");
        promise.then(function(output) {
            test.ok(output instanceof Buffer);
            test.equal(output.toString(), "client initial");
            test.ok(session.completed);
        }, function(err) {
            test.fail(err && err.message);
            test.done();
        });

        promise = session.step();
        test.ok(promise);
        test.equal(typeof(promise.then), "function");
        promise.then(function(output) {
            test.fail();
            test.done();
        }, function(err) {
            test.ok(err instanceof Error);
            test.equal(err.message, "invalid state");
            test.ok(session.completed);
            test.done();
        });
    },
    "test step multi-stage success": function(test) {
        var config,
            session;
        var mech = {
            name : "MOCK-MECH",
            stepStart: function(config, input) {
                test.strictEqual(config, session.config);
                test.ok(!input);
                test.equal(config.state, "start");

                config.state = "next";
                var deferred = new promised_io.Deferred();
                deferred.resolve(new Buffer("client initial"));
                return deferred.promise;
            },
            stepNext: function(config, input) {
                test.strictEqual(config, session.config);
                test.ok(input instanceof Buffer);
                test.equal(input.toString(), "server initial");

                config.state = "complete";
                var deferred = new promised_io.Deferred();
                deferred.resolve(new Buffer("client next"));
                return deferred.promise;
            }
        };
        config = {};
        session = new SASLSession(mech, config);
        var promise = session.step();
        test.ok(promise);
        test.equal(typeof(promise.then), "function");
        promise.then(function(output) {
            test.ok(output instanceof Buffer);
            test.equal(output.toString(), "client initial");
            test.ok(!session.completed);
        }, function(err) {
            test.fail(err && err.message);
            test.done();
        });

        promise = session.step(new Buffer("server initial"));
        test.ok(promise);
        test.equal(typeof(promise.then), "function");
        promise.then(function(output) {
            test.ok(output instanceof Buffer);
            test.equal(output.toString(), "client next");
            test.ok(session.completed);
            test.done();
        }, function(err) {
            test.fail(err && err.message);
            test.done();
        });
    },
    "test step multi-stage success (string input 'binary')": function(test) {
        var config,
            session;
        var mech = {
            name : "MOCK-MECH",
            stepStart: function(config, input) {
                test.strictEqual(config, session.config);
                test.ok(!input);
                test.equal(config.state, "start");

                config.state = "next";
                var deferred = new promised_io.Deferred();
                deferred.resolve(new Buffer("client initial"));
                return deferred.promise;
            },
            stepNext: function(config, input) {
                test.strictEqual(config, session.config);
                test.ok(input instanceof Buffer);
                test.equal(input.toString(), "server initial");

                config.state = "complete";
                var deferred = new promised_io.Deferred();
                deferred.resolve(new Buffer("client next"));
                return deferred.promise;
            }
        };
        config = {};
        session = new SASLSession(mech, config);
        var promise = session.step();
        test.ok(promise);
        test.equal(typeof(promise.then), "function");
        promise.then(function(output) {
            test.ok(output instanceof Buffer);
            test.equal(output.toString(), "client initial");
            test.ok(!session.completed);
        }, function(err) {
            test.fail(err && err.message);
            test.done();
        });

        promise = session.step("server initial", "binary");
        test.ok(promise);
        test.equal(typeof(promise.then), "function");
        promise.then(function(output) {
            test.ok(output instanceof Buffer);
            test.equal(output.toString(), "client next");
            test.ok(session.completed);
            test.done();
        }, function(err) {
            test.fail(err && err.message);
            test.done();
        });
    },
    "test step multi-stage success (string input base64)": function(test) {
        var config,
            session;
        var mech = {
            name : "MOCK-MECH",
            stepStart: function(config, input) {
                test.strictEqual(config, session.config);
                test.ok(!input);
                test.equal(config.state, "start");

                config.state = "next";
                var deferred = new promised_io.Deferred();
                deferred.resolve(new Buffer("client initial"));
                return deferred.promise;
            },
            stepNext: function(config, input) {
                test.strictEqual(config, session.config);
                test.ok(input instanceof Buffer);
                test.equal(input.toString(), "server initial");

                config.state = "complete";
                var deferred = new promised_io.Deferred();
                deferred.resolve(new Buffer("client next"));
                return deferred.promise;
            }
        };
        config = {};
        session = new SASLSession(mech, config);
        var promise = session.step();
        test.ok(promise);
        test.equal(typeof(promise.then), "function");
        promise.then(function(output) {
            test.ok(output instanceof Buffer);
            test.equal(output.toString(), "client initial");
            test.ok(!session.completed);
        }, function(err) {
            test.fail(err && err.message);
            test.done();
        });

        promise = session.step("c2VydmVyIGluaXRpYWw=", "base64");
        test.ok(promise);
        test.equal(typeof(promise.then), "function");
        promise.then(function(output) {
            test.ok(output instanceof Buffer);
            test.equal(output.toString(), "client next");
            test.ok(session.completed);
            test.done();
        }, function(err) {
            test.fail(err && err.message);
            test.done();
        });
    },
    "test step multi-stage success (string input hex)": function(test) {
        var config,
            session;
        var mech = {
            name : "MOCK-MECH",
            stepStart: function(config, input) {
                test.strictEqual(config, session.config);
                test.ok(!input);
                test.equal(config.state, "start");

                config.state = "next";
                var deferred = new promised_io.Deferred();
                deferred.resolve(new Buffer("client initial"));
                return deferred.promise;
            },
            stepNext: function(config, input) {
                test.strictEqual(config, session.config);
                test.ok(input instanceof Buffer);
                test.equal(input.toString(), "server initial");

                config.state = "complete";
                var deferred = new promised_io.Deferred();
                deferred.resolve(new Buffer("client next"));
                return deferred.promise;
            }
        };
        config = {};
        session = new SASLSession(mech, config);
        var promise = session.step();
        test.ok(promise);
        test.equal(typeof(promise.then), "function");
        promise.then(function(output) {
            test.ok(output instanceof Buffer);
            test.equal(output.toString(), "client initial");
            test.ok(!session.completed);
        }, function(err) {
            test.fail(err && err.message);
            test.done();
        });

        promise = session.step("73657276657220696e697469616c", "hex");
        test.ok(promise);
        test.equal(typeof(promise.then), "function");
        promise.then(function(output) {
            test.ok(output instanceof Buffer);
            test.equal(output.toString(), "client next");
            test.ok(session.completed);
            test.done();
        }, function(err) {
            test.fail(err && err.message);
            test.done();
        });
    },
    "test step multi-stage success (string input implicit)": function(test) {
        var config,
            session;
        var mech = {
            name : "MOCK-MECH",
            stepStart: function(config, input) {
                test.strictEqual(config, session.config);
                test.ok(!input);
                test.equal(config.state, "start");

                config.state = "next";
                var deferred = new promised_io.Deferred();
                deferred.resolve(new Buffer("client initial"));
                return deferred.promise;
            },
            stepNext: function(config, input) {
                test.strictEqual(config, session.config);
                test.ok(input instanceof Buffer);
                test.equal(input.toString(), "server initial");

                config.state = "complete";
                var deferred = new promised_io.Deferred();
                deferred.resolve(new Buffer("client next"));
                return deferred.promise;
            }
        };
        config = {};
        session = new SASLSession(mech, config);
        var promise = session.step();
        test.ok(promise);
        test.equal(typeof(promise.then), "function");
        promise.then(function(output) {
            test.ok(output instanceof Buffer);
            test.equal(output.toString(), "client initial");
            test.ok(!session.completed);
        }, function(err) {
            test.fail(err && err.message);
            test.done();
        });

        // assume base64
        promise = session.step("c2VydmVyIGluaXRpYWw=");
        test.ok(promise);
        test.equal(typeof(promise.then), "function");
        promise.then(function(output) {
            test.ok(output instanceof Buffer);
            test.equal(output.toString(), "client next");
            test.ok(session.completed);
            test.done();
        }, function(err) {
            test.fail(err && err.message);
            test.done();
        });
    }
}