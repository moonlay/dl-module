'use strict'
var helper = require('../../helper');
var CustomsManager = require('../../../src/managers/garment-purchasing/customs-manager');
var poExternalManager = require('../../../src/managers/garment-purchasing/purchase-order-external-manager');

var codeGenerator = require('../../../src/utils/code-generator');
var deliveryOrderDataUtil = require('./delivery-order-data-util');
var ObjectId = require("mongodb").ObjectId;

class CustomsDataUtil {
    getNewData() {

        return helper
            .getManager(poExternalManager)
            .then(manager => {
                return Promise.all([deliveryOrderDataUtil.getNewTestData()])
                    .then(results => {
                        var dOrder = results[0];
                        var poExtId;
                        for(var data of dOrder.items){
                            poExtId = data.purchaseOrderExternalId;
                        }
                        return manager.getSingleByIdOrDefault(poExtId)
                            .then(dataPoExt => {
                                var code = codeGenerator();
                                var date = new Date();
                                var data = {
                                    no: `UT/Customs/${code}`,
                                    customsDate: date,
                                    validateDate: date,
                                    supplierId: dOrder.supplier._id,
                                    supplier: dOrder.supplier,
                                    amountOfPackaging: 10,
                                    packaging: 'BOX',
                                    bruto: 20,
                                    netto: 15,
                                    currencyId: dataPoExt.currency._id,
                                    currency: dataPoExt.currency,
                                    customsOrigin: '',
                                    customsType: 'BC 262',
                                    deliveryOrders: [dOrder]
                                };
                                return Promise.resolve(data);
                            });
                    });
            })
        }

    getNewTestData() {
        return helper
            .getManager(CustomsManager)
            .then((manager) => {
                return this.getNewData().then((data) => {
                    return manager.create(data)
                        .then((id) => manager.getSingleById(id));
                });
            });
    }

}

module.exports = new CustomsDataUtil();