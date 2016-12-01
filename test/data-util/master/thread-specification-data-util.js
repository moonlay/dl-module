"use strict";
var _getSert = require("./getsert");
var product = require("./product-data-util");

class ThreadSpecificationDataUtil {
    getSert(input) {
        var ManagerType = require("../../../src/managers/master/thread-specification-manager");
        return _getSert(input, ManagerType, (data) => {
            return {
                productId: data.productId
            };
        });
    }

    getNewData() {
        return product.getRandomTestData()
            .then(product => {

                var data = {
                    productId: product._id,
                    product: product,
                    rpm: 50,
                    spindle: 80,
                    tpi: 10
                };
                return Promise.resolve(data);
            });
    }

    getTestData() {
        return product.getTestData()
            .then(div => {
                var data = {
                    productId: div._id,
                    product: div,
                    rpm: 125,
                    spindle: 150,
                    tpi: 15
                };
                return this.getSert(data);
            });
    }
}
module.exports = new ThreadSpecificationDataUtil();
