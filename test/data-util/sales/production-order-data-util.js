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
var standardTest = require('../master/standard-test-data-util');
var yarnMaterial = require('../master/yarn-material-data-util');
var finishType = require('../master/finish-type-data-util');
var materialConstruction = require('../master/material-construction-data-util');
var account = require('../auth/account-data-util');
var fpSC = require('./finishing-printing-sales-contract-data-util');

class ProductionOrderDataUtil {
    getNewData(dataSupport) {
        var fpSCTestData = !dataSupport ? fpSC.getNewTestData() : dataSupport.salesContract ? Promise.resolve(null) : fpSC.getNewTestData();
        return Promise.resolve(fpSCTestData).then(fp => {
            var buyerTestData = !dataSupport ? buyer.getTestData() : dataSupport.buyer ? Promise.resolve(null) : buyer.getTestData();
            var processTestData = !dataSupport ? processType.getTestData() : dataSupport.process ? Promise.resolve(null) : processType.getTestData();
            var accountTestData = !dataSupport ? account.getTestData() : dataSupport.account ? Promise.resolve(null) : account.getTestData();

            return Promise.all([uom.getTestData(), buyerTestData, lampStandard.getTestData(), lampStandard.getTestData2(), processTestData, material.getTestData(), colorType.getTestData(), colorType.getTestData2(), standardTest.getTestData(), finishType.getTestData(), yarnMaterial.getTestData(), materialConstruction.getTestData(), accountTestData])
                .then((results) => {
                    var _uom = results[0];
                    var _buyer = !dataSupport ? results[1] : dataSupport.buyer ? dataSupport.buyer : results[1];
                    var _lampStandard1 = results[2];
                    var _lampStandard2 = results[3];
                    var _processType = !dataSupport ? results[4] : dataSupport.process ? dataSupport.process : results[4];
                    var _material = results[5];
                    var color1 = results[6];
                    var color2 = results[7];
                    var _standard = results[8];
                    var _finish = results[9];
                    var _yarn = results[10];
                    var _construction = results[11];
                    var _account = !dataSupport ? results[12] : dataSupport.account ? dataSupport.account : results[12];


                    var _fp = !dataSupport ? fp : dataSupport.salesContract ? dataSupport.salesContract : fp;
                    var detail = [{
                        code: `code1/${codeGenerator()}`,
                        colorTypeId: color1._id,
                        colorType: color1,
                        colorRequest: `reddish`,
                        colorTemplate: `template1`,
                        quantity: 20,
                        uomId: _uom._id,
                        uom: _uom,
                    }, {
                        code: `code2/${codeGenerator()}`,
                        colorTypeId: color2._id,
                        colorType: color2,
                        colorRequest: `gray`,
                        colorTemplate: `template2`,
                        quantity: 20,
                        uomId: _uom._id,
                        uom: _uom,
                    }];
                    if (dataSupport) {
                        if (dataSupport.isSinggle) {
                            detail = [{
                                code: `code1/${codeGenerator()}`,
                                colorTypeId: color1._id,
                                colorType: color1,
                                colorRequest: `reddish`,
                                colorTemplate: `template1`,
                                quantity: 40,
                                uomId: _uom._id,
                                uom: _uom,
                            }]
                        }
                    }

                    var data = {
                        salesContractNo: _fp.salesContractNo,
                        /* orderNo: `orderNo/${codeGenerator()}`, */
                        uomId: _uom._id,
                        uom: _uom,
                        buyerId: _buyer._id,
                        buyer: _buyer,
                        processType: _processType,
                        processTypeId: _processType._id,
                        orderType: _processType.orderType,
                        orderTypeId: _processType.orderType._id,
                        materialConstructionId: _construction._id,
                        materialConstruction: _construction,
                        salesContractId: _fp._id,
                        material: _material,
                        materialId: _material._id,
                        materialWidth: `40x45`,
                        orderQuantity: 40,
                        shippingQuantityTolerance: 5,
                        accountId: _account._id,
                        account: _account,
                        yarnMaterialId: _yarn._id,
                        yarnMaterial: _yarn,
                        finishTypeId: _finish._id,
                        finishType: _finish,
                        standardTestId: _standard._id,
                        standardTest: _standard,
                        materialOrigin: `greige`,
                        finishWidth: `width`,
                        design: `design`,
                        designCode: `UT\Design`,
                        designNumber: `UT\DesignNumber`,
                        handlingStandard: `handling`,
                        shrinkageStandard: `shrink`,
                        packingInstruction: `length`,
                        sample: `sample`,
                        deliveryDate: new Date(),
                        remark: `desc`,
                        isUsed: false,
                        beforeQuantity: 0,
                        remainingQuantity: _fp.remainingQuantity,
                        lampStandards: [{
                            lampStandardId: _lampStandard1._id,
                            lampStandard: _lampStandard1,
                        },
                        {
                            lampStandardId: _lampStandard2._id,
                            lampStandard: _lampStandard2,
                        }],
                        details: detail
                    };
                    return Promise.resolve(data);

                });
        });
    }

