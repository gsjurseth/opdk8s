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

const msSpec = require('/tplconfigs/ms-spec.json');
const msSvc = require('/tplconfigs/ms-svc.json');

module.exports = async function (context) {
  let observed = context.request.body;
  let desired = {status: {}, children: []};

  try {
    msStatus = {ready: false};
    let managementserver = observed.parent;
    let children = observed.children;

    if ( children['CatSet.ctl.enisoc.com/v1'].ms != null && 
      children['CatSet.ctl.enisoc.com/v1'].ms.status != null &&
      children['CatSet.ctl.enisoc.com/v1'].ms.status.readyReplicas != null ) {
      let catsetStatus = children['CatSet.ctl.enisoc.com/v1'].ms.status;
      if ( children['CatSet.ctl.enisoc.com/v1']['ms']['status'].readyReplicas === managementserver.spec.replicants) {
        msStatus = {ready: true};
      }
    }

    desired.status = msStatus;

    if (observed.finalizing) {
      console.log('our children while finalizing: %j', Object.keys(observed.children));
      desired.children = [];
      return {status: 200, body: desired, headers: {'Content-Type': 'application/json'}};
    }

    desired.children.push(msSpec);
    desired.children.push(msSvc);
  }
  catch (e) {
    return {status: 500, body: e.stack};
  }

  console.log('managementserver status: %j', desired.status);
  return {status: 200, body: desired, headers: {'Content-Type': 'application/json'}};
};
