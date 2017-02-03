'use strict'
var helper = require('../../helper');
var ProductionOrderManager = require('../../../src/managers/sales/production-order-manager');
var codeGenerator = require('../../../src/utils/code-generator');
var buyer = require('../master/buyer-data-util');
var uom = require('../master/uom-data-util');
var orderType = require('../master/order-type-data-util');
var processType = require('../master/process-type-data-util');
var colorType = require('../master/color-type-data-util');
var lampStandard = require('../master/lamp-standard-data-util');
var material = require('../master/product-data-util');

class ProductionOrderDataUtil {
    getNewData() {
        return Promise.all([uom.getTestData(), buyer.getTestData(), lampStandard.getTestData(), processType.getTestData(), material.getTestData(), colorType.getTestData(), colorType.getTestData2()])
            .then((results) => {
                var _uom = results[0];
                var _buyer = results[1];
                var _lampStandard = results[2];
                var _processType = results[3];
                var _material = results[4];
                var color1=results[5];
                var color2=results[6];

                var data = {
                    
                    salesContractNo: `UT/Prod/1KQ3VP57`,
                    orderNo: `orderNo/${codeGenerator()}`,
                    uomId: _uom._id,
                    uom: _uom,
                    buyerId: _buyer._id,
                    buyer: _buyer,
                    lampStandardId: _lampStandard._id,
                    lampStandard: _lampStandard,
                    isExport:true,
                    processType: _processType,
                    processTypeId: _processType._id,
                    orderType: _processType.orderType,
                    orderTypeId: _processType.orderType._id,
                    construction:`construction/${codeGenerator()}`,
                    material:_material,
                    materialId:_material._id,
                    orderQuantity:30,
                    spelling:5,

                    originGreigeFabric:`greige`,
                    finishWidth:`width`,
                    design:`design`,
                    handlingStandard:`handling`,
                    RUN:`run`,
                    shrinkageStandard:`shrink`,
                    rollLength:`length`,
                    sample:`sample`,
                    deliveryDate:new Date(),
                    remark:`desc`,
                    isUsed:false,
                    details: [{
                        code:`code1/${codeGenerator()}`,
                        colorTypeId:color1._id,
                        colorType:color1,
                        colorRequest:`reddish`,
                        colorTemplate:`template1`,
                        quantity:10,
                        uomId: _uom._id,
                        uom:_uom,
                    }, {
                        code:`code2/${codeGenerator()}`,
                        colorTypeId:color2._id,
                        colorType:color2,
                        colorRequest:`gray`,
                        colorTemplate:`template2`,
                        quantity:20,
                        uomId: _uom._id,
                        uom:_uom,
                    }]
                };
                return Promise.resolve(data);
            });
    }

    getNewTestData(isSingleDetail) {
        return helper
            .getManager(ProductionOrderManager)
            .then((manager) => {
                return this.getNewData().then((data) => {
                    return manager.create(data)
                        .then((id) => manager.getSingleById(id));
                });
            });
    }
}
module.exports = new ProductionOrderDataUtil();