    getWhiteOrderTypeData(dataSupport) {
        var fpSCTestData = !dataSupport ? fpSC.getNewTestData() : dataSupport.salesContract ? Promise.resolve(null) : fpSC.getNewTestData();
        return Promise.resolve(fpSCTestData).then(fp => {
            var buyerTestData = !dataSupport ? buyer.getTestData() : dataSupport.buyer ? Promise.resolve(null) : buyer.getTestData();
            var processTestData = !dataSupport ? processType.getWhiteData() : dataSupport.process ? Promise.resolve(null) : processType.getWhiteData();
            var accountTestData = !dataSupport ? account.getTestData() : dataSupport.account ? Promise.resolve(null) : account.getTestData();

            return Promise.all([uom.getTestData(), buyerTestData, lampStandard.getTestData(), lampStandard.getTestData2(), processTestData, material.getTestData(), colorType.getTestData(), colorType.getTestData2(), standardTest.getTestData(), finishType.getTestData(), yarnMaterial.getTestData(), materialConstruction.getTestData(), accountTestData])
                .then((results) => {
                    var _uom = results[0];
                    var _buyer = !dataSupport ? results[1] : dataSupport.buyer ? dataSupport.buyer : results[1];
                    var _lampStandard1 = results[2];
                    var _lampStandard2 = results[3];
                    var _processType = !dataSupport ? results[4] : dataSupport.process ? dataSupport.process : results[4];
                    var _material = results[5];
                    var color1 = results[6];
                    var color2 = results[7];
                    var _standard = results[8];
                    var _finish = results[9];
                    var _yarn = results[10];
                    var _construction = results[11];
                    var _account = !dataSupport ? results[12] : dataSupport.account ? dataSupport.account : results[12];


                    var _fp = !dataSupport ? fp : dataSupport.salesContract ? dataSupport.salesContract : fp;
                    var detail = [{
                        code: `code1/${codeGenerator()}`,
                        colorTypeId: color1._id,
                        colorType: color1,
                        colorRequest: `reddish`,
                        colorTemplate: `template1`,
                        quantity: 20,
                        uomId: _uom._id,
                        uom: _uom,
                    }, {
                        code: `code2/${codeGenerator()}`,
                        colorTypeId: color2._id,
                        colorType: color2,
                        colorRequest: `gray`,
                        colorTemplate: `template2`,
                        quantity: 20,
                        uomId: _uom._id,
                        uom: _uom,
                    }];
                    if (dataSupport) {
                        if (dataSupport.isSinggle) {
                            detail = [{
                                code: `code1/${codeGenerator()}`,
                                colorTypeId: color1._id,
                                colorType: color1,
                                colorRequest: `reddish`,
                                colorTemplate: `template1`,
                                quantity: 40,
                                uomId: _uom._id,
                                uom: _uom,
                            }]
                        }
                    }

                    var data = {
                        salesContractNo: _fp.salesContractNo,
                        orderNo: `orderNo/${codeGenerator()}`,
                        uomId: _uom._id,
                        uom: _uom,
                        buyerId: _buyer._id,
                        buyer: _buyer,
                        processType: _processType,
                        processTypeId: _processType._id,
                        orderType: _processType.orderType,
                        orderTypeId: _processType.orderType._id,
                        materialConstructionId: _construction._id,
                        materialConstruction: _construction,
                        salesContractId: _fp._id,
                        material: _material,
                        materialId: _material._id,
                        materialWidth: `40x45`,
                        orderQuantity: 40,
                        shippingQuantityTolerance: 5,
                        accountId: _account._id,
                        account: _account,
                        yarnMaterialId: _yarn._id,
                        yarnMaterial: _yarn,
                        finishTypeId: _finish._id,
                        finishType: _finish,
                        standardTestId: _standard._id,
                        standardTest: _standard,
                        materialOrigin: `greige`,
                        finishWidth: `width`,
                        design: `design`,
                        designCode: `UT\Design`,
                        designNumber: `UT\DesignNumber`,
                        handlingStandard: `handling`,
                        shrinkageStandard: `shrink`,
                        packingInstruction: `length`,
                        sample: `sample`,
                        deliveryDate: new Date(),
                        remark: `desc`,
                        isUsed: false,
                        beforeQuantity: 0,
                        remainingQuantity: _fp.remainingQuantity,
                        lampStandards: [{
                            lampStandardId: _lampStandard1._id,
                            lampStandard: _lampStandard1,
                        },
                        {
                            lampStandardId: _lampStandard2._id,
                            lampStandard: _lampStandard2,
                        }],
                        details: detail,
                    };
                    return Promise.resolve(data);

                });
        });
    }

