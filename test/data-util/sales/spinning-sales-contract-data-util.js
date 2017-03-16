'use strict'
var helper = require('../../helper');
var SpinningSalesContractManager = require('../../../src/managers/sales/spinning-sales-contract-manager');
var codeGenerator = require('../../../src/utils/code-generator');
var buyer = require('../master/buyer-data-util');
var uom = require('../master/uom-data-util');
var comodity = require('../master/comodity-data-util');
var quality = require('../master/quality-data-util');
var bankAccount = require('../master/account-bank-data-util');
var termOfPayment = require('../master/term-of-payment-data-util');

class SpinningSalesContractDataUtil {
    getNewData() {
        return Promise.all([uom.getTestData(), buyer.getTestData(), quality.getTestData(), comodity.getTestData(), bankAccount.getTestData(),termOfPayment.getTestData()])
            .then((results) => {
                var _uom = results[0];
                var _buyer = results[1];
                var _quality = results[2];
                var _comodity=results[3];
                var _bank=results[4];
                var _payment=results[5];

                var data = {
                    
                    salesContractNo: `UT/FPSC/${codeGenerator()}`,
                    dispositionNumber: `orderNo/${codeGenerator()}`,
                    uomId: _uom._id,
                    uom: _uom,
                    buyerId: _buyer._id,
                    buyer: _buyer,
                    qualityId: _quality._id,
                    quality: _quality,
                    accountBankId:_bank._id,
                    accountBank:_bank,
                    comodity:_comodity,
                    comodityId:_comodity._id,
                    termOfPaymentId:_payment._id,
                    termOfPayment:_payment,
                    orderQuantity:30,
                    shippingQuantityTolerance:5,
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
            .getManager(SpinningSalesContractManager)
            .then((manager) => {
                return this.getNewData().then((data) => {
                    return manager.create(data)
                        .then((id) => manager.getSingleById(id));
                });
            });
    }
}
module.exports = new SpinningSalesContractDataUtil();