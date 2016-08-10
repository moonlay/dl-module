var helper = require("../helper");
var SparepartManager = require("../../src/managers/core/sparepart-manager");
var instanceManager = null;
require("should");

function getData() {
    var Sparepart = require('dl-models').core.Sparepart;
    var sparepart = new Sparepart();

    var now = new Date();
    var stamp = now / 1000 | 0;
    var code = stamp.toString(36);

    sparepart.code = code;
    sparepart.name = `name[${code}]`;
    sparepart.description = `description for ${code}`;

    return supplier;
}