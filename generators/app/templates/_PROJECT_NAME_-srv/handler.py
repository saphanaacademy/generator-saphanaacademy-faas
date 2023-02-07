import bottle

<% if(authentication || hana || apiDest){ -%>
import os
from os import path

<% } -%>
<% if(authentication){ -%>
from sap import xssec
UAA_ROOT = os.environ.get("SERVICE_BINDING_ROOT") + "/<%= projectName %>-uaa"
with open(path.join(UAA_ROOT, "clientid"), "r") as f:
  uaa_clientid = f.read()
with open(path.join(UAA_ROOT, "clientsecret"), "r") as f:
  uaa_clientsecret = f.read()
with open(path.join(UAA_ROOT, "url"), "r") as f:
  uaa_url = f.read()
with open(path.join(UAA_ROOT, "verificationkey"), "r") as f:
  uaa_verificationkey = f.read()
with open(path.join(UAA_ROOT, "xsappname"), "r") as f:
  uaa_xsappname = f.read()
uaa_service = {"clientid": uaa_clientid, "clientsecret": uaa_clientsecret, "url": uaa_url, "verificationkey": uaa_verificationkey, "xsappname": uaa_xsappname}

<% } -%>
<% if(apiDest){ -%>
import requests
DEST_ROOT = os.environ.get("SERVICE_BINDING_ROOT") + "/<%= projectName %>-dest"
with open(path.join(DEST_ROOT, "clientid"), "r") as f:
  dest_clientid = f.read()
with open(path.join(DEST_ROOT, "clientsecret"), "r") as f:
  dest_clientsecret = f.read()
with open(path.join(DEST_ROOT, "uri"), "r") as f:
  dest_uri = f.read()
with open(path.join(DEST_ROOT, "url"), "r") as f:
  dest_url = f.read()
def api_dest(destination, path=""):
  token = requests.post(dest_url + "/oauth/token?grant_type=client_credentials", auth=(dest_clientid,dest_clientsecret)).json()["access_token"]
  url = requests.get(dest_uri + "/destination-configuration/v1/destinations/" + destination, headers={"Authorization": "Bearer " + token}).json()["destinationConfiguration"]["URL"]
  results = requests.get(url + "/" + path, headers={"Accept": "Application/json"}).json()
  return results

<% } -%>
<% if(hana){ -%>
import json
from hdbcli import dbapi
HDI_ROOT = os.environ.get("SERVICE_BINDING_ROOT") + "/<%= projectName %>-hdi"
with open(path.join(HDI_ROOT, "host"), "r") as f:
  hana_host = f.read()
with open(path.join(HDI_ROOT, "port"), "r") as f:
  hana_port = f.read()
with open(path.join(HDI_ROOT, "schema"), "r") as f:
  hana_schema = f.read()
with open(path.join(HDI_ROOT, "user"), "r") as f:
  hana_user = f.read()
with open(path.join(HDI_ROOT, "password"), "r") as f:
  hana_password = f.read()

def exec_db(sql, is_procedure=False, is_prepared=False, params=""):
  try:
    conn = dbapi.connect(address=hana_host, port=int(hana_port), encrypt=True, user=hana_user, password=hana_password, currentSchema=hana_schema)
  except dbapi.Error as err:
    results = format(err)
  else:
    with conn.cursor() as cursor:
      try:
        if is_procedure:
          cursor.callproc(sql,(params,0))
        elif is_prepared:
          cursor.execute(sql,params)
        else:
          cursor.execute(sql)
      except dbapi.Error as err:
        results = format(err)
      else:
        if is_procedure or sql.lower().split()[0] == 'select':
          rows = cursor.fetchall()
          # convert to JSON
          results = []
          for row in rows:
            this_row = {}
            for index, column in enumerate(row):
              this_row[cursor.description[index][0]] = column
            results.append(this_row)
          results = json.dumps(results)
        else:
          results = ''
        cursor.close()
    try:
      conn.close()
    except dbapi.Error as err:
      results = format(err)
  return results

<% } -%>
def main(event, context):
<% if(subscription){ -%>
  if type(event["ce-type"]) is str:
    if event["ce-type"] == "sap.kyma.custom.<%= projectName %>.default.event.v1":
      print("Event", event["ce-type"], event["data"]["value"])
      return bottle.HTTPResponse(status=200, headers={"content-type": "text/plain"})
<% if(hana){ -%>
    elif event["ce-type"] == "sap.kyma.custom.<%= projectName %>.sales.boost.v1":
      print("Event", event["ce-type"], event["data"]["id"], event["data"]["amount"])
      exec_db('UPDATE "<%= projectName %>.db::sales" SET "amount" = "amount" + :amount WHERE "id" = :id', False, True, {"id": event["data"]["id"], "amount": event["data"]["amount"]})
      return bottle.HTTPResponse(status=200, headers={"content-type": "text/plain"})
<% } -%>
    else:
      print("Event unknown", event["ce-type"])
      return bottle.HTTPResponse(status=200, headers={"content-type": "text/plain"})

<% } -%>
<% if(authentication){ -%>
  token = event["extensions"]["request"].headers.get("Authorization")
  if token:
    token = token.split(" ")[1]
  else:
    return bottle.HTTPResponse(status=401, headers={"content-type": "text/plain"})
  try:
    security_context = xssec.create_security_context(token, uaa_service)
  except:
    return bottle.HTTPResponse(status=401, headers={"content-type": "text/plain"})

<% } -%>
  url_path = event["extensions"]["request"].path
  if url_path == "/srv/":
