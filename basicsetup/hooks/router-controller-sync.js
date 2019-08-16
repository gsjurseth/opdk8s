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

const routerSpec = require('/tplconfigs/router-spec.json');
const routerSvc = require('/tplconfigs/router-svc.json');

module.exports = async function (context) {
  let observed = context.request.body;
  let desired = {status: {}, children: []};

  try {
    routerStatus = {ready: false};
    let router = observed.parent;
    let children = observed.children;

    if ( router.spec.replicants ) {
      routerSpec.spec.replicas = router.spec.replicants;
    }

    if ( children['CatSet.ctl.enisoc.com/v1'].router != null && 
      children['CatSet.ctl.enisoc.com/v1'].router.status != null &&
      children['CatSet.ctl.enisoc.com/v1'].router.status.readyReplicas != null ) {
      let catsetStatus = children['CatSet.ctl.enisoc.com/v1'].router.status;
      if ( children['CatSet.ctl.enisoc.com/v1']['router']['status'].readyReplicas === router.spec.replicants) {
        routerStatus = {ready: true};
      }
    }

    desired.status = routerStatus;

    if (observed.finalizing) {
      desired.children = [];
      return {status: 200, body: desired, headers: {'Content-Type': 'application/json'}};
    }

    desired.children.push(routerSpec);
    desired.children.push(routerSvc);

  }
  catch (e) {
    return {status: 500, body: e.stack};
  }

  console.log( "From our routers and their status: %j", desired.status );
  return {status: 200, body: desired, headers: {'Content-Type': 'application/json'}};
};
