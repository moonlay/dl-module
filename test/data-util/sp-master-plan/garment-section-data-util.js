"use strict";
var helper = require("../../helper");
var generateCode = require("../../../src/utils/code-generator");

class GarmentSectionDataUtil {
    getNewData() {
        var Model = require("dl-models").garmentMasterPlan.GarmentSection;
        var data = new Model();

        var code = generateCode();

        data.code = code;
        data.name = `name [${code}]`;

        return Promise.resolve(data);
    }

    getTestData() {
        var Manager = require("../../../src/managers/garment-master-plan/garment-section-manager");
        return helper
            .getManager(Manager)
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
module.exports = new GarmentSectionDataUtil();