'use strict';
var _getSert = require('./getsert');

class CategoryDataUtil {
    getSert(category) {
        var CategoryManager = require('../../../src/managers/master/category-manager');
        return Promise.resolve(_getSert(category, CategoryManager, data => {
            return {
                code: data.code
            };
        }));
    }
    getTestData() {
        var testData = {
            code: 'UT/CATEGORY/01',
            name: 'Category 01',
            codeRequirement: '' 
        };
        return Promise.resolve(this.getSert(testData));
    }
}
module.exports = new CategoryDataUtil();

