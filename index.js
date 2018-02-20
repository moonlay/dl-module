module.exports = {
    managers: {
        auth: {
            AccountManager: require("./src/managers/auth/account-manager"),
            RoleManager: require("./src/managers/auth/role-manager"),
            ApiEndpointManager: require("./src/managers/auth/api-endpoint-manager")
        },
        master: {
            BuyerManager: require("./src/managers/master/buyer-manager"),
            GarmentBuyerManager: require("./src/managers/master/garment-buyer-manager"),
            SupplierManager: require("./src/managers/master/supplier-manager"),
            GarmentSupplierManager: require("./src/managers/master/garment-supplier-manager"),
            ProductManager: require("./src/managers/master/product-manager"),
            GarmentProductManager: require("./src/managers/master/garment-product-manager"),
            CategoryManager: require('./src/managers/master/category-manager'),
            GarmentCategoryManager: require('./src/managers/master/garment-category-manager'),
            DivisionManager: require('./src/managers/master/division-manager'),
            UnitManager: require('./src/managers/master/unit-manager'),
            UomManager: require('./src/managers/master/uom-manager'),
            CurrencyManager: require('./src/managers/master/currency-manager'),
            VatManager: require('./src/managers/master/vat-manager'),
            BudgetManager: require('./src/managers/master/budget-manager'),
            ThreadSpecificationManager: require('./src/managers/master/thread-specification-manager'),
            MachineManager: require('./src/managers/master/machine-manager'),
            MachineTypeManager: require('./src/managers/master/machine-type-manager'),
            SpinningProductionLotManager: require('./src/managers/master/spinning-production-lot-manager'),
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
            DesignMotiveManager: require('./src/managers/master/design-motive-manager'),
            StorageManager: require('./src/managers/master/storage-manager'),
            CompanyManager: require('./src/managers/master/company-manager'),
            ContactManager: require('./src/managers/master/contact-manager'),
            BadOutputReasonManager: require('./src/managers/master/bad-output-reason-manager'),
            FPDurationEstimationManager: require('./src/managers/master/fp-duration-estimation-manager'),
            DealTrackingReasonManager: require('./src/managers/master/deal-tracking-reason-manager'),
            SpinningYarnManager: require('./src/managers/master/spinning-yarn-manager'),
            KursBudgetManager: require('./src/managers/master/kurs-budget-manager')
        },
        inventory: {
            finishingPrinting: {
                FPPackingReceiptManager: require("./src/managers/inventory/finishing-printing/fp-packing-receipt-manager"),
                FPReturToQCDocManager: require("./src/managers/inventory/finishing-printing/fp-retur-to-qc-doc-manager"),
                FPShipmentDocument: require("./src/managers/inventory/finishing-printing/fp-shipment-document-manager"),
                FPReturFromBuyerManager: require("./src/managers/inventory/finishing-printing/fp-retur-fr-byr-doc-manager")
            },
            InventoryDocumentManager: require("./src/managers/inventory/inventory-document-manager"),
            InventorySummaryManager: require("./src/managers/inventory/inventory-summary-manager"),
            InventoryMovementManager: require("./src/managers/inventory/inventory-movement-manager")
        },
        garmentInventory: {

            GarmentInventoryDocumentManager: require("./src/managers/inventory-garment/garment-inventory-document-manager"),
            GarmentInventorySummaryManager: require("./src/managers/inventory-garment/garment-inventory-summary-manager"),
            GarmentInventoryMovementManager: require("./src/managers/inventory-garment/garment-inventory-movement-manager")
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
        garmentPurchasing: {
            PurchaseRequestManager: require('./src/managers/garment-purchasing/purchase-request-manager'),
            PurchaseOrderManager: require('./src/managers/garment-purchasing/purchase-order-manager'),
            PurchaseOrderExternalManager: require('./src/managers/garment-purchasing/purchase-order-external-manager'),
            DeliveryOrderManager: require('./src/managers/garment-purchasing/delivery-order-manager'),
            CustomsManager: require('./src/managers/garment-purchasing/customs-manager'),
            InvoiceNoteManager: require('./src/managers/garment-purchasing/invoice-note-manager'),
            PurchasePriceCorrection: require('./src/managers/garment-purchasing/purchase-price-correction-manager'),
            UnitReceiptNoteManager: require('./src/managers/garment-purchasing/unit-receipt-note-manager'),
            InternNoteManager: require('./src/managers/garment-purchasing/intern-note-manager'),
            PurchaseQuantityCorrectionManager: require('./src/managers/garment-purchasing/purchase-quantity-correction-manager'),
            GarmentCurrencyManager: require('./src/managers/garment-purchasing/garment-currency-manager'),
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
                FabricQualityControlManager: require('./src/managers/production/finishing-printing/fabric-quality-control-manager'),
                InspectionLotColorManager: require('./src/managers/production/finishing-printing/inspection-lot-color-manager'),
                PackingManager: require('./src/managers/production/finishing-printing/packing-manager')
            }
        },
        sales: {
            ProductionOrderManager: require('./src/managers/sales/production-order-manager'),
            FinishingPrintingSalesContractManager: require('./src/managers/sales/finishing-printing-sales-contract-manager'),
            SpinningSalesContractManager: require('./src/managers/sales/spinning-sales-contract-manager'),
            WeavingSalesContractManager: require('./src/managers/sales/weaving-sales-contract-manager'),
            DealTrackingBoardManager: require('./src/managers/sales/deal-tracking-board-manager'),
            DealTrackingStageManager: require('./src/managers/sales/deal-tracking-stage-manager'),
            DealTrackingDealManager: require('./src/managers/sales/deal-tracking-deal-manager'),
            DealTrackingActivityManager: require('./src/managers/sales/deal-tracking-activity-manager'),
            OrderStatusHistoryManager: require('./src/managers/sales/order-status-history-manager')
        },
        garmentMasterPlan: {
            WeeklyPlanManager: require("./src/managers/garment-master-plan/weekly-plan-manager"),
            WorkingHoursStandardManager: require('./src/managers/garment-master-plan/working-hours-standard-manager'),
            StyleManager: require('./src/managers/garment-master-plan/style-manager'),
            StandardHourManager: require('./src/managers/garment-master-plan/standard-hour-manager'),
            BookingOrderManager: require('./src/managers/garment-master-plan/booking-order-manager'),
            MasterPlanComodityManager: require('./src/managers/garment-master-plan/master-plan-comodity-manager'),
            SewingBlockingPlanManager: require('./src/managers/garment-master-plan/sewing-blocking-plan-manager'),
            GarmentSectionManager: require('./src/managers/garment-master-plan/garment-section-manager'),
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
                spinningProductionLot: require("./test/data-util/master/spinning-production-lot-data-util"),
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
                designMotive: require('./test/data-util/master/design-motive-data-util'),
                company: require('./test/data-util/master/company-data-util'),
                contact: require('./test/data-util/master/contact-data-util'),
                badOutputReason: require('./test/data-util/master/bad-output-reason-data-util'),
                fpDurationEstimation: require('./test/data-util/master/fp-duration-estimation-data-util'),
                dealTrackingReason: require('./test/data-util/master/deal-tracking-reason-data-util'),
                SpinningYarn: require('./test/data-util/master/spinning-yarn-data-util'),
                kursBudget: require('./test/data-util/master/kurs-budget-data-util')
            },
            purchasing: {
                purchaseRequest: require("./test/data-util/purchasing/purchase-request-data-util"),
                purchaseOrder: require("./test/data-util/purchasing/purchase-order-data-util"),
                purchaseOrderExternal: require("./test/data-util/purchasing/purchase-order-external-data-util"),
                deliveryOrder: require("./test/data-util/purchasing/delivery-order-data-util"),
                unitReceiptNote: require("./test/data-util/purchasing/unit-receipt-note-data-util"),
                unitPaymentOrder: require("./test/data-util/purchasing/unit-payment-order-data-util"),
                unitPaymentPriceCorrectionNot: require("./test/data-util/purchasing/unit-payment-price-correction-note-data-util"),
                unitPaymentQuantityCorrectionNote: require("./test/data-util/purchasing/unit-payment-quantity-correction-note-data-util"),
            },
            garmentPurchasing: {
                purchaseRequest: require("./test/data-util/garment-purchasing/purchase-request-data-util"),
                purchaseOrder: require("./test/data-util/garment-purchasing/purchase-order-data-util"),
                purchaseOrderExternal: require("./test/data-util/garment-purchasing/purchase-order-external-data-util"),
                deliveryOrder: require("./test/data-util/garment-purchasing/delivery-order-data-util"),
                customsOrder: require("./test/data-util/garment-purchasing/customs-data-util"),
                invoiceNoteManager: require('./test/data-util/garment-purchasing/invoice-note-data-util'),
                purchaseQuantityCorrection: require('./test/data-util/garment-purchasing/purchase-quantity-correction-data-util'),
                purchasePriceCorrection: require('./test/data-util/garment-purchasing/purchase-price-correction-data-util'),
                // unitReceiptNote: require("./test/data-util/garment-purchasing/unit-receipt-note-data-util"),
                // unitPaymentOrder: require("./test/data-util/garment-purchasing/unit-payment-order-data-util"),
                // unitPaymentPriceCorrectionNot: require("./test/data-util/garment-purchasing/unit-payment-price-correction-note-data-util"),
                // unitPaymentQuantityCorrectionNote: require("./test/data-util/garment-purchasing/unit-payment-quantity-correction-note-data-util"),
            },
            garmentInventory: {

                garmentInventoryDocument: require("./test/data-util/inventory-garment/garment-inventory-document-data-util"),
                garmentInventorySummary: require("./test/data-util/inventory-garment/garment-inventory-summary-data-util"),
                garmentInventoryMovement: require("./test/data-util/inventory-garment/garment-inventory-movement-data-util")
            },
            inventory: {
                finishingPrinting: {
                    packingReceipt: require("./test/data-util/inventory/finishing-printing/fp-packing-receipt-data-util"),
                    fpReturToQCDoc: require("./test/data-util/inventory/finishing-printing/fp-retur-to-qc-doc-data-util"),
                    shipmentDocument: require("./test/data-util/inventory/finishing-printing/fp-shipment-document-data-util"),
                    fpReturFromBuyerDoc: require("./test/data-util/inventory/finishing-printing/fp-retur-fr-byr-doc-data-util")
                },
                inventoryDocument: require('./test/data-util/inventory/inventory-document-data-util'),
                inventoryMovement: require('./test/data-util/inventory/inventory-movement-data-util'),
                inventorySummary: require('./test/data-util/inventory/inventory-summary-data-util')
            },
            production: {
                dailyOperation: require('./test/data-util/production/finishing-printing/daily-operation-data-util'),
                monitoringEvent: require('./test/data-util/production/finishing-printing/monitoring-event-data-util'),
                monitoringSpecificationMachine: require('./test/data-util/production/finishing-printing/monitoring-specification-machine-data-util'),
                kanban: require('./test/data-util/production/finishing-printing/kanban-data-util'),
                fabricQualityControl: require('./test/data-util/production/finishing-printing/fabric-quality-control-data-util'),
                inspectionLotColor: require('./test/data-util/production/finishing-printing/inspection-lot-color-data-util'),
                packing: require('./test/data-util/production/finishing-printing/packing-data-util')
            },
            sales: {
                productionOrder: require('./test/data-util/sales/production-order-data-util'),
                finishingPrintingSalesContract: require('./test/data-util/sales/finishing-printing-sales-contract-data-util'),
                weavingSalesContract: require('./test/data-util/sales/weaving-sales-contract-data-util'),
                spinningSalesContract: require('./test/data-util/sales/spinning-sales-contract-data-util'),
                dealTrackingBoard: require('./test/data-util/sales/deal-tracking-board-data-util'),
                dealTrackingStage: require('./test/data-util/sales/deal-tracking-stage-data-util'),
                dealTrackingDeal: require('./test/data-util/sales/deal-tracking-deal-data-util'),
                dealTrackingActivity: require('./test/data-util/sales/deal-tracking-activity-data-util'),
                orderStatusHistory: require('./test/data-util/sales/order-status-historical-data-util')
            },
            garmentMasterPlan: {
                weeklyPlan: require("./test/data-util/garment-master-plan/weekly-plan-data-util"),
                workingHoursStandard: require("./test/data-util/garment-master-plan/working-hours-standard-data-util"),
                style: require("./test/data-util/garment-master-plan/style-data-util"),
                standardHour: require("./test/data-util/garment-master-plan/standard-hour-data-util"),
                bookingOrder: require("./test/data-util/garment-master-plan/booking-order-data-util"),
                masterPlanComodity: require("./test/data-util/garment-master-plan/master-plan-comodity-data-util"),
                sewingBlockingPlan: require("./test/data-util/garment-master-plan/sewing-blocking-plan-data-util"),
                garmentSection: require("./test/data-util/garment-master-plan/garment-section-data-util")
            }
        }
    },
    etl: {
        dim: {
            dimCategory: require("./src/etl/dim/dim-category-etl-manager"),
            dimStaff: require("./src/etl/dim/dim-staff-etl-manager"),
            dimDivision: require("./src/etl/dim/dim-division-etl-manager"),
            dimBuyer: require("./src/etl/dim/dim-buyer-etl-manager"),
            dimOrderType: require("./src/etl/dim/dim-order-type-etl-manager"),
            dimProcessType: require("./src/etl/dim/dim-process-type-etl-manager"),
            dimSupplier: require("./src/etl/dim/dim-supplier-etl-manager"),
            dimUnit: require("./src/etl/dim/dim-unit-etl-manager"),
            dimMachine: require("./src/etl/dim/dim-machine-etl-manager"),
            dimStorage: require("./src/etl/dim/dim-storage-etl-manager"),
            dimProduct: require("./src/etl/dim/dim-product-etl-manager"),
            dimCompany: require("./src/etl/dim/dim-company-etl-manager"),
            dimContact: require("./src/etl/dim/dim-contact-etl-manager"),
            dimDurationEstimation: require("./src/etl/dim/dim-duration-estimation-etl-manager"),
            dimBudget: require("./src/etl/dim/dim-budget-etl-manager")
        },
        inventory: {
            factPackingReceipt: require("./src/etl/inventory/fact-fp-packing-receipt-etl-manager"),
            factShipmentDocument: require("./src/etl/inventory/fact-shipment-document-etl-manager"),
            factInventoryMovement: require("./src/etl/inventory/fact-inventory-movement-etl-manager"),
            factInventorySummary: require("./src/etl/inventory/fact-inventory-summary-etl-manager")
        },
        production: {
            factMonitoringEvent: require("./src/etl/production/fact-monitoring-event-etl-manager"),
            factKanban: require("./src/etl/production/fact-kanban-etl-manager"),
            factProductionOrder: require("./src/etl/production/fact-production-order-etl-manager"),
            factDailyOperations: require("./src/etl/production/fact-daily-operations-etl-manager"),
            factFabricQualityControl: require("./src/etl/production/fact-fabric-quality-control-etl-manager"),
            factPacking: require("./src/etl/production/fact-packing-etl-manager"),
            factInspectionLotColor: require("./src/etl/production/fact-inspection-lot-color-etl-manager")
        },
        purchasing: {
            factPembelian: require("./src/etl/purchasing/fact-pembelian"),
            factTotalHutang: require("./src/etl/purchasing/fact-total-hutang-etl-manager")
        },
        sales: {
            factWeavingSalesContract: require("./src/etl/sales/fact-weaving-sales-contract-etl-manager"),
            factFinishingPrintingSalesContract: require("./src/etl/sales/fact-finishing-printing-sales-contract-etl-manager"),
            factSpinningSalesContract: require("./src/etl/sales/fact-spinning-sales-contract-etl-manager"),
            factProductionOrderStatus: require("./src/etl/sales/fact-production-order-status-etl-manager"),
            factDealTrackingBoard: require("./src/etl/sales/fact-deal-tracking-board-etl-manager"),
            factDealTrackingStage: require("./src/etl/sales/fact-deal-tracking-stage-etl-manager"),
            factDealTrackingDeal: require("./src/etl/sales/fact-deal-tracking-deal-etl-manager"),
            factDealTrackingActivity: require("./src/etl/sales/fact-deal-tracking-activity-etl-manager")
        },
        garment: {
            dim: {
                dimGarmentSupplier: require("./src/etl/garment/dim/dim-garment-supplier-etl-manager")
            },
            purchasing: {
                factTotalHutangGarment: require("./src/etl/garment/purchasing/fact-total-hutang-etl-manager")
            },
            garmentPurchaseRequestsEtl: require("./src/etl/garment/garment-purchase-request-etl-manager"),
            factGarmentPurchasing: require("./src/etl/garment/purchasing/fact-purchasing-etl-manager"),
        },
        migrationLog: {
            migrationLogManager: require("./src/etl/migration-log/migration-log-manager"),
        }
    }
}
