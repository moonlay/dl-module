"use strict";
var _getSert = require("../getsert");
var generateCode = require("../../../src/utils/code-generator");
var Style = require("./style-data-util");

class StyleDataUtil {
    getSert(input) {
        var Manager = require("../../../src/managers/garment-master-plan/style-manager");
        return _getSert(input, Manager, (data) => {
            return {
                code: data.code
            };
        });
    }

    getNewData() {
       return Promise.all([Style.getTestData()])
            .then((results) => {
                var _style = results[0];
                var date = new Date();
                var dateString = `${date.getFullYear()}-${(date.getMonth() + 1)}-${date.getDate()}`;

                var code = generateCode();
                var data = {
                    code : code,
                    styleId : _style._id,
                    style : _style,
                    date : dateString,
                    shCutting : 1000,
                    shSewing : 1000,
                    shFinishing : 1000
                }

                return Promise.resolve(data);
            });
    }

    getTestData() {
       return Promise.all([Style.getTestData()])
            .then((results) => {
                var _style = results[0];
                var date = new Date();
                var dateString = `${date.getFullYear()}-${(date.getMonth() + 1)}-${date.getDate()}`;

                var code = generateCode();
                var data = {
                    code : code,
                    styleId : _style._id,
                    style : _style,
                    date : dateString,
                    shCutting : 1000,
                    shSewing : 1000,
                    shFinishing : 1000
                }
                return this.getSert(data);
            });
    }
}
module.exports = new StyleDataUtil();