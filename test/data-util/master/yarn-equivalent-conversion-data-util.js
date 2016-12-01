"use strict";
var _getSert = require("./getsert");

class YarnEquivalentConversionDataUtil {
    getSert(input) {
        var ManagerType = require("../../../src/managers/master/yarn-equivalent-ratio-manager");
        return _getSert(input, ManagerType, (data) => {
            return {
                ne: data.ne
            };
        });
    }

    getNewData() {
        var Model = require('dl-models').master.YarnEquivalentConversion;
        var data = new Model();
        data.ne = new Date().getTime();
        data.conversionRatio = new Date().getTime();

        return Promise.resolve(data);
    }

    getTestData() {
        var data = {
            ne: 2,
            conversionRatio: 5
        };
        return this.getSert(data);
    }
}
module.exports = new YarnEquivalentConversionDataUtil();
