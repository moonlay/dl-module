'use strict';
var _getSert = require('./getsert');
var division = require('./division-data-util');

class UnitDataUtil {
    getSert(unit) {
        var UnitManager = require('../../../src/managers/master/unit-manager');
        return Promise.resolve(_getSert(unit, UnitManager, data => {
            return {
                code: data.code
            };
        }));
    }
    getTestData() {
        return new Promise((resolve, reject) => {
            division.getTestData()
                .then(div => {
                    var testData = {
                        code: 'UT/UNIT/01',
                        divisionId: div._id,
                        division: div,
                        name: 'Test Unit',
                        description: ''
                    };
                    this.getSert(testData)
                        .then(data => {
                            resolve(data);
                        })
                        .catch(e => {
                            reject(e);
                        });
                })
                .catch(e => {
                    reject(e);
                });
        });
    }
}
module.exports = new UnitDataUtil();
