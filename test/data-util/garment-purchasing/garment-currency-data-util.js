"use strict";
var ObjectId = require("mongodb").ObjectId;

class garmentCurrencyDataUtil {

    getNewData() {
        var datas = [];

        var data = [
            ["Mata Uang", "Kurs"],
            ["TEST", "9"],
            ["test2","1"],
            ["test3","2"],
        ];

        return Promise.resolve(data);
    }
}
module.exports = new garmentCurrencyDataUtil();