"use strict";
var _getSert = require("../getsert");
var generateCode = require("../../../src/utils/code-generator");

class RoleDataUtil {
    getSert(input) {
        var ManagerType = require("../../../src/managers/auth/role-manager");
        return _getSert(input, ManagerType, (data) => {
            return {
                code: data.code
            };
        });
    }

    getNewData() {
        var Model = require("dl-models").auth.Role;
        var data = new Model();

        var code = generateCode();
        data.code = code;
        data.name = `Role[${code}]`;
        data.description = ` data for unit testing.`;

        return Promise.resolve(data);
    }

    getTestData() {
        var data = {
            code: "UT-ADM",
            name: "Admin-UT",
            description: "Unit test administrator"
        };
        return this.getSert(data);
    }
}
module.exports = new RoleDataUtil();
