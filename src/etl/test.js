joinUnitPaymentOrder(data) {

        var joinUnitPaymentOrders = data.map((unitReceiptNote) => {
            return this.unitPaymentOrderManager.collection.find({
                items: {
                    "$elemMatch": {
                        unitReceiptNoteId: unitReceiptNote._id.toString()
                    }
                }
            }).toArray()
                .then((unitPaymentOrders) => {
                    var arr = unitPaymentOrders.map((unitPaymentOrder) => {
                        return {
                            unitPaymentOrder: unitPaymentOrder,
                            unitReceiptNote: unitReceiptNote
                        };
                    });

                    return Promise.resolve(arr);
                });
        });
        return Promise.all(joinUnitPaymentOrders)
            .then((joinUnitPaymentOrder => {
                return Promise.resolve([].concat.apply([], joinUnitPaymentOrder));
            }));
    }