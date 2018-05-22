var global = require('../../global');

module.exports = function (data, offset) {

    var items = data.items.map(invoiceNote => {
        var invoiceItem = invoiceNote.items.map(dataItem => {
            var _items = dataItem.items.map(item => {
                dueDate = new Date(dataItem.deliveryOrderSupplierDoDate);
                dueDate.setDate(dueDate.getDate() + item.paymentDueDays);
                return {
                    deliveryOrderNo: dataItem.deliveryOrderNo,
                    date: dataItem.deliveryOrderDate,
                    purchaseRequestRefNo: item.purchaseRequestRefNo,
                    purchaseOrderExternalNo: item.purchaseOrderExternalNo,
                    product: item.product.name,
                    productDesc: item.product.description,
                    quantity: item.deliveredQuantity,
                    uom: item.purchaseOrderUom.unit,
                    unit: item.unit,
                    price: item.pricePerDealUnit,
                    priceTotal: item.pricePerDealUnit * item.deliveredQuantity,
                    correction: item.correction,
                    dueDate: dueDate,
                    paymentMethod: item.paymentMethod,
                    currRate: item.kursRate,
                }
            });
            _items = [].concat.apply([], _items);
            return _items;
        })
        invoiceItem = [].concat.apply([], invoiceItem);
        return invoiceItem;
    });
    items = [].concat.apply([], items);

    var dueDate, paymentMethod;

    var dueDates = items.map(item => {
        return item.dueDate
    })
    dueDate = Math.max.apply(null, dueDates);
    paymentMethod = items[0].paymentMethod;

    var usePayTax = data.items
        .map((item) => item.isPayTax)
        .reduce((prev, curr, index) => {
            return prev && curr
        }, true);

    var useIncomeTax = data.items
        .map((item) => item.useIncomeTax)
        .reduce((prev, curr, index) => {
            return prev && curr
        }, true);

    var useVat = data.items
        .map((item) => item.useVat)
        .reduce((prev, curr, index) => {
            return prev && curr
        }, true);

    var vatRate = 0;
    if (useVat) {
        vatRate = data.items[0].vat.rate;
    }

    var sumByUnit = [];
    items.reduce(function (res, value) {
        if (!res[value.unit]) {
            res[value.unit] = {
                priceTotal: 0,
                unit: value.unit
            };
            sumByUnit.push(res[value.unit])
        }
        res[value.unit].priceTotal += value.priceTotal
        return res;
    }, {});

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
                                style: ['size08']
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
                                width: '28%',
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
                                width: '28%',
                                text: 'Tgl. Jatuh Tempo',
                                style: ['size06']
                            }, {
                                width: '2%',
                                text: ':',
                                style: ['size06']
                            }, {
                                width: '*',
                                text: `${moment(dueDate).add(offset, 'h').format("DD MMM YYYY")}`,
                                style: ['size06']
                            }]
                        }, {
                            columns: [{
                                width: '28%',
                                text: 'Term Pembayaran',
                                style: ['size06']
                            }, {
                                width: '2%',
                                text: ':',
                                style: ['size06']
                            }, {
                                width: '*',
                                text: paymentMethod,
                                style: ['size06']
                            }]
                        },
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
            text: 'Nomor referensi PR',
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
            text: `${item.purchaseRequestRefNo} - ${item.purchaseOrderExternalNo}`,
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
            widths: ['12%', '12%', '12%', '22%', '7%', '7%', '12%', '15%'],
            headerRows: 1,
            body: [].concat([thead], tbody)
        }
    }];

    var unitK1 = sumByUnit.find((item) => item.unit.toUpperCase() == "C2A");
    var unitK2 = sumByUnit.find((item) => item.unit.toUpperCase() == "C2B");
    var unitK3 = sumByUnit.find((item) => item.unit.toUpperCase() == "C2C");
    var unitK4 = sumByUnit.find((item) => item.unit.toUpperCase() == "C1A");
    var unit2D = sumByUnit.find((item) => item.unit.toUpperCase() == "C1B");
    var sum = sumByUnit.map(item => item.priceTotal)
        .reduce(function (prev, curr, index, arr) {
            return prev + curr;
        }, 0);
    var sumKoreksi = items.map(item => item.correction)
        .reduce(function (prev, curr, index, arr) {
            return prev + curr;
        }, 0);

    var sumByCurrency = items.map(item => item.priceTotal * item.currRate)
        .reduce(function (prev, curr, index, arr) {
            return prev + curr;
        }, 0);
    var incomeTaxTotal = usePayTax ? (useIncomeTax ? sumByCurrency * 0.1 : 0) : 0;
    var vatTotal = usePayTax ? (useVat ? sumByCurrency * vatRate / 100 : 0) : 0;
    var sumTotal = sumByCurrency - vatTotal + incomeTaxTotal + sumKoreksi;

    var subFooter = [
        {
            text: '\n',
            style: ['size06']
        },
        {
            columns: [
                {
                    stack: [
                        {
                            columns: [
                                {
                                    width: '25%',
                                    text: 'Total K1 (2A)'
                                },
                                {
                                    width: '2%',
                                    text: ':'
                                },
                                {
                                    width: '*',
                                    text: unitK1 ? parseFloat(unitK1.priceTotal).toLocaleString(locale, locale.currency) : ""
                                }
                            ]
                        },
                        {
                            columns: [
                                {
                                    width: '25%',
                                    text: 'Total K2 (2B)'
                                },
                                {
                                    width: '2%',
                                    text: ':'
                                },
                                {
                                    width: '*',
                                    text: unitK2 ? parseFloat(unitK2.priceTotal).toLocaleString(locale, locale.currency) : ""
                                }
                            ]
                        },
                        {
                            columns: [
                                {
                                    width: '25%',
                                    text: 'Total K3 (2C)'
                                },
                                {
                                    width: '2%',
                                    text: ':'
                                },
                                {
                                    width: '*',
                                    text: unitK3 ? parseFloat(unitK3.priceTotal).toLocaleString(locale, locale.currency) : ""
                                }
                            ]
                        },
                        {
                            columns: [
                                {
                                    width: '25%',
                                    text: 'Total K4 (1)'
                                },
                                {
                                    width: '2%',
                                    text: ':'
                                },
                                {
                                    width: '*',
                                    text: unitK4 ? parseFloat(unitK4.priceTotal).toLocaleString(locale, locale.currency) : ""
                                }
                            ]
                        },
                        {
                            columns: [
                                {
                                    width: '25%',
                                    text: 'Total 2D'
                                },
                                {
                                    width: '2%',
                                    text: ':'
                                },
                                {
                                    width: '*',
                                    text: unit2D ? parseFloat(unit2D.priceTotal).toLocaleString(locale, locale.currency) : ""
                                }
                            ]
                        },
                    ]
                },
                {
                    stack: [
                        {
                            columns: [
                                {
                                    width: '45%',
                                    text: 'Total Harga Pokok (DPP)'
                                },
                                {
                                    width: '2%',
                                    text: ':'
                                },
                                {
                                    width: '*',
                                    text: parseFloat(sum).toLocaleString(locale, locale.currency)
                                }
                            ]
                        },
                        {
                            columns: [
                                {
                                    width: '45%',
                                    text: 'Mata Uang'
                                },
                                {
                                    width: '2%',
                                    text: ':'
                                },
                                {
                                    width: '*',
                                    text: data.currency.code
                                }
                            ]
                        },
                        {
                            columns: [
                                {
                                    width: '45%',
                                    text: 'Total Harga Pokok (Rp)'
                                },
                                {
                                    width: '2%',
                                    text: ':'
                                },
                                {
                                    width: '*',
                                    text: parseFloat(sum * data.currency.rate).toLocaleString(locale, locale.currency)
                                }
                            ]
                        },
                        {
                            columns: [
                                {
                                    width: '45%',
                                    text: 'Total Nota Koreksi'
                                },
                                {
                                    width: '2%',
                                    text: ':'
                                },
                                {
                                    width: '*',
                                    text: parseFloat(sumKoreksi).toLocaleString(locale, locale.currency)
                                }
                            ]
                        },
                        {
                            columns: [
                                {
                                    width: '45%',
                                    text: 'Total Nota PPN'
                                },
                                {
                                    width: '2%',
                                    text: ':'
                                },
                                {
                                    width: '*',
                                    text: parseFloat(incomeTaxTotal).toLocaleString(locale, locale.currency)
                                }
                            ]
                        },
                        {
                            columns: [
                                {
                                    width: '45%',
                                    text: 'Total Nota PPH'
                                },
                                {
                                    width: '2%',
                                    text: ':'
                                },
                                {
                                    width: '*',
                                    text: parseFloat(vatTotal).toLocaleString(locale, locale.currency)
                                }
                            ]
                        },
                        {
                            columns: [
                                {
                                    width: '45%',
                                    text: 'Total yang harus dibayar'
                                },
                                {
                                    width: '2%',
                                    text: ':'
                                },
                                {
                                    width: '*',
                                    text: parseFloat(sumTotal).toLocaleString(locale, locale.currency)
                                }
                            ]
                        },
                    ]
                }
            ],
            style: ['size07']
        }];

    var footer = ['\n\n', {
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
        content: [].concat(header, subHeader, table, subFooter, footer),
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