    getDyeingOrderTypeData(dataSupport) {
        var fpSCTestData = !dataSupport ? fpSC.getNewTestData() : dataSupport.salesContract ? Promise.resolve(null) : fpSC.getNewTestData();
        return Promise.resolve(fpSCTestData).then(fp => {
            var buyerTestData = !dataSupport ? buyer.getTestData() : dataSupport.buyer ? Promise.resolve(null) : buyer.getTestData();
            var processTestData = !dataSupport ? processType.getDyeingData() : dataSupport.process ? Promise.resolve(null) : processType.getWhiteData();
            var accountTestData = !dataSupport ? account.getTestData() : dataSupport.account ? Promise.resolve(null) : account.getTestData();

            return Promise.all([uom.getTestData(), buyerTestData, lampStandard.getTestData(), lampStandard.getTestData2(), processTestData, material.getTestData(), colorType.getTestData(), colorType.getTestData2(), standardTest.getTestData(), finishType.getTestData(), yarnMaterial.getTestData(), materialConstruction.getTestData(), accountTestData])
                .then((results) => {
                    var _uom = results[0];
                    var _buyer = !dataSupport ? results[1] : dataSupport.buyer ? dataSupport.buyer : results[1];
                    var _lampStandard1 = results[2];
                    var _lampStandard2 = results[3];
                    var _processType = !dataSupport ? results[4] : dataSupport.process ? dataSupport.process : results[4];
                    var _material = results[5];
                    var color1 = results[6];
                    var color2 = results[7];
                    var _standard = results[8];
                    var _finish = results[9];
                    var _yarn = results[10];
                    var _construction = results[11];
                    var _account = !dataSupport ? results[12] : dataSupport.account ? dataSupport.account : results[12];


                    var _fp = !dataSupport ? fp : dataSupport.salesContract ? dataSupport.salesContract : fp;
                    var detail = [{
                        code: `code1/${codeGenerator()}`,
                        colorTypeId: color1._id,
                        colorType: color1,
                        colorRequest: `reddish`,
                        colorTemplate: `template1`,
                        quantity: 20,
                        uomId: _uom._id,
                        uom: _uom,
                    }, {
                        code: `code2/${codeGenerator()}`,
                        colorTypeId: color2._id,
                        colorType: color2,
                        colorRequest: `gray`,
                        colorTemplate: `template2`,
                        quantity: 20,
                        uomId: _uom._id,
                        uom: _uom,
                    }];
                    if (dataSupport) {
                        if (dataSupport.isSinggle) {
                            detail = [{
                                code: `code1/${codeGenerator()}`,
                                colorTypeId: color1._id,
                                colorType: color1,
                                colorRequest: `reddish`,
                                colorTemplate: `template1`,
                                quantity: 40,
                                uomId: _uom._id,
                                uom: _uom,
                            }]
                        }
                    }

                    var data = {
                        salesContractNo: _fp.salesContractNo,
                        orderNo: `orderNo/${codeGenerator()}`,
                        uomId: _uom._id,
                        uom: _uom,
                        buyerId: _buyer._id,
                        buyer: _buyer,
                        processType: _processType,
                        processTypeId: _processType._id,
                        orderType: _processType.orderType,
                        orderTypeId: _processType.orderType._id,
                        materialConstructionId: _construction._id,
                        materialConstruction: _construction,
                        salesContractId: _fp._id,
                        material: _material,
                        materialId: _material._id,
                        materialWidth: `40x45`,
                        orderQuantity: 40,
                        shippingQuantityTolerance: 5,
                        accountId: _account._id,
                        account: _account,
                        yarnMaterialId: _yarn._id,
                        yarnMaterial: _yarn,
                        finishTypeId: _finish._id,
                        finishType: _finish,
                        standardTestId: _standard._id,
                        standardTest: _standard,
                        materialOrigin: `greige`,
                        finishWidth: `width`,
                        design: `design`,
                        designCode: `UT\Design`,
                        designNumber: `UT\DesignNumber`,
                        handlingStandard: `handling`,
                        shrinkageStandard: `shrink`,
                        packingInstruction: `length`,
                        sample: `sample`,
                        deliveryDate: new Date(),
                        remark: `desc`,
                        isUsed: false,
                        beforeQuantity: 0,
                        remainingQuantity: _fp.remainingQuantity,
                        lampStandards: [{
                            lampStandardId: _lampStandard1._id,
                            lampStandard: _lampStandard1,
                        },
                        {
                            lampStandardId: _lampStandard2._id,
                            lampStandard: _lampStandard2,
                        }],
                        details: detail
                    };
                    return Promise.resolve(data);

                });
        });
    }

