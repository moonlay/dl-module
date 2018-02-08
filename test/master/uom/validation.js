'use strict';

var should = require('should');
var helper = require("../../helper");
var UomManager = require("../../../src/managers/master/uom-manager");
var uomManager = null;

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            uomManager = new UomManager(db, {
                username: 'unit-test'
            });
            done();
        })
        .catch(e => {
            done(e);
        })
});

it("#03. should success when search with keyword", function (done) {
    manager.read({ keyword: "Moonlay Technologies" })
        .then((results) => {
            done();
        })
        .catch((e) => {
            done(e);
        });
});