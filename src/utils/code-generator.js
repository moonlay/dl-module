var ObjectId = require('mongodb').ObjectId;
var Hashids = require("hashids");
var moment = require("moment");

module.exports = function() {
 
    var salt = new ObjectId().toString();
 
    var hashids = new Hashids(salt, 8, "ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890");
    var now = moment();
    var begin = now.clone().startOf("month");
    var diff = now.diff(begin);
    var code = `${hashids.encode(diff)}`;

    return code;
};
