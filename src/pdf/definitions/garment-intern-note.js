var global = require('../../global');

module.exports = function (data, offset) {

    var items = data.items.map(invoiceNote => {
        var invoiceItem = invoiceNote.items.map(dataItem => {
            var _items = dataItem.items.map(item => {
                return {
                    deliveryOrderNo: dataItem.deliveryOrderNo,
                    date: dataItem.deliveryOrderDate,
                    purchaseRequestNo: item.purchaseRequestNo,
                    product: item.product.name,
                    productDesc: item.product.description,
                    quantity: item.deliveredQuantity,
                    uom: item.purchaseOrderUom.unit,
                    price: item.pricePerDealUnit,
                    priceTotal: item.pricePerDealUnit * item.deliveredQuantity
                }
            });
            _items = [].concat.apply([], _items);
            return _items;
        })
        invoiceItem = [].concat.apply([], invoiceItem);
        return invoiceItem;
    });
    items = [].concat.apply([], items);

    var locale = global.config.locale;
    var moment = require('moment');
    moment.locale(locale.name);

    var header = [
        {
            stack: [
                'PT. DAN LIRIS',
                'Head Office   : ',
                'Kelurahan Banaran, Kecamatan Grogol',
                'Sukoharjo 57193 - INDONESIA',
                'PO.BOX 166 Solo 57100',
                'Telp. (0271) 740888, 714400',
                'Fax. (0271) 735222, 740777'
            ],
            alignment: "left",
            style: ['size06', 'bold']
        },
        {
            alignment: "center",
            text: 'NOTA INTERN',
            style: ['size08', 'bold']
        },
        '\n'
    ];

    var subHeader = [
        {
            columns: [
                {
                    width: '50%',
                    stack: [
                        {
                            columns: [{
                                width: '25%',
                                text: 'No. Nota Intern',
                                style: ['size06']
                            }, {
                                width: '2%',
                                text: ':',
                                style: ['size06']
                            }, {
                                width: '*',
                                text: data.no,
                                style: ['size06']
                            }]
                        },
                        {
                            columns: [{
                                width: '25%',
                                text: 'Kode Supplier',
                                style: ['size06']
                            }, {
                                width: '2%',
                                text: ':',
                                style: ['size06']
                            }, {
                                width: '*',
                                text: data.supplier.code,
                                style: ['size06']
                            }]
                        },
                        {
                            columns: [{
                                width: '25%',
                                text: 'Nama Supplier',
                                style: ['size06']
                            }, {
                                width: '2%',
                                text: ':',
                                style: ['size06']
                            }, {
                                width: '*',
                                text: data.supplier.name,
                                style: ['size06']
                            }]
                        }
                    ]
                }, {
                    width: '50%',
                    stack: [
                        {
                            columns: [{
                                width: '25%',
                                text: 'Tgl. Nota Intern',
                                style: ['size06']
                            }, {
                                width: '2%',
                                text: ':',
                                style: ['size06']
                            }, {
                                width: '*',
                                text: `${moment(data.date).add(offset, 'h').format("DD MMM YYYY")}`,
                                style: ['size06']
                            }]
                        },
                        {
                            columns: [{
                                width: '25%',
                                text: 'Tgl. Jatuh Tempo',
                                style: ['size06']
                            }, {
                                width: '2%',
                                text: ':',
                                style: ['size06']
                            }, {
                                width: '*',
                                text: `${moment(data.dueDate).add(offset, 'h').format("DD MMM YYYY")}`,
                                style: ['size06']
                            }]
                        }
                    ]
                }
            ]
        },
        {
            text: '\n',
            style: ['size06']
        }
    ];

    var thead = [
        {
            text: 'No. Surat Jalan',
            style: ['size06', 'bold', 'center']
        }, {
            text: 'Tgl. Surat Jalan',
            style: ['size06', 'bold', 'center']
        }, {
            text: 'Plan PO',
            style: ['size06', 'bold', 'center']
        }, {
            text: 'Keterangan Barang',
            style: ['size06', 'bold', 'center']
        }, {
            text: 'Jumlah',
            style: ['size06', 'bold', 'center']
        }, {
            text: 'Satuan',
            style: ['size06', 'bold', 'center']
        }, {
            text: 'Harga Satuan',
            style: ['size06', 'bold', 'center']
        }, {
            text: 'Harga Total',
            style: ['size06', 'bold', 'center']
        }
    ];

    var tbody = items.map(function (item, index) {
        return [{
            text: item.deliveryOrderNo,
            style: ['size06', 'left']
        }, {
            text: `${moment(item.date).add(offset, 'h').format("DD MMM YYYY")}`,
            style: ['size06', 'left']
        }, {
            text: item.purchaseRequestNo,
            style: ['size06', 'left']
        }, {
            text: `${item.product};${item.productDesc}`,
            style: ['size06', 'left']
        }, {
            text: item.quantity,
            style: ['size06', 'right']
        }, {
            text: item.uom,
            style: ['size06', 'left']
        }, {
            text: parseFloat(item.price).toLocaleString(locale, locale.currency),
            style: ['size06', 'right']
        }, {
            text: parseFloat(item.priceTotal).toLocaleString(locale, locale.currency),
            style: ['size06', 'right']
        }];
    });

    tbody = tbody.length > 0 ? tbody : [
        [{
            text: "tidak ada barang",
            style: ['size06', 'center'],
            colSpan: 8
        }, "", "", "", "", "", "", ""]
    ];
    var table = [{
        table: {
            widths: ['12%', '12%', '10%', '25%', '7%', '7%', '12%', '15%'],
            headerRows: 1,
            body: [].concat([thead], tbody)
        }
    }];

    var footer = ['\n\n\n\n\n', {
        alignment: "center",
        table: {
            widths: ['33%', '33%', '33%'],
            body: [
                [
                    {
                        text: 'Administrasi',
                        style: ['size06', 'bold', 'center']
                    }, {
                        text: 'Staff Pembelian',
                        style: ['size06', 'bold', 'center']
                    }, {
                        text: 'Verifikasi',
                        style: ['size06', 'bold', 'center']
                    }
                ],
                [
                    {
                        stack: ['\n\n\n\n',
                            {
                                text: '(Nama & Tanggal)',
                                style: ['size06', 'center']
                            }
                        ]
                    }, {
                        stack: ['\n\n\n\n',
                            {
                                text: '(Nama & Tanggal)',
                                style: ['size06', 'center']
                            }
                        ]
                    }, {
                        stack: ['\n\n\n\n',
                            {
                                text: '(Nama & Tanggal)',
                                style: ['size06', 'center']
                            }
                        ]
                    }
                ]
            ]
        }
    }];

    var dd = {
        pageSize: 'A5',
        pageOrientation: 'portrait',
        pageMargins: 20,
        content: [].concat(header, subHeader, table, footer),
        styles: {
            size06: {
                fontSize: 6
            },
            size07: {
                fontSize: 7
            },
            size08: {
                fontSize: 8
            },
            size09: {
                fontSize: 9
            },
            size10: {
                fontSize: 10
            },
            bold: {
                bold: true
            },
            center: {
                alignment: 'center'
            },
            left: {
                alignment: 'left'
            },
            right: {
                alignment: 'right'
            },
            justify: {
                alignment: 'justify'
            }
        }
    };

    return dd;
};