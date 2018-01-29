var global = require('../../global');
var generateCode = require('../../utils/code-generator');
var say = require('../../utils/say');
var numSpell = require('../../utils/number-spelling');

module.exports = function (salesContract) {

    var locale = global.config.locale;
    var moment = require('moment');
    moment.locale(locale.name);

    var no = salesContract.salesContractNo;
    var header = [];
    var subheader = [];
    var body = [];
    var sign = [];
    var remark = [];
    var footer = [];
    var detailprice = "";

    var uom = "";
    var convertion = 0;
    if (salesContract.uom.unit.toLowerCase() == "ball") {
        uom = "BALES";
        convertion = parseFloat(salesContract.orderQuantity) * parseFloat(181.44);
    }
    else {
        uom = salesContract.uom.unit;
        convertion = salesContract.orderQuantity;
    }

    var appx = "";
    var appxLocal = "";
    var date = parseInt(salesContract.deliverySchedule.getDate());
    if (date >= 1 && date <= 10) {
        appx = "EARLY";
        appxLocal = "AWAL";
    }
    else if (date >= 11 && date <= 20) {
        appx = "MIDDLE";
        appxLocal = "PERTENGAHAN";
    }
    else if (date >= 21 && date <= 31) {
        appx = "END";
        appxLocal = "AKHIR";
    }

    var ppn = salesContract.incomeTax;
    if (ppn == "Include PPn") {
        ppn = "Include PPn 10%";
    }

    var price = `${parseFloat(salesContract.price).toLocaleString(locale, locale.currency)}`;

    var amount = salesContract.price * convertion;
    var amountbyCurrency = `${parseFloat(amount).toLocaleString(locale, locale.currency)}`;
    var amountDec1 = parseFloat(amount.toFixed(3));
    var amountDec = amountDec1.toString().split('.');
    var spellAmount = amount;

    // if(salesContract.accountBank.currency.code.toLowerCase()=="usd"){
    //     amountbyCurrency=`${parseFloat(amount).toLocaleString(locale, locale.currencySalesContract)}`;
    //     price=`${parseFloat(salesContract.price).toLocaleString(locale, locale.currencySalesContract)}`;
    //     if(!amountDec[1]){
    //         spellAmount=amount;
    //     }
    //     else if(amountDec[1].length===1){
    //         spellAmount=amount.toFixed(1);
    //     }
    //     else if(amountDec[1].length===2){
    //         spellAmount=amount.toFixed(2);
    //     }
    // else if(amountDec[1].length>=3 ){
    //     spellAmount=amount.toFixed(3);
    // }
    // }
    // else if(amount % 1 !=0){
    amountDec1 = parseFloat(amount.toFixed(2));
    amountDec = amountDec1.toString().split('.');
    if (!amountDec[1]) {
        spellAmount = amount;
    }
    else if (amountDec[1].length === 1) {
        spellAmount = amount.toFixed(1);
    }
    else if (amountDec[1].length >= 2) {
        spellAmount = amount.toFixed(2);
    }
    // }

    var detail = salesContract.accountBank.currency.symbol + " " + price + ' / KG' + "\n";
    detailprice = salesContract.accountBank.currency.symbol + " " + price + ' / ' + salesContract.uom.unit + ' ' + ppn;


    var comoDesc = "";
    if (salesContract.comodityDescription != "") {
        comoDesc = '\n' + salesContract.comodityDescription;
    }
    var code = salesContract.salesContractNo;

    var quantity = salesContract.orderQuantity;
    var qtyDec = parseFloat(salesContract.orderQuantity.toFixed(2));
    var quantityDec = qtyDec.toString().split('.');
    var spellQuantity = quantity;
    if (salesContract.orderQuantity % 1 != 0) {
        quantity = parseFloat(salesContract.orderQuantity.toFixed(2));
        if (!quantityDec[1]) {
            spellQuantity = parseFloat(salesContract.orderQuantity);
        }
        else if (quantityDec[1].length === 1) {
            spellQuantity = parseFloat(salesContract.orderQuantity.toFixed(1));
        }
        else if (quantityDec[1].length >= 2) {
            spellQuantity = parseFloat(salesContract.orderQuantity.toFixed(2));
        }
    }

    var sayQty = say(spellQuantity, ")");
    var lastIndex = sayQty.lastIndexOf(" ");
    var lastword = sayQty.substr(0, lastIndex);
    var lastIndex1 = lastword.lastIndexOf(" ");
    var words = lastword.substr(lastIndex1, lastword.length);
    var Qtystr = say(spellQuantity, ")");
    if (words === " nol") {
        Qtystr = lastword.substr(0, lastIndex1) + " )";
    }

    var shipmentDesc = salesContract.shipmentDescription ? '\n' + salesContract.shipmentDescription : '';

    if (salesContract.buyer.type.toLowerCase() == "export" || salesContract.buyer.type.toLowerCase() == "ekspor") {
        moment.locale('en-EN');

        header = [{
            columns: [{
                width: '*',
                stack: [{
                    text: "FM-PJ-00-03-004",
                    style: ['size09'],
                    alignment: "right"
                }, {
                    text: 'Date, ' + `${moment(salesContract._createdDate).format('MMMM DD,YYYY')}`,
                    style: ['size09'],
                    alignment: "right"
                }, {
                    columns: [{
                        width: '40%',
                        stack: [{
                            text: 'MESSRS,\n' + salesContract.buyer.name + '\n' + salesContract.buyer.address + '\n' + salesContract.buyer.country.toUpperCase() + '\n' + salesContract.buyer.contact,
                            style: ['size10'],
                            alignment: "left"
                        }]
                    }]
                }, '\n', {
                    text: 'SALES CONTRACT',
                    style: ['size11', 'bold'],
                    alignment: "center"
                }]
            }]
        }, '\n'];

        subheader = [{
            columns: [{
                width: '*',
                stack: [{
                    text: 'On behalf of :',
                    style: ['size09'],
                    alignment: "left"
                }, {
                    text: 'P.T. DAN LIRIS KELURAHAN BANARAN, KECAMATAN GROGOL SUKOHARJO - INDONESIA, we confirm the order under the following terms and conditions as mentioned below :',
                    style: ['size09'],
                    alignment: "left"
                }]
            }]
        }, '\n'];

        body = [
            {

                columns: [
                    {
                        width: '25%',
                        text: 'Contract Number',
                        style: ['size09']
                    }, {
                        width: '3%',
                        text: ':',
                        style: ['size09']
                    },
                    {
                        width: '*',
                        text: salesContract.salesContractNo,
                        style: ['size09']
                    }]
            },
            {

                columns: [
                    {
                        width: '25%',
                        text: 'Comodity',
                        style: ['size09']
                    }, {
                        width: '3%',
                        text: ':',
                        style: ['size09']
                    },
                    {
                        width: '*',
                        text: salesContract.comodity.name + comoDesc,
                        style: ['size09']
                    }]
            }, {
                columns: [
                    {
                        width: '25%',
                        text: 'Quality',
                        style: ['size09']
                    }, {
                        width: '3%',
                        text: ':',
                        style: ['size09']
                    },
                    {
                        width: '*',
                        text: salesContract.quality.name,
                        style: ['size09']
                    }]
            }, {
                columns: [
                    {
                        width: '25%',
                        text: 'Quantity',
                        style: ['size09']
                    }, {
                        width: '3%',
                        text: ':',
                        style: ['size09']
                    },
                    {
                        width: '*',
                        text: "ABOUT : " + parseFloat(salesContract.orderQuantity).toLocaleString(locale, locale.decimal) + " " + uom + " ( ABOUT : " + parseFloat(convertion).toLocaleString(locale, locale.decimal) + " KG )",
                        style: ['size09']
                    }]
            }, {
                columns: [
                    {
                        width: '25%',
                        text: 'Price & Payment',
                        style: ['size09']
                    }, {
                        width: '3%',
                        text: ':',
                        style: ['size09']
                    },
                    {
                        width: '*',
                        text: detail + salesContract.termOfShipment + '\n' + salesContract.termOfPayment.termOfPayment,
                        style: ['size09']
                    }]
            }, {
                columns: [
                    {
                        width: '25%',
                        text: 'Amount',
                        style: ['size09']
                    }, {
                        width: '3%',
                        text: ':',
                        style: ['size09']
                    },
                    {
                        width: '*',
                        text: salesContract.accountBank.currency.symbol + " " + amountbyCurrency + " ( " + `${numSpell(spellAmount)}` + " " + salesContract.accountBank.currency.description + " ) (APPROXIMATELLY)",
                        style: ['size09']
                    }]
            }, {
                columns: [
                    {
                        width: '25%',
                        text: 'Shipment',
                        style: ['size09']
                    }, {
                        width: '3%',
                        text: ':',
                        style: ['size09']
                    },
                    {
                        width: '*',
                        text: appx + " " + `${moment(salesContract.deliverySchedule).format('MMMM YYYY').toUpperCase()}` + shipmentDesc,
                        style: ['size09']
                    }]
            }, {
                columns: [
                    {
                        width: '25%',
                        text: 'Destination',
                        style: ['size09']
                    }, {
                        width: '3%',
                        text: ':',
                        style: ['size09']
                    },
                    {
                        width: '*',
                        text: salesContract.deliveredTo,
                        style: ['size09']
                    }]
            }, {
                columns: [
                    {
                        width: '25%',
                        text: 'Packing',
                        style: ['size09']
                    }, {
                        width: '3%',
                        text: ':',
                        style: ['size09']
                    },
                    {
                        width: '*',
                        text: salesContract.packing,
                        style: ['size09']
                    }]
            }, {
                columns: [
                    {
                        width: '25%',
                        text: 'Condition',
                        style: ['size09']
                    }, {
                        width: '3%',
                        text: ':',
                        style: ['size09']
                    },
                    {
                        width: '*',
                        text: '- THIS CONTRACT IS IRREVOCABLE UNLESS AGREED UPON BY THE TWO PARTIES, THE BUYER AND SELLER. \n - +/- ' + salesContract.shippingQuantityTolerance + '% FROM QUANTITY ORDER SHOULD BE ACCEPTABLE. \n - CARTON BOX (NET WEIGHT : 1.89 / CONE, 1 BOX: 18 CONE). \n' + salesContract.condition,
                        style: ['size09']
                    }]
            }];

        sign = ['\n', {
            columns: [{
                width: '50%',
                stack: ['Accepted and confirmed : ', '\n\n\n\n', '(                                  )', 'Authorized signature'],
                style: ['center']
            }, {
                width: '50%',
                stack: ['PT DANLIRIS', '\n\n\n\n', '(    SRI HENDRATNO   )', 'Marketing Textile'],
                style: ['center']
            }],
            style: ['size09']
        }];
        remark = [{
            columns: [{
                width: '*',
                stack: [{
                    text: 'REMARK :',
                    style: ['size09'],
                    alignment: "left"
                },
                {
                    ul: [
                        {
                            text: 'All instructions regarding sticker, shipping marks etc. to be received 1 (one) month prior to shipment.',
                            style: ['size10'],
                            alignment: "justify"
                        }, {
                            text: 'Beneficiary : P.T. DAN LIRIS KELURAHAN BANARAN, KECAMATAN GROGOL SUKOHARJO - INDONESIA (Phone No. 0271-740888 / 714400). \n' + 'Payment Transferred to: \n' + 'PAYMENT TO BE TRANSFERRED TO BANK ' + salesContract.accountBank.bankName + '\n' + salesContract.accountBank.bankAddress + '\n' + 'ACCOUNT NAME : ' + salesContract.accountBank.accountName + '\n' + 'ACCOUNT NO : ' + salesContract.accountBank.accountNumber + ' SWIFT CODE : ' + salesContract.accountBank.swiftCode,
                            style: ['size10'],
                            alignment: "justify"
                        }, {
                            text: salesContract.termOfPayment.termOfPayment + ' to be negotiable with BANK ' + salesContract.accountBank.bankName,
                            style: ['size10'],
                            alignment: "justify"
                        }, {
                            text: 'Please find enclosed some Indonesia Banking Regulations.',
                            style: ['size10'],
                            alignment: "justify"
                        }, {
                            text: 'If you find anything not order, please let us know immediately.',
                            style: ['size10'],
                            alignment: "justify"
                        }]
                }]
            }]

        }];

        //AGENT COMMISSION AGREEMENT
        if (salesContract.agent.name) {
            var header2 = [{
                width: '*',
                stack: [{
                    text: 'Date, ' + `${moment(salesContract._createdDate).format('MMMM DD,YYYY')}`,
                    style: ['size09'],
                    alignment: "right"
                }, {
                    text: 'MESSRS,\n' + salesContract.agent.name + '\n' + salesContract.agent.address + '\n' + salesContract.agent.country.toUpperCase() + '\n' + salesContract.agent.contact,
                    style: ['size09'],
                    alignment: "left"
                }, '\n', {
                    text: 'COMMISSION AGREEMENT NO: ' + salesContract.dispositionNumber + '\n' + 'FOR SALES CONTRACT NO: ' + no,
                    style: ['size11', 'bold'],
                    alignment: "center"
                }]
            }, '\n'];

            var subheader2 = [{
                stack: ['\n', {
                    text: 'This is to confirm that your order for ' + salesContract.buyer.name + ' concerning ' + parseFloat(salesContract.orderQuantity).toLocaleString(locale, locale.decimal) + " ( " + `${numSpell(spellQuantity)}` + ")" + ' ' + uom + ' ( ABOUT: ' + parseFloat(convertion).toLocaleString(locale, locale.decimal) + ' KG ) of' + '\n' + salesContract.comodity.name + comoDesc,
                    style: ['size09'],
                    alignment: "justify"
                }, '\n', {
                        text: 'Placed with us, P.T. DAN LIRIS - SOLO INDONESIA, is inclusive of ' + salesContract.comission + ' sales commission' + '\n' + 'each KG' + ' on ' + salesContract.termOfShipment + ' value, payable to you upon final negotiation and clearance of ' + salesContract.termOfPayment.termOfPayment + '.',
                        style: ['size09'],
                        alignment: "justify"
                    }, '\n', '\n', {
                        text: 'Kindly acknowledge receipt by undersigning this Commission Agreement letter and returned one copy to us after having been confirmed and signed by you.',
                        style: ['size09'],
                        alignment: "justify"

                    }]
            }, '\n', '\n'];

            var sign2 = ['\n', {
                columns: [{
                    width: '50%',
                    stack: ['Accepted and confirmed : ', '\n\n\n\n', '(                                  )', 'Authorized signature'],
                    style: ['center']
                }, {
                    width: '50%',
                    stack: ['PT DANLIRIS', '\n\n\n\n', '(    SRI HENDRATNO   )', 'Marketing Textile'],
                    style: ['center']
                }],
                style: ['size09']
            }];

            footer = [{
                pageBreak: 'before',
                columns: [{
                    width: '*',
                    stack: [header2, subheader2, sign2]
                }]
            }]
        }
    }
    else {
        header = [{
            columns: [{
                width: '*',
                stack: [{
                    text: "FM-PJ-00-03-003",
                    style: ['size09', 'bold'],
                    alignment: "right"
                }, {
                    text: 'SALES CONTRACT ',
                    style: ['size11', 'bold'],
                    alignment: "center"
                }]
            }]
        }, '\n'];
        var left = [
            {

                columns: [
                    {
                        width: '10%',
                        text: 'No.',
                        style: ['size09']
                    }, {
                        width: '3%',
                        text: ':',
                        style: ['size09']
                    },
                    {
                        width: '*',
                        text: salesContract.salesContractNo,
                        style: ['size09']
                    }]
            }, {
                columns: [
                    {
                        width: '10%',
                        text: 'Hal',
                        style: ['size09']
                    }, {
                        width: '3%',
                        text: ':',
                        style: ['size09']
                    },
                    {
                        width: '*',
                        text: 'KONFIRMASI ORDER BENANG ',
                        style: ['size09']
                    }]
            }];
        var right = [{
            columns: [{
                width: '*',
                stack: [{
                    text: 'Sukoharjo, ' + `${moment(salesContract._createdDate).format(locale.date.format)}`,
                    style: ['size09'],
                    alignment: "left"
                }, {
                    text: 'Kepada Yth. :',
                    style: ['size09'],
                    alignment: "left"
                }, {
                    text: salesContract.buyer.name + '\n' + salesContract.buyer.address + '\n' + salesContract.buyer.city,
                    style: ['size09'],
                    alignment: "left"
                }]
            }]
        }]

        subheader = [{
            columns: [{
                width: '60%',
                stack: [left]
            }, {
                width: '40%',
                stack: [right]
            }]
        }];

        body = [{
            text: 'Dengan Hormat,\n' + 'Sesuai dengan pesanan/ order Bapak/Ibu kepada kami, maka bersama ini kami kirimkan surat persetujuan pesanan dengan ketentuan dan syarat-syarat di bawah ini :',
            style: ['size09'],
            alignment: "left"
        }, '\n',
        {
            columns: [
                {
                    width: '25%',
                    text: 'Jenis',
                    style: ['size09']
                }, {
                    width: '3%',
                    text: ':',
                    style: ['size09']
                },
                {
                    width: '*',
                    text: salesContract.comodity.name + comoDesc,
                    style: ['size09']
                }]
        }, {
            columns: [
                {
                    width: '25%',
                    text: 'Jumlah',
                    style: ['size09']
                }, {
                    width: '3%',
                    text: ':',
                    style: ['size09']
                },
                {
                    width: '*',
                    text: parseFloat(salesContract.orderQuantity).toLocaleString(locale, locale.decimal) + " ( " + Qtystr + " " + salesContract.uom.unit,
                    style: ['size09']
                }]
        }, {
            columns: [
                {
                    width: '25%',
                    text: 'Kualitas',
                    style: ['size09']
                }, {
                    width: '3%',
                    text: ':',
                    style: ['size09']
                },
                {
                    width: '*',
                    text: salesContract.quality.name,
                    style: ['size09']
                }]
        }, {
            columns: [
                {
                    width: '25%',
                    text: 'Harga',
                    style: ['size09']
                }, {
                    width: '3%',
                    text: ':',
                    style: ['size09']
                },
                {
                    width: '*',
                    text: detailprice,
                    style: ['size09']
                }]
        }, {
            columns: [
                {
                    width: '25%',
                    text: 'Syarat Pembayaran',
                    style: ['size09']
                }, {
                    width: '3%',
                    text: ':',
                    style: ['size09']
                },
                {
                    width: '*',
                    text: salesContract.termOfPayment.termOfPayment,
                    style: ['size09']
                }]
        }, {
            columns: [
                {
                    width: '25%',
                    text: 'Pembayaran ke Alamat',
                    style: ['size09']
                }, {
                    width: '3%',
                    text: ':',
                    style: ['size09']
                },
                {
                    width: '*',
                    text: "BANK " + salesContract.accountBank.bankName + '\n' + salesContract.accountBank.bankAddress + '\n' + 'A/C.' + salesContract.accountBank.accountNumber + '\n' + 'A/N.' + salesContract.accountBank.accountName,
                    style: ['size09']
                }]
        }, {
            columns: [
                {
                    width: '25%',
                    text: 'Ongkos Angkut',
                    style: ['size09']
                }, {
                    width: '3%',
                    text: ':',
                    style: ['size09']
                },
                {
                    width: '*',
                    text: salesContract.transportFee,
                    style: ['size09']
                }]
        }, {
            columns: [
                {
                    width: '25%',
                    text: 'Dikirim ke',
                    style: ['size09']
                }, {
                    width: '3%',
                    text: ':',
                    style: ['size09']
                },
                {
                    width: '*',
                    text: salesContract.deliveredTo,
                    style: ['size09']
                }]
        }, {
            columns: [
                {
                    width: '25%',
                    text: 'Jadwal Pengiriman',
                    style: ['size09']
                }, {
                    width: '3%',
                    text: ':',
                    style: ['size09']
                },
                {
                    width: '*',
                    text: appxLocal + " " + `${moment(salesContract.deliverySchedule).format('MMMM YYYY').toUpperCase()}`,
                    style: ['size09']
                }]
        }, {
            columns: [
                {
                    width: '25%',
                    text: 'Kondisi',
                    style: ['size09']
                }, {
                    width: '3%',
                    text: ':',
                    style: ['size09']
                },
                {
                    width: '*',
                    text: salesContract.condition,
                    style: ['size09']
                }]
        }, {
            columns: [
                {
                    width: '25%',
                    text: 'Keterangan',
                    style: ['size09']
                }, {
                    width: '3%',
                    text: ':',
                    style: ['size09']
                },
                {
                    width: '*',
                    text: salesContract.remark,
                    style: ['size09']
                }]
        }, '\n', {

            text: 'Demikian konfirmasi order ini kami sampaikan untuk diketahui dan dipergunakan seperlunya. Tembusan surat ini mohon dikirim kembali setelah ditanda tangani dan dibubuhi cap perusahaan.',
            style: ['size09'],
            alignment: "left"
        }];



        sign = ['\n', {
            columns: [{
                width: '50%',
                stack: ['Pembeli, ', '\n\n\n\n', '(                                  )'],
                style: ['center']
            }, {
                width: '50%',
                stack: ['Hormat Kami,', '\n\n\n\n', '(    SRI HENDRATNO   )', 'Penjualan Tekstil'],
                style: ['center']
            }],
            style: ['size09']
        }];


        footer = [{
            lineHeight: 1.5,
            pageBreak: 'before',
            columns: [{
                width: '*',
                stack: [{
                    text: 'KONDISI :',
                    style: ['size12'],
                    alignment: "left"
                }, '\n', {
                    ul: [
                        'Keterlambatan pembayaran dikenakan denda 3.00 % per bulan.',
                        'Pembayaran maju mendapat potongan 00.00 % per bulan, potongan pembayaran maju tersebut dapat berubah sewaktu-waktu baik dengan atau tanpa pemberitahuan terlebih dahulu dari pihak PT. DANLIRIS.',
                        'Bila terjadi kebijaksanaan pemerintah dalam bidang moneter, untuk barang yang belum terkirim harga akan dibicarakan lagi.',
                        'Kain/Benang yang telah diproses/dipotong tidak dapat dikembalikan kecuali ada persetujuan tertulis dari kedua belah pihak sebelumnya.',
                        'Semua klaim atas cacat Kain / Benang harus diinformasikan kepada penjual secara tertulis, berikut contoh atau bukti yang menunjang (memadai), maksimum 2 minggu setelah tanggal penerimaan barang.',
                        'Klaim yang diajukan akan diselesaikan secara terpisah dan tidak dapat dihubungkan atau dikompensasikan dengan pembayaran Kain Grey / Benang.',
                        'Penjual mempunyai hak dengan pemberitahuan sebelumnya untuk membatalkan Konfirmasi ini seluruhnya atau sebagian bilamana :',
                        {
                            ol: [
                                'Pembeli tidak dapat memenuhi / menyelesaikan jadwal pengiriman/pengambilan barang yang telah ditetapkan dan disetujui kedua belah pihak.',
                                'Pembeli belum / tidak dapat menyelesaikan pembayaran yang sudah jatuh tempo dari pengambilan / order-order yang telah terkirim sebelumnya.'
                            ]
                        }
                    ],
                    style: ['size10'],
                    alignment: "left"
                }]
            }]
        }];
    }

    var Sc = {
        pageSize: 'A4',
        pageOrientation: 'portrait',
        pageMargins: [40, 120, 40, 10],
        content: [].concat(header, subheader, body, sign, remark, footer),
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
            size11: {
                fontSize: 11
            },
            size12: {
                fontSize: 12
            },
            size15: {
                fontSize: 15
            },
            size30: {
                fontSize: 30
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
            },
            tableHeader: {
                bold: true,
                fontSize: 8,
                color: 'black',
                alignment: 'center'
            }
        }
    };

    return Sc;
}
