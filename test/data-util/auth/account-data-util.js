"use strict";
var _getSert = require("../getsert");
var generateCode = require("../../../src/utils/code-generator");
var Role = require("./role-data-util");

class AccountDataUtil {
    getSert(input) {
        var ManagerType = require("../../../src/managers/auth/account-manager");
        return _getSert(input, ManagerType, (data) => {
            return {
                username: data.username
            };
        });
    }

    getNewData() {
        return Role.getTestData()
            .then((role) => {

                var Model = require("dl-models").auth.Account;
                var data = new Model();

                var code = generateCode();

                data.username = `${code}@unit.test`;
                data.password = "Standar123";
                data.email = `${code}@unit.test`;
                data.isLocked = false;
                data.profile = {
                    firstname: "John",
                    lastname: code,
                    gender: "M",
                    dob: new Date(),
                    email: `${code}@unit.test`
                };
                data.roles = [role];
                data.facebook = {};


                return Promise.resolve(data);
            });
    }

    getTestData() {
        return this.getNewData()
            .then((data) => {
                data.username = "dev";
                data.email = "dev@unit.test";
                data.profile.firstname = "Test";
                data.profile.lastname = "Unit";
                data.profile.email = "dev@unit.test";
                data.profile.gender = "M";
                data.profile.dob = new Date();
                return this.getSert(data);
            });
    }
}
module.exports = new AccountDataUtil();
