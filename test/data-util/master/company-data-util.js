"use strict";
var _getSert = require("../getsert");
var generateCode = require("../../../src/utils/code-generator");

class CompanyDataUtil {
    getSert(input) {
        var ManagerType = require("../../../src/managers/master/company-manager");
        return _getSert(input, ManagerType, (data) => {
            return {
                code: data.code
            };
        });
    }

    getNewData() {
        var Model = require('dl-models').master.Company;
        var data = new Model();

        var code = generateCode();

        data.code = code;
        data.name = `name[${code}]`;
        data.website = `website[${code}]`;
        data.industry = `industry[${code}]`;
        data.phoneNumber = `phoneNumber[${code}]`;
        data.city = `city[${code}]`;
        data.information = `information[${code}]`;

        return Promise.resolve(data);
    }

    getTestData() {
        var data = {
            code: "UT/COMPANY/01",
            name: "Name Test",
            website: "Website Test",
            industry: "Industry Test",
            phoneNumber: "0000000000",
            city: "City Test",
            information: "Information Test"
        };
        return this.getSert(data);
    }
}
module.exports = new CompanyDataUtil();
