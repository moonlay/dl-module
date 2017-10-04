"use strict";
var _getSert = require("../getsert");
var division = require("./division-data-util");
var generateCode = require("../../../src/utils/code-generator");

class HolidayDataUtil {
    getSert(input) {
        var ManagerType = require("../../../src/managers/master/holiday-manager");
        return _getSert(input, ManagerType, (data) => {
            return {
                code: data.code
            };
        });
    }

    getNewData() {

        return Promise.all([division.getTestData()])
            .then((results) => {
                var division = results[0];
               
                var code = generateCode();
                var data = {
                    code: code,
                    date: new Date(),
                    name: `name[${code}]`,
                    divisionId: division._id,
                    division: division,
                    description: `description for ${code}`
                };
                return Promise.resolve(data);
            });
    }

    getRandomTestData() {
        return this.getNewData()
            .then((data) => {
                return this.getSert(data);
            });
    }

    getTestData() {
        return this.getNewData()
            .then((data) => {
                data.code = "UT/LBR/01";
                data.date = ISODate("2017-09-16");
                data.name = "HARI LIBUR UNTUK UNIT TEST";
                data.division = "DIVISI UNIT TEST";
                data.description = "HARI LIBUR UNTUK UNIT TEST";
                
                return this.getSert(data);
            });
    }

}
module.exports = new HolidayDataUtil();
