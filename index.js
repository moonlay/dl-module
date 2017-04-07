module.exports = {
    managers: {
        auth: {
            AccountManager: require("./src/managers/auth/account-manager"),
            RoleManager: require("./src/managers/auth/role-manager"),
            ApiEndpointManager: require("./src/managers/auth/api-endpoint-manager")
        },
        master: {
            BuyerManager: require("./src/managers/master/buyer-manager"),
            SupplierManager: require("./src/managers/master/supplier-manager"),
            ProductManager: require("./src/managers/master/product-manager"),
            CategoryManager: require('./src/managers/master/category-manager'),
            DivisionManager: require('./src/managers/master/division-manager'),
            UnitManager: require('./src/managers/master/unit-manager'),
            UomManager: require('./src/managers/master/uom-manager'),
            CurrencyManager: require('./src/managers/master/currency-manager'),
            VatManager: require('./src/managers/master/vat-manager'),
            BudgetManager: require('./src/managers/master/budget-manager'),
            ThreadSpecificationManager: require('./src/managers/master/thread-specification-manager'),
            MachineManager: require('./src/managers/master/machine-manager'),
            MachineTypeManager: require('./src/managers/master/machine-type-manager'),
            LotMachineManager: require('./src/managers/master/lot-machine-manager'),
            YarnEquivalentConversion: require('./src/managers/master/yarn-equivalent-conversion-manager'),
            UsterManager: require('./src/managers/master/uster-manager'),
            LampStandardManager: require('./src/managers/master/lamp-standard-manager'),
            AccountBankManager: require('./src/managers/master/account-bank-manager'),
            InstructionManager: require('./src/managers/master/instruction-manager'),
            StepManager: require('./src/managers/master/step-manager'),
            ProcessTypeManager: require('./src/managers/master/process-type-manager'),
            OrderTypeManager: require('./src/managers/master/order-type-manager'),
            ColorTypeManager: require('./src/managers/master/color-type-manager'),
            MaterialConstructionManager: require('./src/managers/master/material-construction-manager'),
            FinishTypeManager: require('./src/managers/master/finish-type-manager'),
            StandardTestManager: require('./src/managers/master/standard-test-manager'),
            YarnMaterialManager: require('./src/managers/master/yarn-material-manager'),
            ComodityManager: require('./src/managers/master/comodity-manager'),
            QualityManager: require('./src/managers/master/quality-manager'),
            TermOfPaymentManager: require('./src/managers/master/term-of-payment-manager'),
            DesignMotiveManager: require('./src/managers/master/design-motive-manager')
        },
        purchasing: {
            PurchaseOrderManager: require('./src/managers/purchasing/purchase-order-manager'),
            PurchaseOrderExternalManager: require('./src/managers/purchasing/purchase-order-external-manager'),
            DeliveryOrderManager: require('./src/managers/purchasing/delivery-order-manager'),
            UnitReceiptNoteManager: require('./src/managers/purchasing/unit-receipt-note-manager'),
            PurchaseRequestManager: require('./src/managers/purchasing/purchase-request-manager'),
            UnitPaymentPriceCorrectionNoteManager: require('./src/managers/purchasing/unit-payment-price-correction-note-manager'),
            UnitPaymentOrderManager: require('./src/managers/purchasing/unit-payment-order-manager'),
            UnitPaymentQuantityCorrectionNoteManager: require('./src/managers/purchasing/unit-payment-quantity-correction-note-manager')
        },
        production: {
            spinning: {
                winding: {
                    WindingQualitySampling: require('./src/managers/production/spinning/winding/winding-quality-sampling-manager'),
                    WindingProductionOutput: require('./src/managers/production/spinning/winding/winding-production-output-manager')
                },
                DailySpinningProductionReportManager: require('./src/managers/production/spinning/daily-spinning-production-report-manager')
            },
            finishingPrinting: {
                DailyOperationManager: require('./src/managers/production/finishing-printing/daily-operation-manager'),
                MonitoringEventManager: require('./src/managers/production/finishing-printing/monitoring-event-manager'),
                MonitoringSpecificationMachineManager: require('./src/managers/production/finishing-printing/monitoring-specification-machine-manager'),
                KanbanManager: require('./src/managers/production/finishing-printing/kanban-manager'),
                FabricQualityControlManager: require('./src/managers/production/finishing-printing/fabric-quality-control-manager')
            }
        },
        sales:{
            ProductionOrderManager: require('./src/managers/sales/production-order-manager'),
            FinishingPrintingSalesContractManager: require('./src/managers/sales/finishing-printing-sales-contract-manager'),
            SpinningSalesContractManager: require('./src/managers/sales/spinning-sales-contract-manager'),
            WeavingSalesContractManager: require('./src/managers/sales/weaving-sales-contract-manager')
        }

    },
    test: {
        data: {
            auth: {
                account: require("./test/data-util/auth/account-data-util"),
                role: require("./test/data-util/auth/role-data-util")
            },
            master: {
                accountBank: require("./test/data-util/master/account-bank-data-util"),
                budget: require("./test/data-util/master/budget-data-util"),
                buyer: require("./test/data-util/master/buyer-data-util"),
                category: require("./test/data-util/master/category-data-util"),
                currency: require("./test/data-util/master/currency-data-util"),
                division: require("./test/data-util/master/division-data-util"),
                lampStandard: require("./test/data-util/master/lamp-standard-data-util"),
                lotMachine: require("./test/data-util/master/lot-machine-data-util"),
                machine: require("./test/data-util/master/machine-data-util"),
                machineType: require("./test/data-util/master/machine-type-data-util"),
                product: require("./test/data-util/master/product-data-util"),
                supplier: require("./test/data-util/master/supplier-data-util"),
                threadSpecification: require("./test/data-util/master/thread-specification-data-util"),
                unit: require("./test/data-util/master/unit-data-util"),
                uom: require("./test/data-util/master/uom-data-util"),
                uster: require("./test/data-util/master/uster-data-util"),
                vat: require("./test/data-util/master/vat-data-util"),
                yarnEquivalentConversion: require("./test/data-util/master/yarn-equivalent-conversion-data-util"),
                step: require("./test/data-util/master/step-data-util"),
                instruction: require("./test/data-util/master/instruction-data-util"),
                orderType: require('./test/data-util/master/order-type-data-util'),
                processType: require('./test/data-util/master/process-type-data-util'),
                materialConstruction: require('./test/data-util/master/material-construction-data-util'),
                yarnMaterial: require('./test/data-util/master/yarn-material-data-util'),
                finishType: require('./test/data-util/master/finish-type-data-util'),
                standardTest: require('./test/data-util/master/standard-test-data-util'),
                colorType: require('./test/data-util/master/color-type-data-util'),
                comodity: require('./test/data-util/master/comodity-data-util'),
                quality: require('./test/data-util/master/quality-data-util'),
                termOfPayment: require('./test/data-util/master/term-of-payment-data-util'),
                designMotive: require('./test/data-util/master/design-motive-data-util')
            },
            purchasing: {
                purchaseRequest: require("./test/data-util/purchasing/purchase-request-data-util")
            },
            production: {
                dailyOperation: require('./test/data-util/production/finishing-printing/daily-operation-data-util'),
                monitoringEvent: require('./test/data-util/production/finishing-printing/monitoring-event-data-util'),
                monitoringSpecificationMachine: require('./test/data-util/production/finishing-printing/monitoring-specification-machine-data-util'),
                kanban: require('./test/data-util/production/finishing-printing/kanban-data-util'),
                fabricQualityControl: require('./test/data-util/production/finishing-printing/fabric-quality-control-data-util')
            },
            sales:{
                productionOrder: require('./test/data-util/sales/production-order-data-util'),
                finishingPrintingSalesContract: require('./test/data-util/sales/finishing-printing-sales-contract-data-util'),
                weavingSalesContract: require('./test/data-util/sales/weaving-sales-contract-data-util'),
                spinningSalesContract: require('./test/data-util/sales/spinning-sales-contract-data-util')
            }
        }
    },
    etl: {
        factPembelian: require("./src/etl/fact-pembelian"),
        factTotalHutang: require("./src/etl/fact-total-hutang-etl-manager"),
        dimCategory: require("./src/etl/dim-category-etl-manager"),
        dimDivision: require("./src/etl/dim-division-etl-manager"),
        dimBuyer: require("./src/etl/dim-buyer-etl-manager"),
        dimSupplier: require("./src/etl/dim-supplier-etl-manager"),
        dimUnit: require("./src/etl/dim-unit-etl-manager"),
        dimMachine: require("./src/etl/dim-machine-etl-manager"),
        factMonitoringEvent: require("./src/etl/fact-monitoring-event-etl-manager"),
        factProductionOrder: require("./src/etl/fact-production-order-etl-manager"),
        factWeavingSalesContract: require("./src/etl/fact-weaving-sales-contract-etl-manager"),
        factFinishingPrintingSalesContract: require("./src/etl/fact-finishing-printing-sales-contract-etl-manager"),
        factSpinningSalesContract: require("./src/etl/fact-spinning-sales-contract-etl-manager")
    }
}
