'use strict'
// external deps
var ObjectId = require('mongodb').ObjectId;
require("mongodb-toolkit");

module.exports = class BaseManager {
    constructor(db, user, locale) {
        this.db = db;
        this.user = user;
        this.locale = locale;

        this.collection = null;
    }

    _validate(data) {
        throw new Error('_validate(data) not implemented');
    }

    _getQuery(paging) {
        throw new Error('_getQuery(paging) not implemented');
    }
    _createIndexes() {
        return Promise.resolve(true);
    }


    read(paging) {
        var _paging = Object.assign({
            page: 1,
            size: 20,
            order: '_id',
            asc: true
        }, paging);
        var start = process.hrtime();

        return new Promise((resolve, reject) => {
            this._createIndexes()
                .then((createIndexResults) => {
                    var query = this._getQuery(_paging);
                    this.collection
                        .where(query)
                        .page(_paging.page, _paging.size)
                        .order(_paging.order)
                        .execute()
                        .then(modules => {
                            var elapsed = process.hrtime(start);
                            console.log(elapsed);
                            resolve(modules);
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


    create(data) {
        return new Promise((resolve, reject) => {
            this._createIndexes()
                .then((createIndexResults) => {
                    this._validate(data)
                        .then(validData => {
                            this.collection.insert(validData)
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
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    update(data) {
        return new Promise((resolve, reject) => {
            this._createIndexes()
                .then((createIndexResults) => {
                    this._validate(data)
                        .then(validData => {
                            this.collection.update(validData)
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
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    delete(data) {
        return new Promise((resolve, reject) => {
            this._createIndexes()
                .then((createIndexResults) => {
                    this._validate(data)
                        .then(validData => {
                            validData._deleted = true;
                            this.collection.update(validData)
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
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    getSingleById(id) {
        return new Promise((resolve, reject) => {
            if (id === '')
                resolve(null);
            var query = {
                _id: new ObjectId(id),
                _deleted: false
            };
            this.getSingleByQuery(query)
                .then(data => {
                    resolve(data);
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    getSingleByIdOrDefault(id) {
        return new Promise((resolve, reject) => {
            if (id === '')
                resolve(null);
            var query = {
                _id: new ObjectId(id),
                _deleted: false
            };
            this.getSingleByQueryOrDefault(query)
                .then(data => {
                    resolve(data);
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    getSingleByQuery(query) {
        return new Promise((resolve, reject) => {
            this.collection
                .single(query)
                .then(data => {
                    resolve(data);
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    getSingleByQueryOrDefault(query) {
        return new Promise((resolve, reject) => {
            this.collection
                .singleOrDefault(query)
                .then(data => {
                    resolve(data);
                })
                .catch(e => {
                    reject(e);
                });
        });
    }
};