"use strict";
var _getSert = require("../getsert");
var generateCode = require("../../../src/utils/code-generator");
var company = require("./company-data-util");

class ContactDataUtil {
    getSert(input) {
        var ManagerType = require("../../../src/managers/master/contact-manager");
        return _getSert(input, ManagerType, (data) => {
            return {
                code: data.code
            };
        });
    }

    getNewData() {
        return company.getTestData()
            .then((results) => {
                var Model = require('dl-models').master.Contact;
                var data = new Model();

                var code = generateCode();

                data.code = code;
                data.firstName = `firstName[${code}]`;
                data.lastName = `lastName[${code}]`;
                data.email = `email[${code}]`;
                data.phoneNumber = `phoneNumber[${code}]`;
                data.companyId = results._id;
                data.company = results;
                data.jobTitle = `jobTitle[${code}]`;
                data.information = `information[${code}]`;

                return Promise.resolve(data);
            });
    }

    getTestData() {
        return this.getNewData()
            .then((data) => {
                data.code = "CONTACT-UT-01";
                data.firstName = "First Name Test";
                data.lastName = "Last Name Test";
                data.email = "Email@test.com";
                data.phoneNumber = "0000000000"
                data.jobTitle = "Job Title Test";
                data.information = "Information Test";

                return this.getSert(data);
            });
    }
}
module.exports = new ContactDataUtil();
