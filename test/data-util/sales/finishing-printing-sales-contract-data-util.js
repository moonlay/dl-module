'use strict'
var helper = require('../../helper');
var FinishingPrintingSalesContractManager = require('../../../src/managers/sales/finishing-printing-sales-contract-manager');
var codeGenerator = require('../../../src/utils/code-generator');
var buyer = require('../master/buyer-data-util');
var uom = require('../master/uom-data-util');
var orderType = require('../master/order-type-data-util');
var processType = require('../master/process-type-data-util');
var comodity = require('../master/comodity-data-util');
var quality = require('../master/quality-data-util');
var material = require('../master/product-data-util');
var yarnMaterial = require('../master/yarn-material-data-util');
var materialConstruction = require('../master/material-construction-data-util');
var bankAccount = require('../master/account-bank-data-util');
var termOfPayment = require('../master/term-of-payment-data-util');
var motive = require('../master/design-motive-data-util');

class FinishingPrintingSalesContractDataUtil {
    getNewData() {
        return Promise.all([uom.getTestData(), buyer.getTestData(), quality.getTestData(), processType.getTestData(), material.getTestData(), comodity.getTestData(), yarnMaterial.getTestData(), materialConstruction.getTestData(), bankAccount.getTestData(),termOfPayment.getTestData(),motive.getTestData()])
            .then((results) => {
                var _uom = results[0];
                var _buyer = results[1];
                var _quality = results[2];
                var _processType = results[3];
                var _material = results[4];
                var _comodity=results[5];
                var _yarn=results[6];
                var _construction=results[7];
                var _bank=results[8];
                var _agent=results[1];
                var _payment=results[9];
                var _motive=results[10];

                var data = {
                    
                    salesContractNo: `UT/FPSC/${codeGenerator()}`,
                    dispositionNumber: `orderNo/${codeGenerator()}`,
                    uomId: _uom._id,
                    uom: _uom,
                    buyerId: _buyer._id,
                    buyer: _buyer,
                    qualityId: _quality._id,
                    quality: _quality,
                    processType: _processType,
                    processTypeId: _processType._id,
                    orderType: _processType.orderType,
                    orderTypeId: _processType.orderType._id,
                    materialConstructionId:_construction._id,
                    materialConstruction:_construction,
                    material:_material,
                    materialId:_material._id,
                    accountBankId:_bank._id,
                    accountBank:_bank,
                    yarnMaterial:_yarn,
                    yarnMaterialId:_yarn._id,
                    comodity:_comodity,
                    comodityId:_comodity._id,
                    termOfPaymentId:_payment._id,
                    termOfPayment:_payment,
                    orderQuantity:50,
                    shippingQuantityTolerance:5,
                    materialWidth:'Width',
                    designMotive:_motive,
                    designMotiveId:_motive._id,
                    pointSystem:10,
                    termOfShipment:"test",
                    amount:1,
                    remainingQuantity:50,
                    paymentMethod:`Telegraphic Transfer (TT)`,
                    rollLength:`length`,
                    packing:`pack`,
                    deliverySchedule:new Date(),
                    deliveredTo:'City-Country',
                    remark:`desc`,
                    useIncomeTax:true,
                    transportFee:'Fee',
                    agentId:_agent._id,
                    agent:_agent,
                    comission:200,
                    condition:'Condition',
                    attachment:'attachment',
                    remark:'Remark Test',
                    details: [{
                        color:`Purple`,
                        price:1000,
                        useIncomeTax:true,
                        currencyId:_bank.currency._id,
                        currency: _bank.currency
                    }, {
                        color:`Purple`,
                        price:1000,
                        useIncomeTax:false,
                        currencyId:_bank.currency._id,
                        currency: _bank.currency
                    }]
                };
                return Promise.resolve(data);
            });
    }

    getNewTestData() {
        return helper
            .getManager(FinishingPrintingSalesContractManager)
            .then((manager) => {
                return this.getNewData().then((data) => {
                    return manager.create(data)
                        .then((id) => manager.getSingleById(id));
                });
            });
    }
}
module.exports = new FinishingPrintingSalesContractDataUtil();