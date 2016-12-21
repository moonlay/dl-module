"use strict";
var _getSert = require("../getsert");
var product = require("./product-data-util");

var gradeA = {
    thin: 5,
    thick: 10,
    neps: 15,
    grade: "A"
};
var gradeB = {
    thin: 10,
    thick: 20,
    neps: 30,
    grade: "B"
};
var gradeC = {
    thin: 15,
    thick: 30,
    neps: 45,
    grade: "C"
};
var gradeD = {
    thin: 20,
    thick: 40,
    neps: 60,
    grade: "D"
};
var gradeE = {
    thin: 25,
    thick: 50,
    neps: 75,
    grade: "E"
};

class UsterDataUtil {
    getSert(input) {
        var ManagerType = require("../../../src/managers/master/uster-manager");
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
                    classifications: [gradeA, gradeB, gradeC, gradeD, gradeE]
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
                    classifications: [gradeA, gradeB, gradeC, gradeD, gradeE]
                };

                return this.getSert(data);
            });
    }
}
module.exports = new UsterDataUtil();
