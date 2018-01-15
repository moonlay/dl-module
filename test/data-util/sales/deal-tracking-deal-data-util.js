"use strict";
var helper = require('../../helper');
var DealTrackingDealManager = require('../../../src/managers/sales/deal-tracking-deal-manager');
var generateCode = require("../../../src/utils/code-generator");
var company = require("../master/company-data-util");
var contact = require("../master/contact-data-util");
// var product = require("../master/product-data-util");
var uom = require("../master/uom-data-util");
var dealTrackingStage = require("./deal-tracking-stage-data-util");

class DealTrackingDealDataUtil {
    getNewData() {
        return Promise.all([contact.getTestData(), dealTrackingStage.getTestData(), uom.getTestData()])
            .then((results) => {
                var _contact = results[0];
                var _dealTrackingStage = results[1];
                // var _product = results[2];
                var _uom = results[2];

                var Model = require('dl-models').sales.DealTrackingDeal;
                var data = new Model();

                var code = generateCode();

                data.code = code;
                data.name = `name[${code}]`;
                data.amount = 5000000;
                data.companyId = _contact.companyId;
                data.company = _contact.company;
                data.contactId = _contact._id;
                data.contact = _contact;
                // data.productId = _product._id;
                // data.product = _product;
                data.uomId = _uom._id;
                data.uom = _uom;
                data.quantity = 5000;
                data.closeDate = new Date();
                data.description = `description[${code}]`;
                data.stageId = _dealTrackingStage._id;   

                return Promise.resolve(data);
            });
    }

    getTestData() {
        return helper
            .getManager(DealTrackingDealManager)
            .then((manager) => {
                return this.getNewData().then((data) => {
                    return manager.create(data)
                        .then((id) => manager.getSingleById(id));
                });
            });
    }
}
module.exports = new DealTrackingDealDataUtil();