    getPrintingOrderTypeData(dataSupport) {
        var fpSCTestData = !dataSupport ? fpSC.getNewTestData() : dataSupport.salesContract ? Promise.resolve(null) : fpSC.getNewTestData();
        return Promise.resolve(fpSCTestData).then(fp => {
            var buyerTestData = !dataSupport ? buyer.getTestData() : dataSupport.buyer ? Promise.resolve(null) : buyer.getTestData();
            var processTestData = !dataSupport ? processType.getPrintingData() : dataSupport.process ? Promise.resolve(null) : processType.getPrintingData();
            var accountTestData = !dataSupport ? account.getTestData() : dataSupport.account ? Promise.resolve(null) : account.getTestData();

            return Promise.all([uom.getTestData(), buyerTestData, lampStandard.getTestData(), lampStandard.getTestData2(), processTestData, material.getTestData(), colorType.getTestData(), colorType.getTestData2(), standardTest.getTestData(), finishType.getTestData(), yarnMaterial.getTestData(), materialConstruction.getTestData(), accountTestData])
                .then((results) => {
                    var _uom = results[0];
                    var _buyer = !dataSupport ? results[1] : dataSupport.buyer ? dataSupport.buyer : results[1];
                    var _lampStandard1 = results[2];
                    var _lampStandard2 = results[3];
                    var _processType = !dataSupport ? results[4] : dataSupport.process ? dataSupport.process : results[4];
                    var _material = results[5];
                    var color1 = results[6];
                    var color2 = results[7];
                    var _standard = results[8];
                    var _finish = results[9];
                    var _yarn = results[10];
                    var _construction = results[11];
                    var _account = !dataSupport ? results[12] : dataSupport.account ? dataSupport.account : results[12];


                    var _fp = !dataSupport ? fp : dataSupport.salesContract ? dataSupport.salesContract : fp;
                    var detail = [{
                        code: `code1/${codeGenerator()}`,
                        colorTypeId: color1._id,
                        colorType: color1,
                        colorRequest: `reddish`,
                        colorTemplate: `template1`,
                        quantity: 20,
                        uomId: _uom._id,
                        uom: _uom,
                    }, {
                        code: `code2/${codeGenerator()}`,
                        colorTypeId: color2._id,
                        colorType: color2,
                        colorRequest: `gray`,
                        colorTemplate: `template2`,
                        quantity: 20,
                        uomId: _uom._id,
                        uom: _uom,
                    }];
                    if (dataSupport) {
                        if (dataSupport.isSinggle) {
                            detail = [{
                                code: `code1/${codeGenerator()}`,
                                colorTypeId: color1._id,
                                colorType: color1,
                                colorRequest: `reddish`,
                                colorTemplate: `template1`,
                                quantity: 40,
                                uomId: _uom._id,
                                uom: _uom,
                            }]
                        }
                    }

                    var data = {
                        salesContractNo: _fp.salesContractNo,
                        orderNo: `orderNo/${codeGenerator()}`,
                        uomId: _uom._id,
                        uom: _uom,
                        buyerId: _buyer._id,
                        buyer: _buyer,
                        processType: _processType,
                        processTypeId: _processType._id,
                        orderType: _processType.orderType,
                        orderTypeId: _processType.orderType._id,
                        materialConstructionId: _construction._id,
                        materialConstruction: _construction,
                        salesContractId: _fp._id,
                        material: _material,
                        materialId: _material._id,
                        materialWidth: `40x45`,
                        orderQuantity: 40,
                        shippingQuantityTolerance: 5,
                        accountId: _account._id,
                        account: _account,
                        yarnMaterialId: _yarn._id,
                        yarnMaterial: _yarn,
                        finishTypeId: _finish._id,
                        finishType: _finish,
                        standardTestId: _standard._id,
                        standardTest: _standard,
                        materialOrigin: `greige`,
                        finishWidth: `width`,
                        design: `design`,
                        designCode: `UT\Design`,
                        designNumber: `UT\DesignNumber`,
                        handlingStandard: `handling`,
                        shrinkageStandard: `shrink`,
                        packingInstruction: `length`,
                        sample: `sample`,
                        deliveryDate: new Date(),
                        remark: `desc`,
                        isUsed: false,
                        beforeQuantity: 0,
                        remainingQuantity: _fp.remainingQuantity,
                        lampStandards: [{
                            lampStandardId: _lampStandard1._id,
                            lampStandard: _lampStandard1,
                        },
                        {
                            lampStandardId: _lampStandard2._id,
                            lampStandard: _lampStandard2,
                        }],
                        details: detail,
                        RUN:"Tanpa RUN"
                    };
                    return Promise.resolve(data);

                });
        });
    }

