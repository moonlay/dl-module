var global = require('../../global');

module.exports = function (pox, offset) {

    var _items = pox.items.map(po => {
        return po.items.map(poItem => {
            // var productName = [poItem.product.name, po.refNo].filter(r => r && r.toString().trim() != '').join("\n");
            return {
                product: poItem.product.name,
                prNo: po.refNo,
                quantity: poItem.dealQuantity,
                uom: poItem.dealUom.unit,
                price: poItem.pricePerDealUnit,
                remark: poItem.remark
            };
        });
    });

    _items = [].concat.apply([], _items);

    var items = [];
    var map = new Map();
    for (var _item of _items) {
        var key = _item.product;
        if (!map.has(key))
            map.set(key, [])
        map.get(key).push(_item);
    }
    map.forEach((_items, product) => {
        var poeItem = {};
        poeItem.product = product;
        poeItem.quantity = _items
            .map(_item => _item.quantity)
            .reduce((prev, curr, index) => {
                return prev + curr;
            }, 0);
        var prNos = [];
        _items
            .map(function (_item) {
                if (_item.prNo != "") {
                    prNos.push(_item.prNo);
                }
            })
        poeItem.prNo = prNos.join("\n");
        poeItem.uom = _items[0].uom;
        poeItem.price = _items[0].price;

        var remaks = [];
        _items
            .map(function (_item) {
                if (_item.remark != "") {
                    remaks.push(_item.remark);
                }
            })
        poeItem.remark = remaks.join("\n");
        items.push(poeItem);
    });


    var iso = "FM-PB-00-06-009/R1";
    var number = pox.no;
    var currency = pox.currency.code;
    var supplier = pox.supplier.name;
    var supplierAtt = pox.supplier.PIC;
    var supplierTel = pox.supplier.contact;

    var locale = global.config.locale;

    var moment = require('moment');
    moment.locale(locale.name);

    var header = [{
        text: 'PT. DAN LIRIS',
        style: 'bold'
    }, {
            columns: [{
                width: '50%',
                stack: [
                    'Head Office   : ',
                    'Kelurahan Banaran',
                    'Kecamatan Grogol',
                    'Sukoharjo 57193 - INDONESIA',
                    'PO.BOX 166 Solo 57100',
                    'Telp. (0271) 740888, 714400',
                    'Fax. (0271) 735222, 740777'
                ],
                style: ['size07', 'bold']
            }, {
                    stack: [{
                        text: iso,
                        alignment: "right",
                        style: ['size08']
                    }, {
                            text: `Nomor PO : ${number}`,
                            alignment: "right",
                            style: ['size09', 'bold']
                        }]

                }

            ]
        }, {
            alignment: "center",
            text: 'ORDER PEMBELIAN',
            style: ['size09', 'bold']
        },
        '\n'
    ];

    var attention = [{
        columns: [{
            width: '15%',
            text: 'Kepada Yth:',
            style: ['size08']
        }, {
                width: '*',
                text: `${supplier}\n Attn. ${supplierAtt}\n Telp. ${supplierTel}`,
                style: ['size08']
            }, {
                width: '35%',
                stack: [
                    `Sukoharjo, ${moment(pox.date).add(offset,'h').add(offset,'h').format(locale.date.format)} `, {
                        text: [
                            'Mohon', {
                                text: ' di-fax kembali',
                                style: 'bold'
                            }, ' setelah\n', {
                                text: 'ditandatangani',
                                style: ['bold'],
                                decoration: 'underline'
                            }, ' dan ', {
                                text: 'distempel ',
                                style: ['bold'],
                                decoration: 'underline'
                            }, 'perusahaan.Terima Kasih.'
                        ],
                        style: ['size07']
                    }
                ],
                style: ['size08']
            }]
    }];

    var opening = {
        text: [
            '\n', {
                text: 'Dengan hormat,\n'
            }, {
                text: 'Yang bertanda tangan di bawah ini, '
            }, {
                text: 'PT. DAN LIRIS, SOLO',
                style: ['bold']
            }, {
                text: ' (selanjutnya disebut sebagai pihak Pembeli) dan '
            }, {
                text: supplier,
                style: ['bold']
            }, {
                text: ' (selanjutnya disebut sebagai pihak Penjual) saling menyetujui untuk mengadakan kontrak jual beli dengan ketentuan sebagai berikut: '
            },
            '\n\n'
        ],
        style: ['size09', 'justify']
    };

    var thead = [{
        text: 'NAMA DAN JENIS BARANG',
        style: ['size08', 'bold', 'center']
    }, {
            text: 'JUMLAH',
            style: ['size08', 'bold', 'center']
        }, {
            text: 'HARGA SATUAN',
            style: ['size08', 'bold', 'center']
        }, {
            text: 'SUB TOTAL',
            style: ['size08', 'bold', 'center']
        }];

    var tbody = items.map(function (item) {
        return [{
            stack: [{
                text: item.product,
                style: 'bold'
            }, item.remark, item.prNo],
            style: ['size08']
        }, {
                text: parseFloat(item.quantity).toLocaleString(locale, locale.decimal) + ' ' + item.uom,
                style: ['size08', 'center']
            }, {
                columns: [{
                    width: '30%',
                    text: `${currency}`
                }, {
                        width: '*',
                        text: `${parseFloat(item.price).toLocaleString(locale, locale.currency)}`,
                        style: ['right']
                    }],
                style: ['size08']
            }, {
                columns: [{
                    width: '20%',
                    text: `${currency}`
                }, {
                        width: '*',
                        text: `${parseFloat(item.quantity * item.price).toLocaleString(locale, locale.currency)}`,
                        style: ['right']
                    }],
                style: ['size08']
            }];
    });

    tbody = tbody.length > 0 ? tbody : [
        [{
            text: "tidak ada barang",
            style: ['size08', 'center'],
            colSpan: 4
        }, "", "", ""]
    ];
    var initialValue = {
        price: 0,
        quntity: 0
    };

    var sum = (items.length > 0 ? items : [initialValue])
        .map(item => item.price * item.quantity)
        .reduce(function (prev, curr, index, arr) {
            return prev + curr;
        }, 0);

    var vat = pox.useIncomeTax ? sum * 0.1 : 0;

    var tfoot = [
        [{
            text: 'Jumlah',
            style: ['size08', 'bold', 'right'],
            colSpan: 3
        }, "", "", {
                columns: [{
                    width: '20%',
                    text: currency
                }, {
                        width: '*',
                        text: parseFloat(sum).toLocaleString(locale, locale.currency),
                        style: ['right']
                    }],
                style: ['size08']
            }],
        [{
            text: 'PPN 10%',
            style: ['size08', 'bold', 'right'],
            colSpan: 3
        }, null, null, {
                columns: [{
                    width: '20%',
                    text: currency
                }, {
                        width: '*',
                        text: parseFloat(vat).toLocaleString(locale, locale.currency),
                        style: ['right']
                    }],
                style: ['size08']
            }],
        [{
            text: 'Grand Total',
            style: ['size08', 'bold', 'right'],
            colSpan: 3
        }, null, null, {
                columns: [{
                    width: '20%',
                    text: currency
                }, {
                        width: '*',
                        text: parseFloat(sum + vat).toLocaleString(locale, locale.currency),
                        style: ['bold', 'right']
                    }],
                style: ['size09']
            }]
    ];

    var table = [{
        table: {
            widths: ['*', '15%', '20%', '25%'],
            headerRows: 1,
            body: [].concat([thead], tbody, tfoot)
        }
    }];
    var footer = [
        '\n', {
            stack: [{
                columns: [{
                    width: '40%',
                    columns: [{
                        width: '40%',
                        stack: ['Ongkos Kirim', 'Pembayaran']
                    }, {
                            width: '3%',
                            stack: [':', ':']
                        }, {
                            width: '*',
                            stack: [`Ditanggung ${pox.freightCostBy}`, `${pox.paymentMethod}, ${pox.paymentDueDays} hari setelah terima barang`]
                        }]
                }, {
                        width: '20%',
                        text: ''
                    }, {
                        width: '40%',
                        columns: [{
                            width: '45%',
                            stack: ['Delivery', 'Lain-lain']
                        }, {
                                width: '3%',
                                stack: [':', ':']
                            }, {
                                width: '*',
                                stack: [{
                                    text: `${moment(pox.expectedDeliveryDate).add(offset,'h').format(locale.date.format)}`,
                                    style: ['bold']
                                }, `${pox.remark}`]
                            }]
                    }]
            },
                '\n\n\n', {
                    columns: [{
                        width: '35%',
                        stack: ['Pembeli\n\n\n\n\n', {
                            text: pox._createdBy,
                            style: ['bold']
                        }],
                        style: 'center'
                    }, {
                            width: '30%',
                            text: ''
                        }, {
                            width: '35%',
                            stack: ['Penjual\n\n\n\n\n', {
                                text: supplier,
                                style: ['bold']
                            }],
                            style: 'center'
                        }]
                }
            ],
            style: ['size08']
        }
    ];

    var dd = {
        pageSize: 'A5',
        pageOrientation: 'portrait',
        pageMargins: 20,
        content: [].concat(header, attention, opening, table, footer),
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