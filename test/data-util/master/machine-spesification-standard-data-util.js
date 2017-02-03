"use strict";
var _getSert = require("../getsert");
var ObjectId   = require("mongodb").ObjectId;
var generateCode = require("../../../src/utils/code-generator");
var uomData = require("./uom-data-util");

class MachineSpesificationStandardDataUtil {
    getSert(input) {
        var ManagerType = require("../../../src/managers/master/machine-spesification-standard-manager");
        return _getSert(input, ManagerType, (data) => {
            return {
                _id: data._id
            };
        });
    }

    getNewData() {
        return Promise.all([uomData.getTestData()])
            .then(results => {
                var _uom = results[0];
                var now = new Date();
                var code = generateCode();

                var data = {
                    code : code,
                    valueName: `name [${code}]`,
                    uomId : _uom._id,
                    uom : _uom
                };
                return Promise.resolve(data);
            });
    }

    getTestData() {
        return Promise.all([uomData.getTestData()])
            .then(results => {
                var _uom = results[0];
                var code = generateCode();
                var data = {
                    code : code, 
                    valueName: "Test Machine Spesification",
                    uomId: _uom._id,
                    uom: _uom
                };
                return this.getSert(data);
            });
    }
}
module.exports = new MachineSpesificationStandardDataUtil();