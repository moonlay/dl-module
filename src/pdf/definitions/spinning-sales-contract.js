var global = require('../../global');
var generateCode = require('../../utils/code-generator');

module.exports = function (salesContract) {

    var locale = global.config.locale; 
    var moment = require('moment');
    moment.locale(locale.name); 
    
    var no=salesContract.salesContractNo;
    var header=[];
    var subheader=[];
    var body=[];
    var sign=[];
    var remark=[];
    var footer=[];

    var ppn="";
    if(salesContract.useIncomeTax){
        ppn='INCLUDING PPN';
    }
    else{
        ppn='EXCLUDING PPN';
    }
    var detail= salesContract.accountBank.currency.code + " " + `${parseFloat(salesContract.price).toLocaleString(locale, locale.currency)}` + ' / ' + salesContract.uom.unit +"\n";
    detailprice+= salesContract.accountBank.currency.code + " " + `${parseFloat(salesContract.price).toLocaleString(locale, locale.currency)}` + ' / ' + salesContract.uom.unit + ' ' + ppn;
    amount+=salesContract.price;
    
    var comoDesc="";
    if(salesContract.comodityDescription!=""){
        comoDesc='\n'+salesContract.comodityDescription;
    }
    var code=generateCode();

    if(salesContract.buyer.type.toLowerCase()=="export"||salesContract.buyer.type.toLowerCase()=="ekspor"){
        moment.locale();
        header = [{
                columns: [{
                    width: '*',
                    stack: [{
                        text: "FM-PJ-00-03-004",
                        style: ['size09'],
                        alignment: "right"
                    },{
                        text:'Date, '+`${moment(salesContract._createdDate).format('MMMM DD,YYYY')}`,
                        style: ['size09'],
                        alignment: "right"
                    },{
                        text:'MESSRS,\n'+ salesContract.buyer.name + '\n' + salesContract.buyer.address,
                        style: ['size09'],
                        alignment: "left"
                    }, {
                            text: 'SALES CONTRACT NO ' + no,
                            style: ['size11','bold'],
                            alignment: "center"
                        }]
                }]
        },'\n'];

        subheader=[{
            columns: [{
                    width: '*',
                    stack: [{
                        text: 'On behalf of :',
                        style: ['size09'],
                        alignment: "left"
                    },{
                        text:'P.T. DAN LIRIS KELURAHAN BANARAN, KECAMATAN GROGOL SUKOHARJO - INDONESIA, we confirm the order under the following terms and conditions as mentioned below :',
                        style: ['size09'],
                        alignment: "left"
                    }]
                }]
        },'\n'];

        body=[
            {
                
                columns: [
                    {
                        width: '25%',
                        text: 'Comodity',
                        style: ['size09']
                    }, {
                        width: '3%',
                        text:':',
                        style: ['size09']
                    },
                    {
                        width: '*',
                        text:salesContract.comodity.name + comoDesc,
                        style: ['size09']
                    }]
            },{
                columns: [
                    {
                        width: '25%',
                        text: 'Quality',
                        style: ['size09']
                    }, {
                        width: '3%',
                        text:':',
                        style: ['size09']
                    },
                    {
                        width: '*',
                        text:salesContract.quality.name,
                        style: ['size09']
                    }]
        },{
                columns: [
                    {
                        width: '25%',
                        text: 'Quantity',
                        style: ['size09']
                    }, {
                        width: '3%',
                        text:':',
                        style: ['size09']
                    },
                    {
                        width: '*',
                        text:parseFloat(salesContract.orderQuantity).toLocaleString(locale, locale.decimal) +" "+salesContract.uom.unit,
                        style: ['size09']
                    }]
        },{
                columns: [
                    {
                        width: '25%',
                        text: 'Price & Payment',
                        style: ['size09']
                    }, {
                        width: '3%',
                        text:':',
                        style: ['size09']
                    },
                    {
                        width: '*',
                        text:detail + salesContract.paymentMethod,
                        style: ['size09']
                    }]
        },{
                columns: [
                    {
                        width: '25%',
                        text: 'Amount',
                        style: ['size09']
                    }, {
                        width: '3%',
                        text:':',
                        style: ['size09']
                    },
                    {
                        width: '*',
                        text:salesContract.accountBank.currency.code + " " +`${parseFloat(amount).toLocaleString(locale, locale.currency)}`,
                        style: ['size09']
                    }]
        },{
                columns: [
                    {
                        width: '25%',
                        text: 'Shipment',
                        style: ['size09']
                    }, {
                        width: '3%',
                        text:':',
                        style: ['size09']
                    },
                    {
                        width: '*',
                        text:`${moment(salesContract._createdDate).format('MMMM YYYY')}`,
                        style: ['size09']
                    }]
        },{
                columns: [
                    {
                        width: '25%',
                        text: 'Destination',
                        style: ['size09']
                    }, {
                        width: '3%',
                        text:':',
                        style: ['size09']
                    },
                    {
                        width: '*',
                        text:salesContract.deliveredTo,
                        style: ['size09']
                    }]
        },{
                columns: [
                    {
                        width: '25%',
                        text: 'Packing',
                        style: ['size09']
                    }, {
                        width: '3%',
                        text:':',
                        style: ['size09']
                    },
                    {
                        width: '*',
                        text:salesContract.packing,
                        style: ['size09']
                    }]
        },{
                columns: [
                    {
                        width: '25%',
                        text: 'Condition',
                        style: ['size09']
                    }, {
                        width: '3%',
                        text:':',
                        style: ['size09']
                    },
                    {
                        width: '*',
                        text:salesContract.condition,
                        style: ['size09']
                    }]
        }];

        sign=['\n', '\n',{
            columns: [{
                width: '50%',
                stack: ['Accepted and confirmed : ' , '\n\n\n\n', '(                                  )', 'Authorized signature'],
                style: ['center']
            }, {
                    width: '50%',
                    stack: ['PT DANLIRIS', '\n\n\n\n', '(    RUDY KURNIAWAN   )', 'Marketing Manager'],
                    style: ['center']
                }],
            style: ['size09']
        }];
    
        remark=[{
                columns: [{
                    width: '*',
                    stack: ['\n',{
                        text: 'REMARK :' ,
                        style: ['size09'],
                        alignment: "left"
                    },{
                        text: '- Beneficiary : P.T. DAN LIRIS KELURAHAN BANARAN, KECAMATAN GROGOL SUKOHARJO - INDONESIA (Phone No. 0271-740888 / 714400). \n'+'Payment Transferred to: \n' + 'PAYMENT TO BE TRANSFERRED TO BANK '+ salesContract.accountBank.bankName + '\n' + salesContract.accountBank.bankAddress + 'ACCOUNT NAME : ' + salesContract.accountBank.accountName + '\n' + 'ACCOUNT NO : ' + salesContract.accountBank.accountNumber + ' SWIFT CODE : ' + salesContract.accountBank.swiftCode ,
                        style: ['size09'],
                        alignment: "left"
                    },{
                        text:'- TT. Payment to be negotiable with BANK '+ salesContract.accountBank.bankName,
                        style: ['size09'],
                        alignment: "left"
                    },{
                            text: salesContract.remark,
                            style: ['size09'],
                            alignment: "left"
                        }]
                }]
        }];

        if(salesContract.agentId){
            var header2 = [{
                    width: '*',
                    stack: [{
                        text:'Date, '+`${moment(salesContract._createdDate).format('MMMM DD,YYYY')}`,
                        style: ['size09'],
                        alignment: "right"
                    },{
                        text:'MESSRS,\n'+ salesContract.agent.name + '\n' + salesContract.agent.address,
                        style: ['size09'],
                        alignment: "left"
                    },'\n', {
                            text: 'COMMISSION AGREEMENT '+ code + '\n'+ 'FOR SALES CONTRACT NO ' + no,
                            style: ['size11','bold'],
                            alignment: "center"
                        }]
            },'\n'];
            
            var subheader2=[{
                        stack: ['\n',{
                            text: 'This is to confirm that your order for ' + salesContract.buyer.name + ' concerning ' + parseFloat(salesContract.orderQuantity).toLocaleString(locale, locale.decimal) + ' '+salesContract.uom.unit +' of' +'\n' +  salesContract.comodity.name + comoDesc,
                            style: ['size09'],
                            alignment: "left"
                        },'\n',{
                            text:'Placed with us, P.T. DAN LIRIS - SOLO INDONESIA, is inclusive of '+ salesContract.comission + ' sales commission' + '\n' +'each '+ salesContract.uom.unit + ' on the FOB - SEMARANG value, payable to you upon final negotiation and clearance of ' + salesContract.paymentMethod + '.',
                            style: ['size09'],
                            alignment: "left"
                        },'\n','\n',{
                            text:'Kindly acknowledge receipt by undersigning this Commission Agreement letter and returned one copy to us after having been confirmed and signed by you.' ,
                            style: ['size09'],
                            alignment: "left"
                        }]
            },'\n','\n'];

            var sign2=['\n', '\n',{
                columns: [{
                    width: '50%',
                    stack: ['Accepted and confirmed : ' , '\n\n\n\n', '(                                  )', 'Authorized signature'],
                    style: ['center']
                }, {
                        width: '50%',
                        stack: ['PT DANLIRIS', '\n\n\n\n', '(    RUDY KURNIAWAN   )', 'Marketing Manager'],
                        style: ['center']
                    }],
                style: ['size09']
            }];

            footer=[{
                pageBreak: 'before',
                columns: [{
                    width: '*',
                    stack: [header2, subheader2, sign2]
                }]
            }]
        }
    }
    else{
        header = [{
                columns: [{
                    width: '*',
                    stack: [{
                        text: "FM-PJ-00-03-003",
                        style: ['size09','bold'],
                        alignment: "right"
                    },{
                        text: 'SALES CONTRACT ',
                        style: ['size11','bold'],
                        alignment: "center"
                    }]
            }]
        }];
        var left=[
            {
                
                columns: [
                    {
                        width: '10%',
                        text: 'No.',
                        style: ['size09']
                    }, {
                        width: '3%',
                        text:':',
                        style: ['size09']
                    },
                    {
                        width: '*',
                        text:salesContract.salesContractNo,
                        style: ['size09']
                    }]
            },{
                columns: [
                    {
                        width: '10%',
                        text: 'Hal',
                        style: ['size09']
                    }, {
                        width: '3%',
                        text:':',
                        style: ['size09']
                    },
                    {
                        width: '*',
                        text:'KONFIRMASI PESANAN '+salesContract.orderType.name,
                        style: ['size09']
                    }]
        }];
        var right=[{
            columns: [{
                    width: '*',
                    stack: [{
                        text:'Sukoharjo, '+`${moment(salesContract._createdDate).format(locale.date.format)}`,
                        style: ['size09'],
                        alignment: "left"
                    },{
                        text:'Kepada Yth. :',
                        style: ['size09'],
                        alignment: "left"
                    },{
                        text:salesContract.buyer.name + '\n' + salesContract.buyer.address,
                        style: ['size09'],
                        alignment: "left"
                    }]
                }]
        }]

        subheader=[{
            columns: [{
                    width: '60%',
                    stack: [left]
                },{
                    width: '40%',
                    stack: [right]
                }]
        }];

        body=[{
                text:'Dengan Hormat,\n'+'Sesuai dengan pesanan/ order Bapak/Ibu kepada kami, maka bersama ini kami kirimkan surat persetujuan pesanan dengan ketentuan dan syarat-syarat di bawah ini :',
                style: ['size09'],
                alignment: "left"
            },
            {
                columns: [
                    {
                        width: '25%',
                        text: 'No. Order',
                        style: ['size09']
                    }, {
                        width: '3%',
                        text:':',
                        style: ['size09']
                    },
                    {
                        width: '*',
                        text:salesContract.dispositionNumber,
                        style: ['size09']
                    }]
            },{
                columns: [
                    {
                        width: '25%',
                        text: 'Jenis',
                        style: ['size09']
                    }, {
                        width: '3%',
                        text:':',
                        style: ['size09']
                    },
                    {
                        width: '*',
                        text:salesContract.comodity.name + comoDesc,
                        style: ['size09']
                    }]
            },{
                columns: [
                    {
                        width: '25%',
                        text: 'Jumlah',
                        style: ['size09']
                    }, {
                        width: '3%',
                        text:':',
                        style: ['size09']
                    },
                    {
                        width: '*',
                        text:parseFloat(salesContract.orderQuantity).toLocaleString(locale, locale.decimal) +" "+salesContract.uom.unit,
                        style: ['size09']
                    }]
        },{
                columns: [
                    {
                        width: '25%',
                        text: 'Kwalitas',
                        style: ['size09']
                    }, {
                        width: '3%',
                        text:':',
                        style: ['size09']
                    },
                    {
                        width: '*',
                        text:salesContract.quality.name,
                        style: ['size09']
                    }]
        },{
                columns: [
                    {
                        width: '25%',
                        text: 'Harga',
                        style: ['size09']
                    }, {
                        width: '3%',
                        text:':',
                        style: ['size09']
                    },
                    {
                        width: '*',
                        text:detailprice,
                        style: ['size09']
                    }]
        },{
                columns: [
                    {
                        width: '25%',
                        text: 'Syarat Pembayaran',
                        style: ['size09']
                    }, {
                        width: '3%',
                        text:':',
                        style: ['size09']
                    },
                    {
                        width: '*',
                        text:salesContract.paymentMethod,
                        style: ['size09']
                    }]
        },{
                columns: [
                    {
                        width: '25%',
                        text: 'Pembayaran ke Alamat',
                        style: ['size09']
                    }, {
                        width: '3%',
                        text:':',
                        style: ['size09']
                    },
                    {
                        width: '*',
                        text:"BANK " + salesContract.accountBank.bankName + '\n' + salesContract.accountBank.bankAddress + '\n' + 'A/C.' + salesContract.accountBank.accountNumber+'\n'+ 'A/N.' + salesContract.accountBank.accountName ,
                        style: ['size09']
                    }]
        },{
                columns: [
                    {
                        width: '25%',
                        text: 'Ongkos Angkut',
                        style: ['size09']
                    }, {
                        width: '3%',
                        text:':',
                        style: ['size09']
                    },
                    {
                        width: '*',
                        text: salesContract.transportFee ,
                        style: ['size09']
                    }]
        },{
                columns: [
                    {
                        width: '25%',
                        text: 'Dikirim ke',
                        style: ['size09']
                    }, {
                        width: '3%',
                        text:':',
                        style: ['size09']
                    },
                    {
                        width: '*',
                        text:salesContract.deliveredTo,
                        style: ['size09']
                    }]
        },{
                columns: [
                    {
                        width: '25%',
                        text: 'Jadwal Pengiriman',
                        style: ['size09']
                    }, {
                        width: '3%',
                        text:':',
                        style: ['size09']
                    },
                    {
                        width: '*',
                        text:`${moment(salesContract._createdDate).format('MMMM YYYY')}`,
                        style: ['size09']
                    }]
        },{
                columns: [
                    {
                        width: '25%',
                        text: 'Kondisi',
                        style: ['size09']
                    }, {
                        width: '3%',
                        text:':',
                        style: ['size09']
                    },
                    {
                        width: '*',
                        text:salesContract.condition,
                        style: ['size09']
                    }]
        },{
                columns: [
                    {
                        width: '25%',
                        text: 'Keterangan',
                        style: ['size09']
                    }, {
                        width: '3%',
                        text:':',
                        style: ['size09']
                    },
                    {
                        width: '*',
                        text:salesContract.remark,
                        style: ['size09']
                    }]
        },{
                text:'Demikian konfirmasi order ini kami sampaikan untuk diketahui dan dipergunakan seperlunya. tembusan surat ini mohon dikirim kembali setelah ditanda tangani dan dibubuhi cap perusahaan.',
                style: ['size09'],
                alignment: "left"
            }];

       

        sign=['\n', {
            columns: [{
                width: '50%',
                stack: ['Pembeli, ' , '\n\n\n\n', '(                                  )'],
                style: ['center']
            }, {
                    width: '50%',
                    stack: ['Hormat Kami,', '\n\n\n\n', '(    SURATMI   )', 'Kabag. Penj. F/P'],
                    style: ['center']
                }],
            style: ['size09']
        }];
    }

    var Sc = {
        pageSize: 'A4',
        pageOrientation: 'portrait',
        pageMargins: [40, 130, 40, 40],
        content: [].concat(header, subheader, body, sign,remark, footer),
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