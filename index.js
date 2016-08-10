module.exports = {
    managers: {
        core: {
            BuyerManager: require("./src/managers/core/buyer-manager"),
            SupplierManager: require("./src/managers/core/supplier-manager"),
            SparepartManager: require("./src/manager/core/sparepart-manager"),
            AccessoriesManager: require("./src/managers/core/accessories-manager"),
            TextileManager: require('./src/managers/core/textile-manager'),
            FabricManager: require('./src/managers/core/fabric-manager')
        }
    },
}
