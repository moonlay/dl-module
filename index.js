module.exports = {
    managers: {
        auth: {
            AccountManager: require("./src/managers/auth/account-manager"),
            RoleManager: require("./src/managers/auth/role-manager")
        },
        master: {
            BuyerManager: require("./src/managers/master/buyer-manager"),
            SupplierManager: require("./src/managers/master/supplier-manager"),
            ProductManager: require("./src/managers/master/product-manager"),
            CategoryManager: require('./src/managers/master/category-manager'),
            UnitManager: require('./src/managers/master/unit-manager'),
            UomManager: require('./src/managers/master/uom-manager'),
            CurrencyManager: require('./src/managers/master/currency-manager'),
            VatManager: require('./src/managers/master/vat-manager'),
            BudgetManager: require('./src/managers/master/budget-manager'),
        },
        purchasing: {
            PurchaseOrderManager: require('./src/managers/purchasing/purchase-order-manager'),
            PurchaseOrderExternalManager: require('./src/managers/purchasing/purchase-order-external-manager'),
            DeliveryOrderManager: require('./src/managers/purchasing/delivery-order-manager'),
            UnitReceiptNoteManager: require('./src/managers/purchasing/unit-receipt-note-manager'),
            PurchaseRequestManager: require('./src/managers/purchasing/purchase-request-manager')
        }
    }
}
