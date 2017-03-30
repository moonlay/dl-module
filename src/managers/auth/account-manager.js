'use strict'

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");
var i18n = require('dl-i18n');
var DLModels = require('dl-models');
var map = DLModels.map;
var Account = DLModels.auth.Account;
var BaseManager = require('module-toolkit').BaseManager;
var sha1 = require("sha1");

module.exports = class AccountManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.auth.collection.Account);
        this.roleCollection = this.db.use(map.auth.collection.Role);
    }

    create(account) {
        return new Promise((resolve, reject) => {
            this._validate(account)
                .then(validAccount => {
                    validAccount.password = sha1(validAccount.password);
                    this.collection.insert(validAccount)
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

    update(account) {
        return new Promise((resolve, reject) => {
            this._validate(account)
                .then(validAccount => {
                    if (validAccount.password && validAccount.password.length > 0)
                        validAccount.password = sha1(validAccount.password);
                    else
                        delete validAccount.password;
                    this.collection.update(validAccount)
                        .then(id => {
                            resolve(id);
                        })
                        .catch(e => {
                            reject(e);
                        });

                    // var q = {
                    //     username: validAccount.username
                    // };
                    // this.getSingleByQuery(q)
                    //     .then(dbAccount => {
                    //         validAccount.password = validAccount.password.length < 1 ? dbAccount.password : sha1(validAccount.password);
                    //         this.collection.update(validAccount)
                    //             .then(id => {
                    //                 resolve(id);
                    //             })
                    //             .catch(e => {
                    //                 reject(e);
                    //             });
                    //     })
                    //     .catch(e => {
                    //         reject(e);
                    //     });
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    authenticate(username, password) {
        return new Promise((resolve, reject) => {
            if (username === '')
                resolve(null);
            var query = {
                username: username,
                password: sha1(password),
                _deleted: false
            };
            this.getSingleByQuery(query)
                .then(account => {
                    delete account.password;
                    resolve(account);
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    _getQuery(paging) {
        // var deleted = {
        //     _deleted: false
        // };
        // var query = paging.keyword ? {
        //     '$and': [deleted]
        // } : deleted;

        // if (paging.keyword) {
        //     var regex = new RegExp(paging.keyword, "i");
        //     var filterUsername = {
        //         'username': {
        //             '$regex': regex
        //         }
        //     };
        //     var filterName = {
        //         '$or': [{
        //             'profile.firstname': {
        //                 '$regex': regex
        //             }
        //         }, {
        //             'profile.lastname': {
        //                 '$regex': regex
        //             }
        //         }]
        //     };
        //     var $or = {
        //         '$or': [filterUsername, filterName]
        //     };

        //     query['$and'].push($or);
        // }
        // return query;

        var _default = {
            _deleted: false
        },
        pagingFilter = paging.filter || {},
        keywordFilter = {},
        query = {};

        if (paging.keyword) {
            var regex = new RegExp(paging.keyword, "i");
            var filterUsername = {
                'username': {
                    '$regex': regex
                }
            };
            var filterName = {
                '$or': [{
                    'profile.firstname': {
                        '$regex': regex
                    }
                }, {
                    'profile.lastname': {
                        '$regex': regex
                    }
                }]
            };
            keywordFilter["$or"] = [filterUsername, filterName]
        }
        query["$and"] = [_default, keywordFilter, pagingFilter];
        return query;
    }

    _validate(account) {
        var errors = {};
        return new Promise((resolve, reject) => {
            var valid = account;
            // 1. begin: Declare promises.
            var getAccountPromise = valid && valid.username ? this.collection.firstOrDefault({
                "$and": [{
                    _id: {
                        '$ne': new ObjectId(valid._id)
                    }
                }, {
                    username:{ 
                        $regex: new RegExp("^" + valid.username.trim() + "$", "i")
                    }
                }]
            }) : Promise.resolve(null);
            valid.roles = valid.roles instanceof Array ? valid.roles : [];
            var roleIds = valid.roles.map((r) => new ObjectId(r._id));
            var getRoles = this.roleCollection.find({
                _id: {
                    "$in": roleIds
                }
            }).toArray();

            // 2. begin: Validation.
            Promise.all([getAccountPromise, getRoles])
                .then(results => {
                    var _module = results[0];
                    var _roles = results[1];

                    if (!valid.username || valid.username == '')
                        errors["username"] = "Username harus diisi";
                    else if (_module) {
                        errors["username"] = "Username sudah ada";
                    }

                    if (!valid._id && (!valid.password || valid.password == ''))
                        errors["password"] = "password is required";

                    if (!valid.profile)
                        errors["profile"] = "profile is required";
                    else {
                        var profileError = {};
                        if (!valid.profile.firstname || valid.profile.firstname == '')
                            profileError["firstname"] = "firstname harus diisi";

                        if (!valid.profile.gender || valid.profile.gender == '')
                            profileError["gender"] = "gender harus diisi";

                        if (Object.getOwnPropertyNames(profileError).length > 0)
                            errors["profile"] = profileError;
                    }

                    var roleErrors = [];
                    for (var role of valid.roles) {
                        var roleError = {};
                        var _role = _roles.find((r) => {
                            return r._id.toString() === role._id.toString();
                        });

                        if (!_role) {
                            roleError["role"] = i18n.__("Role.isRequired:%s is required", i18n.__("Role._:Role")); //"Nama barang tidak boleh kosong";
                            roleError["roleId"] = i18n.__("Role.isRequired:%s is required", i18n.__("Role._:Role")); //"Nama barang tidak boleh kosong";
                        }
                        if (Object.getOwnPropertyNames(roleError).length > 0)
                            roleErrors.push(roleError);
                        else {
                            role = _role;
                        }
                    }
                    if (roleErrors.length > 0)
                        errors.roles = roleErrors;

                    // 2c. begin: check if data has any error, reject if it has.
                    if (Object.getOwnPropertyNames(errors).length > 0) {
                        var ValidationError = require('module-toolkit').ValidationError;
                        reject(new ValidationError('data does not pass validation', errors));
                    }
                    
                    account.roles = _roles;
                    valid = new Account(account);
                    valid.stamp(this.user.username, 'manager');
                    resolve(valid);
                })
                .catch(e => {
                    reject(e);
                });
        });
    }
};
