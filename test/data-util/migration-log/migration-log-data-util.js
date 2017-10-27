"use strict";

var moment = require('moment');
var codeGenerator = require('../../../src/utils/code-generator');

class MigrationLogDataUtil {

    getTestData() {

        var start = new Date();
        var finish = new Date();
        var spentTime = moment(finish).diff(moment(start));

        var data = {
            _deleted: false,
            code: `test${codeGenerator()}`,
            description: "test",
            start: start,
            finish: finish,
            executionTime: spentTime + " minutes",
            status: "Successful",
        };

        return Promise.resolve(data);

    }
}
module.exports = new MigrationLogDataUtil();
