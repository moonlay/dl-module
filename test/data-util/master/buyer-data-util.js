"use strict";
var _getSert = require("../getsert");
var generateCode = require("../../../src/utils/code-generator");

class BuyerDataUtil {
    getSert(input) {
        var ManagerType = require("../../../src/managers/master/buyer-manager");
        return _getSert(input, ManagerType, (data) => {
            return {
                code: data.code
            };
        });
    }

    getNewData() {
        var Model = require("dl-models").master.Buyer;
        var data = new Model();

        var code = generateCode();

        data.code = code;
        data.name = `name[${code}]`;
        data.address = `address[${code}]`;
        data.country = `country[${code}]`;
        data.contact = `contact[${code}]`;
        data.tempo = "30";
        data.type = "Export";
        return Promise.resolve(data);
    }

    getTestData() {
        var data = {
            code: "UT/BUY/01",
            name: "Buyer 01",
            address: "152 La Sierra Street Land O Lakes, FL 34639",
            country: "US",
            contact: "Mr. John Doe.",
            tempo: "30"
        };
        return this.getSert(data);
    }
}
module.exports = new BuyerDataUtil();
