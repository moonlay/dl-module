var global = require('../../global');

module.exports = function (pox, offset) {
    if (!pox.qualityStandard) {
        pox.qualityStandard = {
            shrinkage: '-',
            wetRubbing: '-',
            dryRubbing: '-',
            washing: '-',
            darkPerspiration: '-',
            lightMedPerspiration: '-',
            pieceLength: '-',
            qualityStandardType: '-'
        }
    }
    var items = pox.items.map(poItem => {
        return {
            productName: poItem.product.name,
            productCode: poItem.product.code,
            productProperties: poItem.product.properties,
            productDesc: poItem.product.description,
            prNo: poItem.prNo,
            prRefNo: poItem.prRefNo,
            artikel: poItem.artikel,
            roNo: poItem.roNo,
            quantity: poItem.dealQuantity,
            uom: poItem.dealUom.unit,
            price: poItem.pricePerDealUnit,
            remark: poItem.remark,
            isOverBudget: poItem.isOverBudget,
            colors: poItem.colors || [],
            shipmentDate: poItem.shipmentDate
        };
    });

    items = [].concat.apply([], items);

    var iso = pox.category === "FABRIC" ? "FM-00-PJ-02-004" : "FM-PB-00-06-009/R1";
    var number = pox.no;
    var currency = pox.currency.code;
    var supplier = pox.supplier.name;
    var supplierAtt = pox.supplier.PIC;
    var supplierTel = pox.supplier.contact;

    var locale = global.config.locale;

    var moment = require('moment');
    moment.locale(locale.name);

    var header = [
        {
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
                    text: `Nomor PO : ${number}${pox.isOverBudget ? '-OB' : ''}`,
                    alignment: "right",
                    style: ['size11', 'bold']
                }]

            }

            ]
        }, {
            alignment: "center",
            text: "ORDER PEMBELIAN",
            style: ['size09', 'bold']
        },
        '\n'
    ];

    var attentionTextSupplier = `${supplier}\n Attn. ${supplierAtt}\n Telp. ${supplierTel}`;

    var attention = [{
        columns: [{
            width: '15%',
            text: 'Kepada Yth:',
            style: ['size08']
        }, {
            width: '*',
            text: attentionTextSupplier,
            style: ['size08']
        }, {
            width: '35%',
            text: `Sukoharjo, ${moment(pox.date).add(offset, 'h').add(offset, 'h').format(locale.date.format)} `,
            style: ['size08']
        }]
    }];

    var openingText = [
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
    ];

    var opening = {
        text: openingText,
        style: ['size09', 'justify']
    };

    var theadOpt = [{
        text: 'NO',
        style: ['size08', 'bold', 'center']
    },{
        text: 'NAMA DAN JENIS BARANG',
        style: ['size08', 'bold', 'center']
    }, {
        text: 'ARTIKEL',
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

    var thead = theadOpt;
    var tbody = [];
    if (pox.category === "FABRIC") {
        tbody = items.map(function (item, index) {
            return [{
                text: (index + 1),
                style: ['size08', 'center']
            },{
                stack: [item.productCode, item.productName, `COMPOSITION: ${item.productDesc}`, `KONSTRUKSI: ${item.productProperties[0]}`, `YARN: ${item.productProperties[1]}`, `LEBAR: ${item.productProperties[2]}`, "QUALITY : EXPORT QUALITY", `DESIGN/COLOUR : ${item.colors.join(', ')}`, `Keterangan : ${item.remark}`, {
                    text: `${item.prNo} - ${item.prRefNo}${item.isOverBudget ? "-OB" : ""}`,
                    style: 'bold'
                }],
                style: ['size08']
            }, {
                text: `${item.artikel} - ${item.roNo} - ${moment(item.shipmentDate).add(offset, 'h').add(offset, 'h').format(locale.date.format)}`,
                style: ['size08', 'left']
            }, {
                text: parseFloat(item.quantity).toLocaleString(locale, locale.decimal) + ' ' + item.uom,
                style: ['size08', 'center']
            }, {
                columns: [{
                    width: '25%',
                    text: `${currency}`
                }, {
                    width: '*',
                    text: `${parseFloat(item.price).toLocaleString(locale, locale.currencyNotaItern2)}`,
                    style: ['right']
                }],
                style: ['size08']
            }, {
                columns: [{
                    width: '25%',
                    text: `${currency}`
                }, {
                    width: '*',
                    text: `${parseFloat(item.quantity * item.price).toLocaleString(locale, locale.currency)}`,
                    style: ['right']
                }],
                style: ['size08']
            }];
        });
    } else {
        tbody = items.map(function (item, index) {
            return [{
                text: (index + 1),
                style: ['size08', 'center']
            },{
                stack: [`${item.productCode} - ${item.productName}`, item.productDesc, item.remark, {
                    text: `${item.prNo} - ${item.prRefNo}${item.isOverBudget ? "-OB" : ""}`,
                    style: 'bold'
                }],
                style: ['size08']
            }, {
                text: `${item.artikel} - ${item.roNo} - ${moment(item.shipmentDate).add(offset, 'h').add(offset, 'h').format(locale.date.format)}`,
                style: ['size08', 'left']
            }, {
                text: parseFloat(item.quantity).toLocaleString(locale, locale.decimal) + ' ' + item.uom,
                style: ['size08', 'center']
            }, {
                columns: [{
                    width: '25%',
                    text: `${currency}`
                }, {
                    width: '*',
                    text: `${parseFloat(item.price).toLocaleString(locale, locale.currencyNotaItern2)}`,
                    style: ['right']
                }],
                style: ['size08']
            }, {
                columns: [{
                    width: '25%',
                    text: `${currency}`
                }, {
                    width: '*',
                    text: `${parseFloat(item.quantity * item.price).toLocaleString(locale, locale.currency)}`,
                    style: ['right']
                }],
                style: ['size08']
            }];
        });
    }



    tbody = tbody.length > 0 ? tbody : [
        [{
            text: "tidak ada barang",
            style: ['size08', 'center'],
            colSpan: 5
        }, "", "", "", ""]
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

    var totalQuantity = (items.length > 0 ? items : [initialValue])
        .map(item => item.quantity)
        .reduce(function (prev, curr, index, arr) {
            return prev + curr;
        }, 0);

    var incomeTaxValue = pox.useIncomeTax ? sum * 0.1 : 0;
    var vatValue = pox.useVat ? sum * pox.vat.rate / 100 : 0;
    var vatName = pox.vat ? `${pox.vat.name} ${pox.vat.rate}` : 0;

    var tfootTextLocalUseVat = [
        [null,{
            text: 'Total Jumlah',
            style: ['size08', 'bold', 'right'],
        }, null, {
            text: parseFloat(totalQuantity).toLocaleString(locale, locale.decimal),
            style: ['size08', 'right']
        }, {
            text: 'Jumlah',
            style: ['size08', 'bold', 'right'],
        }, {
            columns: [{
                width: '25%',
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
            colSpan: 4
        }, null, null, null, null, {
            columns: [{
                width: '25%',
                text: currency
            }, {
                width: '*',
                text: parseFloat(incomeTaxValue).toLocaleString(locale, locale.currency),
                style: ['right']
            }],
            style: ['size08']
        }],
        [{
            text: `PPH ${vatName}`,
            style: ['size08', 'bold', 'right'],
            colSpan: 4
        }, null, null, null, null, {
            columns: [{
                width: '25%',
                text: currency
            }, {
                width: '*',
                text: parseFloat(vatValue).toLocaleString(locale, locale.currency),
                style: ['right']
            }],
            style: ['size08']
        }],
        [{
            text: 'Grand Total',
            style: ['size08', 'bold', 'right'],
            colSpan: 4
        }, null, null, null, null, {
            columns: [{
                width: '25%',
                text: currency
            }, {
                width: '*',
                text: parseFloat(sum + incomeTaxValue - vatValue).toLocaleString(locale, locale.currency),
                style: ['bold', 'right']
            }],
            style: ['size09']
        }]
    ];

    var tfootTextLocalNoVat = [
        [null,{
            text: 'Total Jumlah',
            style: ['size08', 'bold', 'right'],
        }, null, {
            text: parseFloat(totalQuantity).toLocaleString(locale, locale.decimal),
            style: ['size08', 'right']
        }, {
            text: 'Jumlah',
            style: ['size08', 'bold', 'right'],
        }, {
            columns: [{
                width: '25%',
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
            colSpan: 4
        }, null, null, null, null, {
            columns: [{
                width: '25%',
                text: currency
            }, {
                width: '*',
                text: parseFloat(incomeTaxValue).toLocaleString(locale, locale.currency),
                style: ['right']
            }],
            style: ['size08']
        }],
        [{
            text: 'Grand Total',
            style: ['size08', 'bold', 'right'],
            colSpan: 4
        }, null, null, null, null, {
            columns: [{
                width: '25%',
                text: currency
            }, {
                width: '*',
                text: parseFloat(sum + incomeTaxValue).toLocaleString(locale, locale.currency),
                style: ['bold', 'right']
            }],
            style: ['size09']
        }]
    ];

    var tfootTextLocal = pox.useVat ? tfootTextLocalUseVat : tfootTextLocalNoVat;
    var tfoot = tfootTextLocal;

    var table = [{
        table: {
            widths: ['5%','25%', '22%', '11%', '15%', '20%'],
            headerRows: 1,
            body: [].concat([thead], tbody, tfoot)
        }
    }];

    var footerText = [
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
                        stack: [`Ditanggung ${pox.freightCostBy}`, `${pox.paymentType}, ${pox.paymentDueDays} hari setelah terima barang`]
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
                            text: `${moment(pox.expectedDeliveryDate).add(offset, 'h').format(locale.date.format)}`,
                            style: ['bold']
                        }, `${pox.remark}`]
                    }]
                }]
            }],
            style: ['size08']
        }
    ];

    var footer = footerText;

    var stdQ = [
        '\n',
        {
            stack: [
                {
                    columns: [
                        {
                            width: '18%',
                            text: 'Standar Kualitas'
                        },
                        {
                            width: '2%',
                            text: ':'
                        },
                        {
                            width: '80%',
                            text: pox.qualityStandard.qualityStandardType
                        }
                    ]
                },
                {
                    columns: [
                        {
                            width: '18%',
                            text: ' '
                        },
                        {
                            width: '2%',
                            text: ' '
                        },
                        {
                            width: '80%',
                            stack: [
                                {
                                    columns: [
                                        {
                                            width: '20%',
                                            text: 'Shrinkage test'
                                        }, {
                                            width: '2%',
                                            text: ':'
                                        }, {
                                            width: '*',
                                            text: pox.qualityStandard.shrinkage
                                        }
                                    ]
                                },
                                {
                                    columns: [
                                        {
                                            width: '20%',
                                            text: 'Rubbing test'
                                        }, {
                                            width: '2%',
                                            text: ':'
                                        }, {
                                            width: '*',
                                            columns: [
                                                {
                                                    width: '20%',
                                                    text: 'Wet Rubbing'
                                                }, {
                                                    width: '2%',
                                                    text: ':'
                                                }, {
                                                    width: '*',
                                                    text: pox.qualityStandard.wetRubbing
                                                }
                                            ]
                                        }
                                    ]
                                },
                                {
                                    columns: [
                                        {
                                            width: '20%',
                                            text: ' '
                                        }, {
                                            width: '2%',
                                            text: ' '
                                        }, {
                                            width: '*',
                                            columns: [
                                                {
                                                    width: '20%',
                                                    text: 'Dry Rubbing'
                                                }, {
                                                    width: '2%',
                                                    text: ':'
                                                }, {
                                                    width: '*',
                                                    text: pox.qualityStandard.dryRubbing
                                                }
                                            ]
                                        }
                                    ]
                                },
                                {
                                    columns: [
                                        {
                                            width: '20%',
                                            text: 'Washing test'
                                        }, {
                                            width: '2%',
                                            text: ':'
                                        }, {
                                            width: '*',
                                            text: pox.qualityStandard.washing
                                        }
                                    ]
                                },
                                {
                                    columns: [
                                        {
                                            width: '20%',
                                            text: 'Perspiration test'
                                        }, {
                                            width: '2%',
                                            text: ':'
                                        }, {
                                            width: '*',
                                            columns: [
                                                {
                                                    width: '20%',
                                                    text: 'Dark'
                                                }, {
                                                    width: '2%',
                                                    text: ':'
                                                }, {
                                                    width: '*',
                                                    text: pox.qualityStandard.darkPerspiration
                                                }
                                            ]
                                        }
                                    ]
                                },
                                {
                                    columns: [
                                        {
                                            width: '20%',
                                            text: ' '
                                        }, {
                                            width: '2%',
                                            text: ' '
                                        }, {
                                            width: '*',
                                            columns: [
                                                {
                                                    width: '20%',
                                                    text: 'Light/Med'
                                                }, {
                                                    width: '2%',
                                                    text: ':'
                                                }, {
                                                    width: '*',
                                                    text: pox.qualityStandard.lightMedPerspiration
                                                }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                },
                {
                    columns: [
                        {
                            width: '18%',
                            text: 'Piece Length'
                        },
                        {
                            width: '2%',
                            text: ':'
                        },
                        {
                            width: '80%',
                            text: pox.qualityStandard.pieceLength
                        }
                    ]
                }
            ], style: ['size08']
        }
    ];

    if (pox.category === "FABRIC") {
        footer = footer.concat(stdQ)
    }
    var signatureText = [
        '\n\n\n',
        {
            stack: [
                {
                    columns: [
                        {
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

    var signature = signatureText;

    var dd = {
        pageSize: 'A4',
        pageOrientation: 'portrait',
        pageMargins: 20,
        content: [].concat(header, attention, opening, table, footer, signature),
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