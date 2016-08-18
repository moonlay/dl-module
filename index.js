module.exports = {
    managers: {
        core: {
            BuyerManager: require("./src/managers/core/buyer-manager"),
            SupplierManager: require("./src/managers/core/supplier-manager"),
            SparepartManager: require("./src/managers/core/sparepart-manager"),
            AccessoriesManager: require("./src/managers/core/accessories-manager"),
            TextileManager: require('./src/managers/core/textile-manager'),
            FabricManager: require('./src/managers/core/fabric-manager'),
            GeneralMerchandiseManager: require('./src/managers/core/general-merchandise-manager'),
            UoMManager: require('./src/managers/core/UoM-manager')
        },
        po: {
            PurchaseOrder: require('./src/managers/po/purchase-order-manager'),
            PurchaseOrderGroup: require('./src/managers/po/purchase-order-group-manager'),
            POGarmentSparepart: require('./src/managers/po/po-garment-sparepart-manager'),
            POGarmentGeneral: require('./src/managers/po/po-garment-general-manager'),
            POTextileJobOrderManager: require('./src/managers/po/po-textile-joborder-manager')
        }
    }
}
