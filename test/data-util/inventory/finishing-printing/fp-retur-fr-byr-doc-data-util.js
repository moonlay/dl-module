'use strict'
var helper = require("../../../helper");
var FPReturManager = require("../../../../src/managers/inventory/finishing-printing/fp-retur-fr-byr-doc-manager");
var ShipmentDataUtil = require('./fp-shipment-document-data-util');

var codeGenerator = require('../../../../src/utils/code-generator');

// DB Models
var Models = require("dl-models");
var Map = Models.map;
var FPReturFromBuyerModels = Models.inventory.finishingPrinting.FPReturFromBuyerDoc;
var moment = require("moment");

class FPReturFrByrDocDataUtil {
    getNewData() {
        return Promise.all([ShipmentDataUtil.getNewTestData()])
            .then(results => {
                var _shipmetData = results[0];
                var code = codeGenerator();
                var data = {
                    code : code,
                    destination : 'Pack I',
                    buyerId : _shipmetData.buyerId,
                    buyer : {
                        _id : _shipmetData.buyerId,
                        code : _shipmetData.buyerCode,
                        name : _shipmetData.buyerName,
                        address : _shipmetData.buyerAddress,
                        type : _shipmetData.buyerType
                    },
                    date :moment(new Date()).format('YYYY-MM-DD'),
                    spk : `spk ${code}`,
                    coverLetter : `sp ${code}`,
                    codeProduct : `code ${code}`,
                    details : [{
                        productionOrderId : _shipmetData.details[0].productionOrderId,
                        productionOrderNo : _shipmetData.details[0].productionOrderNo,
                        items : [{
                            productId:_shipmetData.details[0].items[0].productId,
                            productCode:_shipmetData.details[0].items[0].productCode,
                            productName:_shipmetData.details[0].items[0].productName,
                            productDescription:'',
                            hasNewProduct : false,
                            designNumber:_shipmetData.details[0].items[0].designNumber,
                            designCode:_shipmetData.details[0].items[0].designCode,
                            remark:`Ket ${code}`,
                            colorWay:_shipmetData.details[0].items[0].colorType,
                            returQuantity:2,
                            uomId:_shipmetData.details[0].items[0].uomId,
                            uom:_shipmetData.details[0].items[0].uomUnit,
                            length:2,
                            weight:2
                        }]
                    }]
                };

                return Promise.resolve(data);
            });
    }

    getNewTestData() {
        return helper
            .getManager(FPReturManager)
            .then((manager) => {
                return this.getNewData().then((data) => {
                    return manager.create(data)
                        .then((id) => {
                            return manager.getSingleById(id)
                        });
                });
            });
    }
}
module.exports = new FPReturFrByrDocDataUtil();