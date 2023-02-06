const debug = require('debug')('<%= projectName %>-srv:function');
<% if(authentication || hana){ -%>
const xsenv = require('@sap/xsenv');
const services = xsenv.getServices({
<% if(authentication){ -%>
  uaa: { label: 'xsuaa' }
<% } -%>
<% if(hana){ -%>
<% if(authentication){ -%>
  ,
<% } -%>
  hana: { label: 'hana' }
<% } -%>
});

<% } -%>
<% if(authentication){ -%>
const util = require('util');
const xssec = require('@sap/xssec');
const createSecurityContext = util.promisify(xssec.createSecurityContext);

<% } -%>
<% if(hana){ -%>
const hana = require('@sap/hana-client');
services.hana.sslValidateCertificate = true;
services.hana.ssltruststore = services.hana.certificate;
const hanaConn = hana.createConnection();

async function execDB(sql, isPrepared=false, params) {
  try {
    await hanaConn.connect(services.hana);
  } catch (err) {
    debug('execDB connect', err.message, err.stack);
    results = err.message;
  }
  try {
    await hanaConn.exec('SET SCHEMA ' + services.hana.schema);
    if (isPrepared) {
      let hanaStmt = await hanaConn.prepare(sql);
      results = hanaStmt.exec(params);
    } else {
      results = await hanaConn.exec(sql);
    }
  } catch (err) {
    debug('execDB exec', err.message, err.stack);
    results = err.message;
  }
  try {
    await hanaConn.disconnect();
  } catch (err) {
    debug('execDB disconnect', err.message, err.stack);
    results = err.message;
  }
  return results;
}

<% } -%>
<% if(apiGraph || apiDest){ -%>
const httpClient = require('@sap-cloud-sdk/http-client');
<% } -%>
<% if(apiS4HC || apiGraph || apiDest){ -%>
const { retrieveJwt } = require('@sap-cloud-sdk/connectivity');
<% } -%>
<% if(apiS4HC){ -%>
const { desc } = require('@sap-cloud-sdk/odata-v2');
const { salesOrderService } = require('@sap/cloud-sdk-vdm-sales-order-service');
const { salesOrderApi, salesOrderItemApi } = salesOrderService();
async function getSalesOrders(req) {
  return salesOrderApi.requestBuilder()
    .getAll()
    .filter(salesOrderApi.schema.TOTAL_NET_AMOUNT.greaterThan(2000))
    .top(3)
    .orderBy(desc(salesOrderApi.schema.LAST_CHANGE_DATE_TIME))
    .select(
      salesOrderApi.schema.SALES_ORDER,
      salesOrderApi.schema.LAST_CHANGE_DATE_TIME,
      salesOrderApi.schema.INCOTERMS_LOCATION_1,
      salesOrderApi.schema.TOTAL_NET_AMOUNT,
      salesOrderApi.schema.TO_ITEM.select(salesOrderItemApi.schema.MATERIAL, salesOrderItemApi.schema.NET_AMOUNT)
    )
    .execute({
      destinationName: '<%= projectName %>-s4hc-api'
<% if(authentication){ -%>
      ,
      jwt: retrieveJwt(req)
<% } -%>
    });
}

<% } -%>
module.exports = {
  main: async function (event, context) {
<% if(subscription){ -%>
    if (typeof event.data.eventType === 'string') {
      switch(event.data.eventType) {
        case 'defaultEvent':
          debug('Event', event.data.eventType, event.data.value);
          break;
<% if(subscription){ -%>
        case 'salesBoost':
          debug('Event', event.data.eventType, event.data.id, event.data.amount);
          await execDB(`UPDATE "<%= projectName %>.db::sales" SET "amount" = "amount" + ? WHERE "id" = ?`,true,[event.data.amount, event.data.id]);
          break;
<% } -%>
        default:
          debug('Event unknown', event.data.eventType);
      }
      event.extensions.response.sendStatus(200);
      return;
    }

<% } -%>
    let req = event.extensions.request;

<% if(authentication){ -%>
    let securityContext;
    if (typeof req.headers.authorization === 'string' && req.headers.authorization.split(' ').length > 1 && req.headers.authorization.split(' ')[0].toLowerCase() === 'bearer') {
      try {
        securityContext = await createSecurityContext(req.headers.authorization.split(' ')[1], services.uaa);
      } catch (err) {
        debug('Create Security Context', err.message);
        event.extensions.response.sendStatus(401);
        return;
      }
    } else {
      debug('Create Security Context', 'Invalid Headers - Missing Access Token');
      event.extensions.response.sendStatus(401);
      return;
    }

<% } -%>
    switch(req.path) {
      case '/srv/':
<% if(authorization){ -%>
        if (securityContext.checkScope('$XSAPPNAME.User')) {
<% } -%>
          results = '<%= projectName %>';
<% if(authorization){ -%>
        } else {
          event.extensions.response.sendStatus(403);
          return;
        }
<% } -%>
        break;

<% if(authentication){ -%>
      case '/srv/user':
<% if(authorization){ -%>
        if (securityContext.checkScope('$XSAPPNAME.User')) {
<% } -%>
          try {
            let user = {};
            user.logonName = securityContext.getLogonName();
            user.givenName = securityContext.getGivenName();
            user.familyName = securityContext.getFamilyName();
            user.email = securityContext.getEmail();
<% if(authorization){ -%>
            user.scopes = {};
            user.scopes.User = securityContext.checkScope('$XSAPPNAME.User');
            user.scopes.Admin = securityContext.checkScope('$XSAPPNAME.Admin');
<% } -%>
            results = user;
          } catch (err) {
            debug('/srv/user', err.message, err.stack);
            results = err.message;
          }
<% if(authorization){ -%>
        } else {
          event.extensions.response.sendStatus(403);
          return;
        }
<% } -%>
        break;

<% } -%>
<% if(apiS4HC){ -%>
      case '/srv/salesorders':
<% if(authorization){ -%>
        if (securityContext.checkScope('$XSAPPNAME.User')) {
<% } -%>
          results = await getSalesOrders(req);
<% if(authorization){ -%>
        } else {
          event.extensions.response.sendStatus(403);
          return;
        }
<% } -%>
        break;

<% } -%>
<% if(apiGraph){ -%>
      case '/srv/graph':
<% if(authorization){ -%>
        if (securityContext.checkScope('$XSAPPNAME.User')) {
<% } -%>
          try {
            let res1 = await httpClient.executeHttpRequest(
              {
                destinationName: '<%= projectName %>-graph-api'
<% if(authentication){ -%>
                ,
                jwt: retrieveJwt(req)
<% } -%>
              },
              {
                method: 'GET',
                url: req.query.path || '<%= apiGraphId %>'
              }
            );
            let location = req.query.location || '';
            if (location !== '') {
              let res2 = await httpClient.executeHttpRequest(
                {
                  destinationName: '<%= projectName %>-graph-api'
<% if(authentication){ -%>
                  ,
                  jwt: retrieveJwt(req)
<% } -%>
                },
                {
                  method: 'PATCH',
                  url: req.query.path || '<%= apiGraphId %>',
                  headers: {
                    "If-Match": res1.headers.etag
                  },
                  data: {
                    "IncotermsTransferLocation": location,
                    "IncotermsLocation1": location
                  }
                },
                {
                  fetchCsrfToken: false
                }
              );
              results = res2.data;
            } else {
              results = res1.data;
            };
          } catch (err) {
            debug('/srv/graph', err.message, err.stack);
            results = err.message;
          }
<% if(authorization){ -%>
        } else {
          event.extensions.response.sendStatus(403);
          return;
        }
<% } -%>
        break;

<% } -%>
<% if(apiDest){ -%>
      case '/srv/dest':
<% if(authorization){ -%>
        if (securityContext.checkScope('$XSAPPNAME.User')) {
<% } -%>
          try {
            let res1 = await httpClient.executeHttpRequest(
              {
                destinationName: req.query.destination || '<%= projectName %>-nw'
<% if(authentication){ -%>
                ,
                jwt: retrieveJwt(req)
<% } -%>
              },
              {
                method: 'GET',
                url: req.query.path || ''
              }
            );
            results = res1.data;
          } catch (err) {
            debug('/srv/dest', err.message, err.stack);
            results = err.message;
          }
<% if(authorization){ -%>
        } else {
          event.extensions.response.sendStatus(403);
          return;
        }
<% } -%>
        break;

<% } -%>
<% if(hana){ -%>
      case '/srv/sales':
<% if(authorization){ -%>
        if (securityContext.checkScope('$XSAPPNAME.User')) {
<% } -%>
          results = await execDB(`SELECT * FROM "<%= projectName %>.db::sales"`);
<% if(authorization){ -%>
        } else {
          event.extensions.response.sendStatus(403);
          return;
        }
<% } -%>
        break;

      case '/srv/topSales':
<% if(authorization){ -%>
        if (securityContext.checkScope('$XSAPPNAME.User')) {
<% } -%>
          let amount = req.query.amount ?? 0;
          results = await execDB(`CALL "<%= projectName %>.db::SP_TopSales"(?,?)`,true, [amount]);
<% if(authorization){ -%>
        } else {
          event.extensions.response.sendStatus(403);
          return;
        }
<% } -%>
        break;

      case '/srv/session':
<% if(authorization){ -%>
        if (securityContext.checkScope('$XSAPPNAME.Admin')) {
<% } -%>
          results = await execDB(`SELECT * FROM M_SESSION_CONTEXT`);
<% if(authorization){ -%>
        } else {
          event.extensions.response.sendStatus(403);
          return;
        }
<% } -%>
        break;

      case '/srv/db':
<% if(authorization){ -%>
        if (securityContext.checkScope('$XSAPPNAME.Admin')) {
<% } -%>
          results = await execDB(`SELECT SYSTEM_ID, DATABASE_NAME, HOST, VERSION, USAGE FROM M_DATABASE`);
<% if(authorization){ -%>
        } else {
          event.extensions.response.sendStatus(403);
          return;
        }
<% } -%>
        break;

      case '/srv/connections':
<% if(authorization){ -%>
        if (securityContext.checkScope('$XSAPPNAME.Admin')) {
<% } -%>
          results = await execDB(`SELECT TOP 10 USER_NAME, CLIENT_IP, CLIENT_HOST, START_TIME FROM M_CONNECTIONS WHERE OWN='TRUE' ORDER BY START_TIME DESC`);
<% if(authorization){ -%>
        } else {
          event.extensions.response.sendStatus(403);
          return;
        }
<% } -%>
        break;

<% } -%>
      default:
        event.extensions.response.sendStatus(400);
        return;
    }

    return results;
  }
}