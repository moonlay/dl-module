"use strict";
var _getSert = require("../getsert");
var uom = require("./uom-data-util");
var currency = require("./currency-data-util");
var generateCode = require("../../../src/utils/code-generator");

class ProductDataUtil {
    getSert(input) {
        var ManagerType = require("../../../src/managers/master/garment-product-manager");
        return _getSert(input, ManagerType, (data) => {
            return {
                code: data.code
            };
        });
    }

    getNewData() {

        return Promise.all([uom.getTestData(), currency.getTestData()])
            .then((results) => {
                var uom = results[0];
                var currency = results[1];

                var code = generateCode();

                var data = {
                    code: code,
                    name: `UT/PRODUCT/NAME[${code}]`,
                    price: 1250,
                    uomId: uom._id,
                    uom: uom,
                    currencyId: currency._id,
                    currency: currency,
                    description: `description for ${code}`,
                    tags: `tags for ${code}`,
                    properties: ["104X72", "75DX100D", "48"]
                };
                return Promise.resolve(data);
            });
    }

    getRandomTestData() {
        return this.getNewData()
            .then((data) => {
                return this.getSert(data);
            });
    }

    getTestData() {
        return this.getNewData()
            .then((data) => {
                data.code = "PRD-UT-01";
                data.name = "Product Unit Test 01";
                data.price = 1250; W
                data.description = "Product untuk unit test";
                data.tags = "#unit-test, #product";

                return this.getSert(data);
            });
    }

    getTestData2() {
        return this.getNewData()
            .then((data) => {
                data.code = "PRD-UT-02";
                data.name = "Product Unit Test 02";
                data.price = 4250;
                data.description = "Product untuk unit test";
                data.tags = "#unit-test, #product";

                return this.getSert(data);
            });
    }
}
module.exports = new ProductDataUtil();
