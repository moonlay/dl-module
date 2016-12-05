"use strict";

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");
var DLModels = require("dl-models");
var map = DLModels.map;
var AccountBank = DLModels.master.AccountBank;
var BaseManager = require("module-toolkit").BaseManager;
var i18n = require("dl-i18n");
var CodeGenerator = require("../../utils/code-generator");

module.exports = class AccountBankManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.master.collection.AccountBank);
    }

    _getQuery(paging) {
        var _default = {
                _deleted: false
            },
            pagingFilter = paging.filter || {},
            keywordFilter = {},
            query = {};

        if (paging.keyword) {
            var regex = new RegExp(paging.keyword, "i");
            var nameFilter = {
                "bankName": {
                    "$regex": regex
                }
            };
            var addressFilter = {
                "bankAddress": {
                    "$regex": regex
                }
            };
            var accountNameFilter = {
                "accountName": {
                    "$regex": regex
                }
            };
            var accountNumberFilter = {
                "accountNumber": {
                    "$regex": regex
                }
            };
            keywordFilter["$or"] = [nameFilter, addressFilter, accountNameFilter, accountNumberFilter];
        }
        query["$and"] = [_default, keywordFilter, pagingFilter];
        return query;
    }

    _validate(accountBank) {
        var errors = {};
        var valid = accountBank;
        // 1. begin: Declare promises.
        var getAccountBankPromise = this.collection.singleOrDefault({
            _id: {
                "$ne": new ObjectId(valid._id)
            },
            bankName: valid.bankName,
            accountNumber: valid.accountNumber
        });
        // 2. begin: Validation.
        return Promise.all([getAccountBankPromise])
            .then(results => {
                var _accBank = results[0];

                if (!valid.bankName || valid.bankName == '')
                    errors["bankName"] = i18n.__("AccountBank.bankName.isRequired:%s is required", i18n.__("AccountBank.bankName._:BankName")); //"Nama Bank Harus diisi";
                    
                if (!valid.accountName || valid.accountName == '')
                    errors["accountName"] = i18n.__("AccountBank.accountName.isRequired:%s is required", i18n.__("AccountBank.accountName._:AccountName")); //"Nama Nasabah Bank harus diisi";

                if (!valid.accountNumber || valid.accountNumber == '')
                    errors["accountNumber"] = i18n.__("AccountBank.accountNumber.isRequired:%s is required", i18n.__("AccountBank.accountNumber._:AccountNumber")); //"nomor Rekening harus diisi";
                else if(_accBank)
                    errors["accountNumber"] = i18n.__("AccountBank.accountNumber.isReadyExist:%s with same Bank is ready exist", i18n.__("AccountBank.accountNumber._:AccountNumber")); //"Nomor rekening dengan Bank dan Mata uang yang sama tidak boleh";

                // 2c. begin: check if data has any error, reject if it has.
                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require("module-toolkit").ValidationError;
                    return Promise.reject(new ValidationError("data does not pass validation", errors));
                }
                if(!valid.code)
                    valid.code = CodeGenerator();

                valid = new AccountBank(valid);
                valid.stamp(this.user.username, "manager");
                return Promise.resolve(valid);
            });
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.master.collection.AccountBank}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        };

        var nameIndex = {
            name: `ix_${map.master.collection.AccountBank}_bankName_accountNumber`,
            key: {
                bankName: 1,
                accountNumber: 1
            },
            unique: true
        };

        return this.collection.createIndexes([dateIndex, nameIndex]);
    }
}