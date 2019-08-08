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

const psslaveSpec = require('/tplconfigs/psslave-spec.json');
const psslaveSvc = require('/tplconfigs/psslave-svc.json');

module.exports = async function (context) {
  let observed = context.request.body;
  let desired = {status: {}, children: []};

  try {
    psslaveStatus = {ready: false};
    let psslave = observed.parent;
    let children = observed.children;

    if ( children['CatSet.ctl.enisoc.com/v1'].psslave != null && 
      children['CatSet.ctl.enisoc.com/v1'].psslave.status != null &&
      children['CatSet.ctl.enisoc.com/v1'].psslave.status.readyReplicas != null ) {
      let catsetStatus = children['CatSet.ctl.enisoc.com/v1'].psslave.status;
      if ( children['CatSet.ctl.enisoc.com/v1']['psslave']['status'].readyReplicas === psslave.spec.replicants) {
        psslaveStatus = {ready: true};
      }
    }

    desired.status = psslaveStatus;

    if (observed.finalizing) {
      console.log('our children while finalizing: %j', Object.keys(observed.children));
      desired.children = [];
      return {status: 200, body: desired, headers: {'Content-Type': 'application/json'}};
    }

    desired.children.push(psslaveSpec);
    desired.children.push(psslaveSvc);
  }
  catch (e) {
    return {status: 500, body: e.stack};
  }

  console.log('-----The psslave status: %j', desired.status);
  return {status: 200, body: desired, headers: {'Content-Type': 'application/json'}};
};
