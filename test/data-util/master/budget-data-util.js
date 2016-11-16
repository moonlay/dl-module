'use strict';
var _getSert = require('./getsert');

class BudgetDataUtil {
    getSert(budget) {
        var BudgetManager = require('../../../src/managers/master/budget-manager');
        return Promise.resolve(_getSert(budget, BudgetManager, data => {
            return {
                code: data.code
            };
        }));
    }
    getTestData() {
        var testData = { 
            code: 'UT/Budget/01',
            name: 'budget 01' 
        };
        return Promise.resolve(this.getSert(testData));
    }
}
module.exports = new BudgetDataUtil();

