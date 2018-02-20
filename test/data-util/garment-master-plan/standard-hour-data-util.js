"use strict";
var _getSert = require("../getsert");
var generateCode = require("../../../src/utils/code-generator");
// var Style = require("./style-data-util");
var Comodity = require("./master-plan-comodity-data-util");
var Buyer = require("../master/garment-buyer-data-util");

class StandardHourDataUtil {
    getSert(input) {
        var Manager = require("../../../src/managers/garment-master-plan/standard-hour-manager");
        return _getSert(input, Manager, (data) => {
            return {
               // code: data.code,
               // styleId : data.styleId,
                buyerId : data.buyerId,
                comodityId : data.comodityId
            };
        });
    }

    getNewData() {
       return Promise.all([Buyer.getTestData(), Comodity.getTestData()])
            .then((results) => {
                // var _style = results[0];
                var _buyer = results[0];
                var _comodity = results[1];
            
                var date = new Date();
                var dateString = `${date.getFullYear()}-${(date.getMonth() + 1)}-${date.getDate()}`;

                var code = generateCode();
                var data = {
                    code : code,
                    // styleId : _style._id,
                    // style : _style,
                    garmentBuyerId : _buyer._id,
                    // buyer : _buyer,
                    masterplanComodityId : _comodity._id,
                    // comodity : _comodity,
                    date : dateString,
                    shCutting : 1000,
                    shSewing : 1000,
                    shFinishing : 1000
                }

                return Promise.resolve(data);
            });
    }

    getTestData() {
       return Promise.all([Buyer.getTestData(), Comodity.getTestData()])
            .then((results) => {
                // var _style = results[0];
                var _buyer = results[0];
                var _comodity = results[1];
                var date = new Date();
                var dateString = `${date.getFullYear()}-${(date.getMonth() + 1)}-${date.getDate()}`;

                var code = generateCode();
                var data = {
                    code : code,
                    // styleId : _style._id,
                    // style : _style,
                    garmentBuyerId : _buyer._id,
                    // buyer : _buyer,
                    masterplanComodityId : _comodity._id,
                    // comodity : _comodity,
                    date : dateString,
                    shCutting : 1000,
                    shSewing : 1000,
                    shFinishing : 1000
                }
                return this.getSert(data);
            });
    }
}
module.exports = new StandardHourDataUtil();