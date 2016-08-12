'use strict'

var ObjectId = require("mongodb").ObjectId;

require("mongodb-toolkit");

var Sparepart = require("dl-models").core.Sparepart;

module.exports = class SparepartManager {
    constructor(db, user) {
        this.db = db;
        this.user = user;
        this.sparepartCollection = this.db.collection("sparepart");
    }

    read(paging) {
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

            this.sparepartCollection
                .where(query)
                .page(_paging.page, _paging.size)
                .orderBy(_paging.order, _paging.asc)
                .execute()
                .then(spareparts => {
                    resolve(spareparts);
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    create(sparepart) {
        return new Promise((resolve, reject) => {
            this._validate(sparepart)
                .then(validSparepart => {

                    this.sparepartCollection.insert(validSparepart)
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

    update(sparepart) {
        return new Promise((resolve, reject) => {
            this._validate(sparepart)
                .then(validSparepart => {
                    this.sparepartCollection.update(validSparepart)
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

    delete(sparepart) {
        return new Promise((resolve, reject) => {
            this._validate(sparepart)
                .then(validSparepart => {
                    validSparepart._deleted = true;
                    this.sparepartCollection.update(validSparepart)
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

    _validate(sparepart) {
        var errors = {};
        return new Promise((resolve, reject) => {
            var valid = sparepart;

            // 1. begin: Declare promises.
            var getSparepartPromise = this.sparepartCollection.singleOrDefault({
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
            Promise.all([getSparepartPromise])
                .then(results => {
                    var _sparepart = results[0];
                    
                    if (!valid.code || valid.code == '')
                        errors["code"] = "code is required";
                    else if (_sparepart) {
                        errors["code"] = "code already exists";
                    }

                    if (!valid.name || valid.name == '')
                        errors["name"] = "name is required";

                    if (valid.supplierId && !valid.supplierId.length)
                        errors["supplier"] = "supplier Id does not exists";

                    // 2c. begin: check if data has any error, reject if it has.
                    for (var prop in errors) {
                        var ValidationError = require('../../validation-error');
                        reject(new ValidationError('data does not pass validation', errors));
                    }

                    valid = new Sparepart(sparepart);
                    valid.stamp(this.user.username, 'manager');
                    resolve(valid);
                })
                .catch(e => {
                    reject(e);
                })
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
                .then(sparepart => {
                    resolve(sparepart);
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
            this.getSingleByQueryOrDefault(query)
                .then(sparepart => {
                    resolve(sparepart);
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    getSingleByQuery(query) {
        return new Promise((resolve, reject) => {
            this.sparepartCollection
                .single(query)
                .then(sparepart => {
                    resolve(sparepart);
                })
                .catch(e => {
                    reject(e);
                });
        })
    }

    getSingleByQueryOrDefault(query) {
        return new Promise((resolve, reject) => {
            this.sparepartCollection
                .singleOrDefault(query)
                .then(sparepart => {
                    resolve(sparepart);
                })
                .catch(e => {
                    reject(e);
                });
        })
    }
}
