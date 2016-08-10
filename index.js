module.exports = {
    managers: {
        core: {
            ProductManager: require("./src/managers/core/product-manager"),
            BuyerManager: require("./src/managers/core/buyer-manager"),
            SupplierManager: require("./src/managers/core/supplier-manager"),
            SparepartManager: require("./src/manager/core/sparepart-manager")
        }
    }
}