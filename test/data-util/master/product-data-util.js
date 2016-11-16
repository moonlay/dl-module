'use strict';
var _getSert = require('./getsert');
var uom = require('./uom-data-util'); 

class ProductDataUtil {
    getSert(product) {
        var ProductManager = require('../../../src/managers/master/product-manager');
        return Promise.resolve(_getSert(product, ProductManager, data => {
            return {
                code: data.code
            };
        }));
    }

    getTestData() {
        return new Promise((resolve, reject) => {
            uom.getTestData()
                .then(uom => {
                    var testData = {
                        code: 'P01-UT',
                        name: 'Product 01',
                        price: 1250,
                        description: 'Product untuk unit test',
                        uomId: uom._id,
                        uom: uom,
                        tags: '#unit-test, #product'
                    };

                    this.getSert(testData)
                        .then(data => {
                            resolve(data);
                        })
                        .catch(e => {
                            reject(e);
                        });
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    getTestData2() {
        return new Promise((resolve, reject) => {
            uom.getTestData()
                .then(uom => {
                    var testData = {
                        code: 'P02-UT',
                        name: 'Product 02',
                        price: 8500,
                        description: 'Product untuk unit test',
                        uomId: uom._id,
                        uom: uom,
                        tags: '#unit-test, #product'
                    };

                    this.getSert(testData)
                        .then(data => {
                            resolve(data);
                        })
                        .catch(e => {
                            reject(e);
                        });
                })
                .catch(e => {
                    reject(e);
                });
        });
    }
}

module.exports = new ProductDataUtil();
