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

const pr                = require('properties-reader'),
      _                 = require('lodash'),
    { URLSearchParams } = require('url'),
      fetch             = require('node-fetch');

const mpSpec = require('/tplconfigs/mp-spec.json');
const mpSvc = require('/tplconfigs/mp-svc.json');

//const listOfChildren = [ "ReplicaSet.extensions/v1beta1" ];


const props = pr('/config/cluster.config');

const msProps = {
  user: props.get('ADMIN_EMAIL'),
  pass: props.get('APIGEE_ADMINPW'),
  url: 'http://mshs.apigee.svc.cluster.local:8080',
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

const getKid = function(o) {
  let kid = Object.keys(o)[0];
  return kid;
}

const checkForEnv = async function(p) {
  let env = p.metadata.name;
  let org = p.spec.org;

  let h = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': 'Basic ' + Buffer.from(`${msProps.user}:${msProps.pass}`).toString('base64')
  };
  let opts = {
    method: 'POST',
    headers: h,
    body: JSON.stringify( newOrgBody(org) )
  };
  let url = `${msProps.url}/v1/organizations/${org}/environments/${env}`;
  const res = await fetch(`${url}`,opts);
  const ok = res.ok;
  const r = await res.json()
    .catch( e => {
      console.log("we failed trying locate environment: %s", e.stack);
    });
  return ok;
}


const addUsersToOrg = async function(org) {
  let h = {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Accept': 'application/json',
    'Authorization': 'Basic ' + Buffer.from(`${msProps.user}:${msProps.pass}`).toString('base64')
  };
  let opts = {
    method: 'POST',
    headers: h
  };
  let encEmail = encodeURIComponent(msProps.user);
  let url = `${msProps.url}/v1/organizations/${org}/userroles/orgadmin/users?id=${encEmail}`;
  await fetch( `${url}`, opts )
    .catch( e => {
      throw new Error("Failed adding orgadmin: " + e.stack);
    });
}

const getMPUUIDs = async function(c) {

}

const associateEnv = async function(org) {
  let h = {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Accept': 'application/json',
    'Authorization': 'Basic ' + Buffer.from(`${msProps.user}:${msProps.pass}`).toString('base64')
  };
  let opts = {
    method: 'POST',
    headers: h
  };
  let params = new URLSearchParams();
  params.append( 'region', msProps.region );
  params.append( 'pod', msProps.pod );

  opts.body = params;
  let url = `${msProps.url}/v1/organizations/${org}/pods`;
  await fetch(`${url}`, opts)
    .catch( e => {
      throw new Error("Failed associating org: " + e.stack);
    });
}

const newEnvBody = function(e) {
  return {
   "name": e,
   "description": e
  };
}

const createEnvironment = async function(p) {
  let env = p.metadata.name;
  let org = p.spec.org;
  let h = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': 'Basic ' + Buffer.from(`${msProps.user}:${msProps.pass}`).toString('base64')
  };
  let opts = {
    method: 'POST',
    headers: h,
    body: JSON.stringify( newEnvBody(env) )
  };
  let url = `${msProps.url}/v1/organizations/${org}/environments`;
  await fetch(`${url}`,opts)
    .catch( e => {
      throw new Error("Failed creating env: " + e.stack);
    });
}

const deleteOrg = async function(org) {
  let h = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': 'Basic ' + Buffer.from(`${msProps.user}:${msProps.pass}`).toString('base64')
  };
  let opts = {
    method: 'DELETE',
    headers: h
  };
  let url = `${msProps.url}/v1/organizations/${org}`;
  await fetch(`${url}`,opts)
    .catch( e => {
      throw new Error("Failed deleting org: " + e.stack);
    });
}

const disAssociateOrg = async function(org) {
  let h = {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Accept': 'application/json',
    'Authorization': 'Basic ' + Buffer.from(`${msProps.user}:${msProps.pass}`).toString('base64')
  };
  let opts = {
    method: 'POST',
    headers: h
  };
  let params = new URLSearchParams();
  params.append( 'region', msProps.region );
  params.append( 'pod', msProps.pod );
  params.append( 'action', 'remove' );

  opts.body = params;
  let url = `${msProps.url}/v1/organizations/${org}/pods`;
  await fetch(`${url}`, opts)
    .catch( e => {
      throw new Error("Failed associating org: " + e.stack);
    });
}

const removeOrg = async function(org) { 
  await disAssociateOrg(org);
  await deleteOrg(org);
}

const addEnvironment = async function(p) { 
  await createEnvironment(p);
  await associateEnv(p);
  await addUsersToOrg(p);
}

// we need both the org and env name in addition
// to the children object
const calculateStatus = async function(observed) {
  let children = observed.children;
  let parent = observed.parent;
  let env = parent.metadata.name;
  let org = parent.spec.org;
  let rsStr = "ReplicaSet.apps/v1";
  let mpChild = `${org}-${env}-mp`;
  let allstatus = { env: {} };
  allstatus.mp = { ready: false };
  allstatus.env = { ready: false };


  if ( children[rsStr][mpChild] != null && children[rsStr][mpChild].status ) {
    if ( children[rsStr][mpChild].status.readyReplicas == parent.spec['mp-replicas'] ) {
      allstatus.mp.ready = true;
    }
    else {
      allstatus.mp.ready = false;
    }
  }
  // set everything to ready: false by default
  /*
  */

  if ( allstatus.mp.ready == true ) {
    allstatus.env == checkForEnv(parent);
  }
  return allstatus;
}

const finalize = async function(observed,desired,status) {
  let org = observed.parent.metadata.name;
  desired.children = [];

  if ( !status['env.apigee.google.com/v1'].ready ) {
    if ( status.org[org].ready ) {
      await removeOrg(org);
    }
  }

  desired.finalized = true;
  return {status: 200, body: desired, resyncAfterSeconds: 10, headers: {'Content-Type': 'application/json'}};
}

module.exports = async function (context) {
  let observed = context.request.body;
  let desired = {status: {}, children: []};
  let envStatus = { ready: false };
  let parent = observed.parent
  let children = observed.children;
  let env = parent.metadata.name;
  let org = parent.spec.org;
  let mpChild = `${org}-${env}-mp`;
  let mpSvcName = `${org}-${env}-hs`;

  //console.log('From the env: %j', observed);
  try {

    let status = await calculateStatus(observed);

    console.log('status: %j', status);
     
    if (observed.finalizing) {
      console.log('Finalizing...');
      return await finalize(observed,desired,status);
    }

    if (!(status.env.ready == true)) {
      console.log('about to add environment: %j', env);
      await addEnvironment(parent);
    }
    else {
      envStatus.ready = true;
    }

    /*
    if (status['router.apigee.google.com/v1'].ready) {
      if ( !( status.env[ env ].ready == true ) ) {
        await addenv(env);
      }
      else {
        envStatus.ready = true;
      }
    }
    */
    desired.status =  { members: status, envStatus };
    mpSpec.metadata.name = mpChild;
    mpSvc.metadata.name = mpSvcName;
    desired.children.push( mpSpec);
    desired.children.push( mpSvc);
  }
  catch (e) {
    return {status: 500, body: e.stack};
  }

  return {status: 200, body: desired, headers: {'Content-Type': 'application/json'}};
};
