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

Object.prototype.isEmpty = function() {
    for(var key in this) {
        if(this.hasOwnProperty(key))
            return false;
    }
    return true;
}

const pr    = require('properties-reader'),
      _     = require('lodash'),
      fetch = require('node-fetch');

const listOfChildren = [ "router.apigee.google.com/v1", 
  "environment.apigee.google.com/v1" ];


const props = pr('/config/cluster.config');

const msProps = {
  user: props.get('ADMIN_EMAIL'),
  pass: props.get('APIGEE_ADMINPW'),
  url: 'mshs.apigee.svc.cluster.local',
  region: props.get('REGION'),
  pod: props.get('MP_POD')
};

const newOrgBody = function(org) {
  return {
    "displayName" : `${org}`,
    "name" : `${org}`,
    "properties" : {
    },
    "type" : "paid"
  };
}

const newMP = function(o) {
  let mp =  {};
  mp.apiVersion = 'apigee.google.com/v1';
  mp.kind = 'mp';
  mp.metadata = {}
  mp.metadata.name = `${o.metadata.name}-mps`;
  mp.metadata.namespace = "apigee";
  mp.spec = {};
  mp.spec.replicants = Number(o.spec['mp-replicas']);
  mp.spec.org = o.spec['org_name'];
  return mp;
}

const getKid = function(o) {
  let kid = Object.keys(o)[0];
  return kid;
}

const checkForOrg = function(org) {
  return http.request( `${msProps.url}/organizations/${org}`, {
    auth: `${msProps.user}:${msProps.pass}`
    },
    res => {
      if ( res.statusCode === 200 ) {
        return true;
      }
      else {
        return false;
      }
    }
  );
}

const addEnv = async function(org) {
  let h = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': 'Basic ' + Buffer.from(`${msProps.user}:${msProps.pass}`).toString('base64')
  }
  let opts = {
    method: 'POST',
    headers: h,
    body: JSON.stringify( newOrgBody(org) )
  };
  return await fetch(`${msProps.url}/v1/organizations`,opts)
    .then( res => {
      return res.ok;
    })
    .then( () => {
      opts.body = { region: msProps.region, pod: msProps.pod };
      return fetch(`${msProps.url}/v1/organizations/${org}/pods`, opts)
    })
    .then( res => {
      return res.ok;
    })
    .then( () => {
      delete(opts.body);
      return fetch( `${msProps.url}/v1/organizations/${org}/userroles/orgadmin/users?id=${msProps.user}`, opts );
    })
    .then( res => {
      return res.ok;
    });
}

// we've passed in the org name so we can check wrt this org alone
// that is, we're not checking for the readines of any other routers
// only the ones associated with this particular org... We will not store
// the org name in status for the routers, but we will store the org status itself
// and check if it's already been created
const calculateStatus = function(observed) {
  let allstatus = {};
  let children = observed.children;
  let parent = observed.parent;
  let org = parent.metadata.name;

  let routerChild = `${org}-routers`;

  // set everything to ready: false by default
  listOfChildren.forEach( i => { 
    if ( children.isEmpty() || children[i].isEmpty() ) {
      allstatus[i] = { ready: false };
    }
    else if (children[i][ routerChild ].status != null) {
      allstatus[i] = children[i][ routerChild ].status;
    }
    else {
      allstatus[i] = {ready: false};
    }
  });

  if ( allstatus['router.apigee.google.com/v1'].ready ) {
    allstatus.org[ org ] = { ready: checkForOrg(org) }
  }

  return allstatus;
}

module.exports = async function (context) {
  let observed = context.request.body;
  let desired = {status: {}, children: []};
  let orgStatus = { ready: false };
  let parent = observed.parent
  let children = observed.children;
  let org = parent.metadata.name;

  console.log('the children: %j', children);

  try {
  }
  catch (e) {
    return {status: 500, body: e.stack};
  }

  return {status: 200, body: desired, headers: {'Content-Type': 'application/json'}};
};