<% if(authorization){ -%>
    if security_context.check_scope("$XSAPPNAME.User"):
<% } -%>
      results = '<%= projectName %>';
<% if(authorization){ -%>
    else:
      return bottle.HTTPResponse(status=403, headers={"content-type": "text/plain"})
<% } -%>

<% if(authentication){ -%>
  elif url_path == "/srv/user":
<% if(authorization){ -%>
    if security_context.check_scope("$XSAPPNAME.User"):
<% } -%>
      results = {"logonName": security_context.get_logon_name(), "givenName": security_context.get_given_name(), "familyName": security_context.get_family_name(), "email": security_context.get_email()<% if(authorization){ -%>, "scopeUser": security_context.check_scope("$XSAPPNAME.User"), "scopeAdmin": security_context.check_scope("$XSAPPNAME.Admin")<% } -%>}
<% if(authorization){ -%>
    else:
      return bottle.HTTPResponse(status=403, headers={"content-type": "text/plain"})
<% } -%>

<% } -%>
<% if(apiDest){ -%>
  elif url_path == "/srv/dest":
<% if(authorization){ -%>
    if security_context.check_scope("$XSAPPNAME.User"):
<% } -%>
      destination = event["extensions"]["request"].query.destination
      if not destination:
        destination = "<%= projectName %>-nw"
      path = event["extensions"]["request"].query.path
      if not path:
        path = ""
      results = api_dest(destination, path)
<% if(authorization){ -%>
    else:
      return bottle.HTTPResponse(status=403, headers={"content-type": "text/plain"})
<% } -%>

<% } -%>
<% if(hana){ -%>
  elif url_path == "/srv/sales":
<% if(authorization){ -%>
    if security_context.check_scope("$XSAPPNAME.User"):
<% } -%>
      results = exec_db('SELECT * FROM "<%= projectName %>.db::sales"')
<% if(authorization){ -%>
    else:
      return bottle.HTTPResponse(status=403, headers={"content-type": "text/plain"})
<% } -%>

  elif url_path == "/srv/topSales":
<% if(authorization){ -%>
    if security_context.check_scope("$XSAPPNAME.User"):
<% } -%>
      amount = event["extensions"]["request"].query.amount
      if not amount:
        amount = 0
      results = exec_db('"<%= projectName %>.db::SP_TopSales"', True, False, amount)
<% if(authorization){ -%>
    else:
      return bottle.HTTPResponse(status=403, headers={"content-type": "text/plain"})
<% } -%>

  elif url_path == "/srv/session":
<% if(authorization){ -%>
    if security_context.check_scope("$XSAPPNAME.Admin"):
<% } -%>
      results = exec_db("SELECT * FROM M_SESSION_CONTEXT")
<% if(authorization){ -%>
    else:
      return bottle.HTTPResponse(status=403, headers={"content-type": "text/plain"})
<% } -%>

  elif url_path == "/srv/db":
<% if(authorization){ -%>
    if security_context.check_scope("$XSAPPNAME.Admin"):
<% } -%>
      results = exec_db("SELECT SYSTEM_ID, DATABASE_NAME, HOST, VERSION, USAGE FROM M_DATABASE")
<% if(authorization){ -%>
    else:
      return bottle.HTTPResponse(status=403, headers={"content-type": "text/plain"})
<% } -%>

  elif url_path == "/srv/connections":
<% if(authorization){ -%>
    if security_context.check_scope("$XSAPPNAME.Admin"):
<% } -%>
      results = exec_db("SELECT TOP 10 USER_NAME, CLIENT_IP, CLIENT_HOST, TO_NVARCHAR(START_TIME) AS START_TIME FROM M_CONNECTIONS WHERE OWN='TRUE' ORDER BY START_TIME DESC")
<% if(authorization){ -%>
    else:
      return bottle.HTTPResponse(status=403, headers={"content-type": "text/plain"})
<% } -%>

<% } -%>
  else:
    return bottle.HTTPResponse(status=400, headers={"content-type": "text/plain"})

  return results