    getNewWhiteOrderTypeData() {
        return helper
            .getManager(ProductionOrderManager)
            .then((manager) => {
                return this.getWhiteOrderTypeData(null)
                    .then((data) => {
                        return manager.create(data)
                            .then((id) => manager.getSingleById(id))
                    })
            })
    }

    getNewDyeingOrderTypeData() {
        return helper
            .getManager(ProductionOrderManager)
            .then((manager) => {
                return this.getDyeingOrderTypeData(null)
                    .then((data) => {
                        return manager.create(data)
                            .then((id) => manager.getSingleById(id))
                    })
            })
    }

    getNewPrintingOrderTypeData() {
        return helper
            .getManager(ProductionOrderManager)
            .then((manager) => {
                return this.getPrintingOrderTypeData(null)
                    .then((data) => {
                        return manager.create(data)
                            .then((id) => manager.getSingleById(id))
                    })
            })
    }

    getNewTestData(isSingleDetail) {
        return helper
            .getManager(ProductionOrderManager)
            .then((manager) => {
                var detail = isSingleDetail ? { isSinggle: true } : {};
                return this.getNewData(detail).then((data) => {
                    return manager.create(data)
                        .then((id) => manager.getSingleById(id));
                });
            });
    }
}
module.exports = new ProductionOrderDataUtil();