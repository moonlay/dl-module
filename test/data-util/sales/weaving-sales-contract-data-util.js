'use strict'
var helper = require('../../helper');
var WeavingSalesContractManager = require('../../../src/managers/sales/weaving-sales-contract-manager');
var codeGenerator = require('../../../src/utils/code-generator');
var buyer = require('../master/buyer-data-util');
var uom = require('../master/uom-data-util');
var comodity = require('../master/comodity-data-util');
var quality = require('../master/quality-data-util');
var material = require('../master/product-data-util');
var yarnMaterial = require('../master/yarn-material-data-util');
var materialConstruction = require('../master/material-construction-data-util');
var bankAccount = require('../master/account-bank-data-util');

class WeavingSalesContractDataUtil {
    getNewData() {
        return Promise.all([uom.getTestData(), buyer.getTestData(), quality.getTestData(), material.getTestData(), comodity.getTestData(), yarnMaterial.getTestData(), materialConstruction.getTestData(), bankAccount.getTestData()])
            .then((results) => {
                var _uom = results[0];
                var _buyer = results[1];
                var _quality = results[2];
                var _material = results[3];
                var _comodity=results[4];
                var _yarn=results[5];
                var _construction=results[6];
                var _bank=results[7];

                var data = {
                    
                    salesContractNo: `UT/FPSC/${codeGenerator()}`,
                    dispositionNumber: `orderNo/${codeGenerator()}`,
                    uomId: _uom._id,
                    uom: _uom,
                    buyerId: _buyer._id,
                    buyer: _buyer,
                    qualityId: _quality._id,
                    quality: _quality,
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
                    orderQuantity:30,
                    shippingQuantityTolerance:5,
                    materialWidth:'Width',
                    incomeTax:'Exclude PPn',
                    price:8000,

                    paymentMethod:`Telegraphic Transfer (TT)`,
                    paymentRequirement:`Payment Requirement`,
                    rollLength:`length`,
                    packing:`pack`,
                    deliverySchedule:new Date(),
                    remark:`desc`,
                    useIncomeTax:false,
                    transportFee:'Fee',
                    deliveredTo:'DeliveredTo',
                    agent:'Agent',
                    comission:200,
                    condition:'Condition',
                    attachment:'attachment',
                    remark:'Remark Test'
                };
                return Promise.resolve(data);
            });
    }

    getNewTestData() {
        return helper
            .getManager(WeavingSalesContractManager)
            .then((manager) => {
                return this.getNewData().then((data) => {
                    return manager.create(data)
                        .then((id) => manager.getSingleById(id));
                });
            });
    }
}
module.exports = new WeavingSalesContractDataUtil();