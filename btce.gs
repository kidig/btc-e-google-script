var BTC_CODES = {
  'btc_rur': 'BTC/RUR',
  'ltc_rur': 'LTC/RUR',
  'ftc_btc': 'FTC/BTC',
}


function get_settings() {
  var doc = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = doc.getSheetByName('SETTINGS');

  if (sheet == null) {
    doc.toast("Cannot find 'SETTINGS' sheet. You need to create it before using this scripts!")
    return null;
  }
  
  var settings = {};
  var rows = sheet.getSheetValues(1, 1, sheet.getLastRow(), 2);
  
  for (var r in rows) {
    var row = rows[r];
    settings[row[0]] = row[1];
  }
  
  return settings;
}
  

function update_current_rates() {
  var doc = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = doc.getSheetByName('RATES');
  
  if (sheet == null) {
    sheet = doc.insertSheet('RATES');
  }
  
  var i = 1;
  for (var rate_code in BTC_CODES) {
    var range = sheet.getRange(i, 1, 1, 7);
    var data = update_rate(rate_code);
    range.setValues([
      [BTC_CODES[rate_code], new Date(data.updated*1000), data.high, data.low, data.avg, data.buy, data.sell]
    ]);
    
    i = i + 1
  }
}


function update_rate(rate_code) {
  var url = 'https://btc-e.com/api/2/' + rate_code + '/ticker';
  var res = UrlFetchApp.fetch(url)
  var raw_data = JSON.parse(res.getContentText());
  
  return raw_data.ticker;
}


function bytes2hex(in_array) {
  var out_str = '';
  
  for (var i=0; i < in_array.length; i++) {
    var byte = in_array[i];
    if (byte < 0) byte += 256;
    
    var bytestr = byte.toString(16);
    if (bytestr.length == 1) bytestr = '0' + bytestr;
    
    out_str += bytestr;
  }
  
  return out_str;
}


function update_orderlist() {
  var res = trade_api('OrderList', {'active': '1'});

  if (res.success !== 1) return null;
  
  var doc = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = doc.getSheetByName('ORDERLIST');
  
  var orderlist = res['return'];
  
  sheet.clearContents();
  
  for (var orderid in orderlist) {
    var order = orderlist[orderid];
    sheet.appendRow([orderid, order.pair, order.type, order.amount, order.rate, new Date(order.timestamp_created*1000), order.status])
  }
  
}


function update_funds() {
  var getInfo = trade_api('getInfo');
  
  if (getInfo.success !== 1) return null;
  
  var doc = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = doc.getSheetByName('FUNDS');
  
  var ret = getInfo['return'];
  var funds = ret.funds;
  
  sheet.clearContents();
  
  for (var fund in funds) {
    sheet.appendRow([fund, funds[fund]]);
  }
}


function trade_api(method, params) {
  var url = 'https://btc-e.com/tapi';
  var settings = get_settings();
  
  if (!settings) return false;
  if (typeof(params) == 'undefined') params = {};
  
  var nonce = Math.round((new Date()).getTime() / 1000).toFixed(0);
  var query = [];
  
  query.push('nonce=' + nonce);
  query.push('method=' + method);
  
  for(var p in params) {
    query.push(p + "=" + params[p]);
  }
  
  var query_string = query.join("&");
  var sign = bytes2hex(Utilities.computeHmacSignature(Utilities.MacAlgorithm.HMAC_SHA_512, query_string, settings.api_secret));
  
  var headers = {
    'Key': settings.api_key,
    'Sign': sign
  };
  
  var options = {
    'headers': headers,
    'method': 'post',
    'payload': query_string
  };
  
  var res = UrlFetchApp.fetch(url, options);
  var raw_data = JSON.parse(res.getContentText());
  
  return raw_data;
}
