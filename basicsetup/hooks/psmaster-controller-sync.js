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

const psmasterSpec = require('/tplconfigs/psmaster-spec.json');
const psmasterSvc = require('/tplconfigs/psmaster-svc.json');

module.exports = async function (context) {
  let observed = context.request.body;
  let desired = {status: {}, children: []};

  try {
    psmasterStatus = {ready: false};
    let psmaster = observed.parent;
    let children = observed.children;

    if ( children['CatSet.ctl.enisoc.com/v1'].psmaster != null && 
      children['CatSet.ctl.enisoc.com/v1'].psmaster.status != null &&
      children['CatSet.ctl.enisoc.com/v1'].psmaster.status.readyReplicas != null ) {
      let catsetStatus = children['CatSet.ctl.enisoc.com/v1'].psmaster.status;
      if ( catsetStatus.readyReplicas === psmaster.spec.replicants) {
        psmasterStatus = {ready: true};
      }
    }

    desired.status = psmasterStatus;

    if (observed.finalizing) {
      desired.children = [];
      return {status: 200, body: desired, headers: {'Content-Type': 'application/json'}};
    }

    desired.children.push(psmasterSpec);
    desired.children.push(psmasterSvc);
  }
  catch (e) {
    return {status: 500, body: e.stack};
  }

  return {status: 200, body: desired, headers: {'Content-Type': 'application/json'}};
};
