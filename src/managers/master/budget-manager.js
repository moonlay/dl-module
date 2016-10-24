'use strict'

var ObjectId = require("mongodb").ObjectId;

require("mongodb-toolkit");

var DLModels = require('dl-models');
var map = DLModels.map;
var Budget = DLModels.master.Budget;
var BaseManager = require('../base-manager');
var i18n = require('dl-i18n');

module.exports = class BudgetManager  extends BaseManager  {

    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.master.collection.Budget);
    }

    _getQuery(paging) {
        var deleted = {
            _deleted: false
        };
        var query = paging.keyword ? {
            '$and': [deleted]
        } : deleted;

        if (paging.keyword) {
            var regex = new RegExp(paging.keyword, "i");
            var filterName = {
                'name': {
                    '$regex': regex
                }
            };

            query['$and'].push(filterName);
        }
        return query;
    }
    
    _validate(budget) {
        var errors = {};
        return new Promise((resolve, reject) => {
            var valid = budget;
            // 1. begin: Declare promises.
            var getbudgetPromise = this.collection.singleOrDefault({
                "$and": [{
                    _id: {
                        '$ne': new ObjectId(valid._id)
                    }
                }, {
                        name: valid.name
                    }]
            });

            // 2. begin: Validation.
            Promise.all([getbudgetPromise])
                .then(results => {
                    var _budget = results[0];

                    if (!valid.name || valid.name == '')
                        errors["name"] = i18n.__("Budget.name.isRequired:%s is required", i18n.__("Budget.name._:Name"));//"Nama Budget Tidak Boleh Kosong";
                    else if (_budget) {
                        errors["name"] = i18n.__("Budget.name.isExists:%s is already exists", i18n.__("Budget.name._:Name"));//"Nama Budget sudah terdaftar";
                    }

                     if (Object.getOwnPropertyNames(errors).length > 0) {
                        var ValidationError = require('../../validation-error');
                        reject(new ValidationError('data does not pass validation', errors));
                    }

                    valid = new Budget(budget);
                    valid.stamp(this.user.username, 'manager');
                    resolve(valid);
                })
                .catch(e => {
                    reject(e);
                })
        });
    }
   
}