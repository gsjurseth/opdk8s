/*
Copyright 2019 Google Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    https://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

const pr = require('properties-reader');
const listOfChildren =  ["ConfigMap.v1","datastore.apigee.google.com/v1"];

Object.prototype.isEmpty = function() {
    for(var key in this) {
        if(this.hasOwnProperty(key))
            return false;
    }
    return true;
}

const toPropertiesString = function(p) {
  return Object.keys(p).map( i => `${i}=` + p[i] ).join('\n');
}

const newDS = function() {
  let ds =  {};
  ds.apiVersion = 'apigee.google.com/v1';
  ds.kind = 'datastore';
  ds.metadata = {}
  ds.metadata.name = 'opdkds';
  ds.metadata.namespace = "apigee";
  ds.spec = {};
  ds.spec.replicants = 3;
  return ds;
}

const newMS = function() {
  let ms =  {};
  ms.apiVersion = 'apigee.google.com/v1';
  ms.kind = 'managementserver';
  ms.metadata = {}
  ms.metadata.name = 'opdkms';
  ms.metadata.namespace = "apigee";
  ms.spec = {};
  ms.spec.replicants = 1;
  return ms;
}

const newQS = function() {
  let qs =  {};
  qs.apiVersion = 'apigee.google.com/v1';
  qs.kind = 'qs';
  qs.metadata = {}
  qs.metadata.name = 'opdkqs';
  qs.metadata.namespace = "apigee";
  qs.spec = {};
  qs.spec.replicants = 1;
  return qs;
}

const newPSMaster = function() {
  let psmaster =  {};
  psmaster.apiVersion = 'apigee.google.com/v1';
  psmaster.kind = 'psmaster';
  psmaster.metadata = {}
  psmaster.metadata.name = 'opdkpsmaster';
  psmaster.metadata.namespace = "apigee";
  psmaster.spec = {};
  psmaster.spec.replicants = 1;
  return psmaster;
}

const newPSSlave = function() {
  let psslave =  {};
  psslave.apiVersion = 'apigee.google.com/v1';
  psslave.kind = 'psslave';
  psslave.metadata = {}
  psslave.metadata.name = 'opdkpsslave';
  psslave.metadata.namespace = "apigee";
  psslave.spec = {};
  psslave.spec.replicants = 1;
  return psslave;
}

const newCM = function(parent) {
  const tplprops = pr('/tplconfigs/cluster-config-tpl.properties');

  let cm =  {};
  let p = tplprops._properties;
  p.ADMIN_EMAIL = parent.spec.admin_email;
  p.APIGEE_ADMINPW = parent.spec.adminpw;
  cm.apiVersion = 'v1';
  cm.kind = 'ConfigMap';
  cm.metadata = {}
  cm.metadata.name = 'cluster-config';
  cm.metadata.namespace = "apigee";
  cm.data = {};
  cm.data['cluster.config'] = toPropertiesString(p);
  return cm;
}

const finalize = function(observed,desired) {
  desired.children = [];

  listOfChildren.forEach( i => {
    if ( !observed.children[i].isEmpty() ) {
      desired.finalized = false;
      return {status: 200, body: desired, headers: {'Content-Type': 'application/json'}};
    }
  });
  desired.finalized = true;
  return {status: 200, body: desired, resyncAfterSeconds: 10, headers: {'Content-Type': 'application/json'}};

}

const calculateStatus = function(children) {
  let allstatus = {};
  let listOfChildren = [ "ConfigMap.v1", "datastore.apigee.google.com/v1",
    "managementserver.apigee.google.com/v1", "psmaster.apigee.google.com/v1",
    "psslave.apigee.google.com/v1", "qs.apigee.google.com/v1" ];


  // set everything to ready: false by default
  listOfChildren.forEach( i => { 
    if ( children[i].status != null ) {
      if ( i === 'ConfigMap.v1' )
        allstatus[i] = { ready: true };
      allstatus[i] = children[i].status;
    }
    else {
      allstatus[i] = { ready: false };
    }
  });

  return allstatus;
}

module.exports = async function (context) {
  let observed = context.request.body;
  let desired = {status: {}, children: []};
  let status = {};


  try {
    let apigeeplanet = observed.parent;
    let children = observed.children;
    let planetstatus = false;

    status = calculateStatus(children);

    if (observed.finalizing) {
      return finalize(observed,desired);
    }

    console.log('our beloved kids: %j', children);

    desired.children.push( newCM(apigeeplanet) )

    // return immediately if we don't even have the configmap for the cluster config
    if (!status['ConfigMap.v1'].ready) {
      return {status: 200, body: desired, headers: {'Content-Type': 'application/json'}};
    }

    // now for datastore if not already there
    if ( status['ConfigMap.v1'].ready && !status['datastore.apigee.google.com/v1'].ready ) {
      desired.children.push( newDS() )
      return {status: 200, body: desired, headers: {'Content-Type': 'application/json'}};
    }

    desired.children.push( newDS() )
    // if datastore ready then add ms if not already there
    if ( status['datastore.apigee.google.com/v1'].ready && 
      !status['managementserver.apigee.google.com/v1'].ready) {
      desired.children.push( newMS() )
      return {status: 200, body: desired, headers: {'Content-Type': 'application/json'}};
    }

    // now for the management server
    desired.children.push( newMS() )

    // now add QS and PSMaster if they're not there already
    if ( status['datastore.apigee.google.com/v1'].ready && 
      status['managementserver.apigee.google.com/v1'].ready) {
      desired.children.push( newQS() )
      desired.children.push( newPSMaster() )
    }

    // now add QS and PSMaster if they're not there already
    // add the slave if not already there
    if ( status['psmaster.apigee.google.com/v1'].ready  ) {
      desired.children.push( newPSSlave() )
      planetstatus = true;
    }

    desired.status = { members: status, planet: planetstatus };
  }
  catch(e) {
    return {status: 500, body: e.stack};
  }

  return {status: 200, body: desired, headers: {'Content-Type': 'application/json'}};

};
