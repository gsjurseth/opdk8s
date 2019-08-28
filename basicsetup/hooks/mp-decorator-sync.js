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

const pr                = require('properties-reader'),
      _                 = require('lodash'),
    { URLSearchParams } = require('url'),
      fetch             = require('node-fetch');

const props = pr('/config/cluster.config');

const msProps = {
  user: props.get('ADMIN_EMAIL'),
  pass: props.get('APIGEE_ADMINPW'),
  url: 'http://mshs.apigee.svc.cluster.local:8080',
  region: props.get('REGION'),
  pod: props.get('MP_POD')
};

const getMPUUID = async function(ip) {
  let h = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
  let opts = {
    method: 'GET',
    headers: h
  };

  let url = `http://${ip}:8082/v1/servers/self`;
  return fetch(`${url}`, opts)
    .then( d => d.json() )
    .then( d => d.uUID )
    .catch( e => {
      throw new Error("Failed fetching uuid for ip: " + e.stack);
    });
}

const registerMP = async function(o) {
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
  params.append( 'action', 'add' );
  params.append( 'uuid', o.uuid );

  opts.body = params;

  let url = `${msProps.url}/v1/o/${o.org}/e/${o.env}/servers`;
  return fetch(`${url}`, opts)
    .catch( e => {
      throw new Error("Failed registering uuid for mp: " + e.stack);
    });
}

const unregisterMPFromEnv = async function(o) {
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
  params.append( 'action', 'remove' );
  params.append( 'uuid', o.uuid );
  params.append( 'pod', msProps.pod );
  params.append( 'region', msProps.region );

  opts.body = params;

  let url = `${msProps.url}/v1/o/${o.org}/e/${o.env}/servers`;
  return fetch(`${url}`, opts)
    .then( () => { return o; } )
    .catch( e => {
      throw new Error("Failed registering uuid for mp: " + e.stack);
    });
}

const unregisterMPType = async function(o) {
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
  params.append( 'action', 'remove' );
  params.append( 'uuid', o.uuid );
  params.append( 'type', 'message-processor' );
  params.append( 'pod', msProps.pod );
  params.append( 'region', msProps.region );

  opts.body = params;

  let url = `${msProps.url}/v1/servers`;
  return fetch(`${url}`, opts)
    .then( () => { return o; } )
    .catch( e => {
      throw new Error("Failed registering type for mp: " + e.stack);
    });
}

const deleteServer = async function(o) {
  let h = {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Accept': 'application/json',
    'Authorization': 'Basic ' + Buffer.from(`${msProps.user}:${msProps.pass}`).toString('base64')
  };
  let opts = {
    method: 'DELETE',
    headers: h
  };

  let url = `${msProps.url}/v1/servers/${o.uuid}`;
  return fetch(`${url}`, opts)
    .catch( e => {
      throw new Error("Failed deleting server mp: " + e.stack);
    });
}

const addMP = async function(o) { 
  await getMPUUID(o.ip)
    .then( d => { return {...o,uuid: d }; })
    .then( registerMP )
    .catch( e => {
      console.log('failed registering ip for env/ip: %s/%s with error', o.env,o.ip,e.stack);
    });
}

const delMP = async function(o) { 
  await getMPUUID(o.ip)
    .then( d => { return {...o,uuid: d }; })
    .then( unregisterMPFromEnv )
    .then( unregisterMPType )
    .then( deleteServer )
    .catch( e => {
      console.log('failed registering ip for env/ip: %s/%s with error', o.env,o.ip,e.stack);
    });
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

module.exports = async function (context) {
  let observed = context.request.body;
  let desired = {children: []};

  //let children = observed.children;
  console.log('From the decorator objects annotations: %j', observed.object.metadata.annotations);
  try {

    if ( _.has(observed, 'object.status.podIP') ) {
      let o = {...observed.object.metadata.annotations, ip: observed.object.status.podIP};

      if (observed.finalizing) {
        console.log('Finalizing...');
        return await finalize(observed,desired);
        await delMP(o)
        .catch( e => {
          console.log('yeah, we uh failed and stuff while deleting: %s', e.stack);
        });
      }
      console.log('---decorator--- this is our podIP: %s', observed.object.status.podIP);
      await addMP(o)
        .catch( e => {
          console.log('yeah, we uh failed and stuff: %s', e.stack);
        });
    }
    else {
      console.log('---decorator--- no podIP: %j');
    }
    
  }
  catch (e) {
    return {status: 500, body: e.stack};
  }

  return {status: 200, body: desired, headers: {'Content-Type': 'application/json'}};
};
