'use strict';
var _getSert = require('./getsert');

class DivisionDataUtil {
    getSert(division) {
        var DivisionManager = require('../../../src/managers/master/division-manager');
        return Promise.resolve(_getSert(division, DivisionManager, data => {
            return {
                code: data.code
            };
        }));
    }

    getTestData() {
        var testData = {
            code: 'UT/DIV/01',
            name: 'Div Unit Test',
            description: ''
        };
        return Promise.resolve(this.getSert(testData));
    }
}

module.exports = new DivisionDataUtil();
