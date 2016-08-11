'use strict'

// external deps 
var ObjectId = require("mongodb").ObjectId;

// internal deps
require('mongodb-toolkit');
var DLModels = require('dl-models');
var map = DLModels.map;
var GeneralMerchandise = DLModels.core.GeneralMerchandise;

module.exports = class GeneralMerchandiseManager{
    constructor(db, user){
        this.db = db;
        this.user = user;
        this.generalMerchandiseCollection = this.db.use(map.core.GeneralMerchandise);
    }

    read(paging){
        var _paging = Object.assign({
            page: 1,
            size: 20,
            order: '_id',
            asc: true
        }, paging);

        return new Promise((resolve, reject)=>{
            var deleted = {
                _deleted : false
            };
            var query = _paging.keyword ? {
                '$and': [deleted]
            } : deleted;

            if (_paging.keyword) {
                var regex = new RegExp(_paging.keyword, "i");
                var filterCode = {
                    'code': {
                        '$regex': regex
                    }
                };
                var filterName = {
                    'name': {
                        '$regex': regex
                    }
                };
                var $or = {
                    '$or': [filterCode, filterName]
                };

                query['$and'].push($or);
            }


            this.generalMerchandiseCollection
                .where(query)
                .page(_paging.page, _paging.size)
                .orderBy(_paging.order, _paging.asc)
                .execute()
                .then(generalMerchandises => {
                    resolve(generalMerchandises);
                })
                .catch(e => {
                    reject(e);
            });
        });
    }

    readByGeneralMerchandiseId(generalMerchandiseId, paging) {
        var _paging = Object.assign({
            page: 1,
            size: 20,
            order: '_id',
            asc: true
        }, paging);

        return new Promise((resolve, reject) => {
            var deleted = {
                _deleted: false
            };
            var generalMerchandise = {
                generalMerchandiseId: new ObjectId(generalMerchandiseId)
            };
            var query = {
                '$and': [deleted, module]
            };

            if (_paging.keyword) {
                var regex = new RegExp(_paging.keyword, "i");
                var filterCode = {
                    'code': {
                        '$regex': regex
                    }
                };
                var filterName = {
                    'name': {
                        '$regex': regex
                    }
                };
                var $or = {
                    '$or': [filterCode, filterName]
                };

                query['$and'].push($or);
            }


            this.generalMerchandiseCollection
                .where(query)
                .page(_paging.page, _paging.size)
                .orderBy(_paging.order, _paging.asc)
                .execute()
                .then(generalMerchandise => {
                    resolve(generalMerchandise);
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

   getById(id) {
        return new Promise((resolve, reject) => {
            if (id === '')
                resolve(null);
            var query = {
                _id: new ObjectId(id),
                _deleted: false
            };
            this.getSingleByQuery(query)
                .then(module => {
                    resolve(module);
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    getByCode(code) {
        return new Promise((resolve, reject) => {
            if (code === '')
                resolve(null);
            var query = {
                code: code,
                _deleted: false
            };
            this.getSingleByQuery(query)
                .then(module => {
                    resolve(module);
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    getByIdOrDefault(id) {
        return new Promise((resolve, reject) => {
            if (id === '')
                resolve(null);
            var query = {
                _id: new ObjectId(id),
                _deleted: false
            };
            this.getSingleOrDefaultByQuery(query)
                .then(module => {
                    resolve(module);
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    getSingleByQuery(query) {
        return new Promise((resolve, reject) => {
            this.generalMerchandiseCollection
                .single(query)
                .then(module => {
                    resolve(module);
                })
                .catch(e => {
                    reject(e);
                });
        })
    }

     getSingleOrDefaultByQuery(query) {
        return new Promise((resolve, reject) => {
            this.generalMerchandiseCollection
                .singleOrDefault(query)
                .then(generalMerchandise => {
                    resolve(generalMerchandise);
                })
                .catch(e => {
                    reject(e);
                });
        })
    }

     create(generalMerchandise) {
        return new Promise((resolve, reject) => {
            this._validate(generalMerchandise)
                .then(validGeneralMerchandise => {
                    this.generalMerchandiseCollection.insert(validGeneralMerchandise)
                        .then(id => {
                            resolve(id);
                        })
                        .catch(e => {
                            reject(e);
                        })
                })
                .catch(e => {
                    reject(e);
                })
        });
    }

    update(generalMerchandise) {
        return new Promise((resolve, reject) => {
            this._validate(generalMerchandise)
                .then(validGeneralMerchandise => {
                    this.generalMerchandiseCollection.update(validGeneralMerchandise)
                        .then(id => {
                            resolve(id);
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

    delete(generalMerchandise) {
        return new Promise((resolve, reject) => {
            this._validate(generalMerchandise)
                .then(validGeneralMerchandise => {
                    validGeneralMerchandise._deleted = true;
                    this.generalMerchandiseCollection.update(validGeneralMerchandise)
                        .then(id => {
                            resolve(id);
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

 _validate(generalMerchandise) {
        var errors = {};
        return new Promise((resolve, reject) => {
            var valid = new GeneralMerchandise(generalMerchandise);
           
            // 1. begin: Declare promises.
            var getGeneralMerchandisePromise = this.generalMerchandiseCollection.singleOrDefault({
                "$and": [{
                    _id: {
                        '$ne': new ObjectId(valid._id)
                    }
                }, {
                        code: valid.code
                    }]
            });
            // 1. end: Declare promises.

            // 2. begin: Validation.
            Promise.all([getGeneralMerchandisePromise])
                   .then(results => {
                    var _module = results[0];

                    if (!valid.code || valid.code == '')
                        errors["code"] = "code is required";
                    else if (_module) {
                        errors["code"] = "code already exists";
                    }

                    if (!valid.name || valid.name == '')
                        errors["name"] = "name is required"; 

                    // 2c. begin: check if data has any error, reject if it has.
                    for (var prop in errors) {
                        var ValidationError = require('../../validation-error');
                        reject(new ValidationError('data does not pass validation', errors));
                    }

                    valid.stamp(this.user.username, 'manager');
                    resolve(valid);
                })
                .catch(e => {
                    reject(e);
                })
        });
    }
};
