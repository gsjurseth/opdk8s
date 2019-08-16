const expect                  = require('chai').expect,
      rewire                  = require('rewire'),
      apigeeplanetController  = rewire('../apigeeplanet-controller-sync.js'),
      pr                      = require('properties-reader'),
      children                = require('./data/children'),
      apigeeplanetData        = require('./data/apigeeplanetObject.json');

//override the tpls so that we can run our tests
const tplprops = function() {
  return pr('./test/data/cluster-config-tpl.properties');
}

apigeeplanetController.__set__('pr', tplprops);

describe('Testing calculateStatus from apigeeplanet-controller', () => {
  let calculateStatus = apigeeplanetController.__get__('calculateStatus');
  it('Should return a true status for datastore', async () => {
    let status = calculateStatus(children);
    expect(status["datastore.apigee.google.com/v1"].ready).to.equal(true);
  });

  it('Should return a false status for managementserver', async () => {
    let status = calculateStatus(children);
    expect(status["managementserver.apigee.google.com/v1"].ready).to.equal(false);
  });

  it('Should return a false status for psslave', async () => {
    let status = calculateStatus(children);
    expect(status["psslave.apigee.google.com/v1"].ready).to.equal(false);
  });
});

describe('Testing apigeeplanet-controller', () => {
  it('Should return a spec for a configmap named: cluster-config', async () => {
    let res = await apigeeplanetController(apigeeplanetData);
    expect(res.body.children[0].metadata.name).to.equal('cluster-config');
  });

  it('Should return specs cm(cluster-config) && ds()', async () => {
    apigeeplanetData.request.body.children['ConfigMap.v1'] = { notempty: true };

    let res = await apigeeplanetController(apigeeplanetData);
    expect(res.body.children[0].metadata.name).to.equal('cluster-config');
    expect(res.body.children[1].metadata.name).to.equal('opdkds');
  });

  it('Should return specs cm(cluster-config) && ds() && ms()', async () => {
    apigeeplanetData.request.body.children['ConfigMap.v1'] = { notempty: true };
    apigeeplanetData.request.body.children['datastore.apigee.google.com/v1'].opdkds.status = { ready: true };

    let res = await apigeeplanetController(apigeeplanetData);
    expect(res.body.children[0].metadata.name).to.equal('cluster-config');
    expect(res.body.children[1].kind).to.equal('datastore');
    expect(res.body.children[2].kind).to.equal('managementserver');
  });

  it('Should return specs cm(cluster-config) && ds() && ms() && qs ', async () => {
    apigeeplanetData.request.body.children['ConfigMap.v1'] = { notempty: true };
    apigeeplanetData.request.body.children['datastore.apigee.google.com/v1'].opdkds.status = { ready: true };
    apigeeplanetData.request.body.children['managementserver.apigee.google.com/v1'].opdkms.status = { ready: true };

    let res = await apigeeplanetController(apigeeplanetData);
    expect(res.body.children[0].metadata.name).to.equal('cluster-config');
    expect(res.body.children[1].kind).to.equal('datastore');
    expect(res.body.children[2].kind).to.equal('managementserver');
    expect(res.body.children[3].kind).to.equal('qs');
  });

  it('Should return specs cm(cluster-config) && ds() && ms() && qs ', async () => {
    apigeeplanetData.request.body.children['ConfigMap.v1'] = { notempty: true };
    apigeeplanetData.request.body.children['datastore.apigee.google.com/v1'].opdkds.status = { ready: true };
    apigeeplanetData.request.body.children['managementserver.apigee.google.com/v1'].opdkms.status = { ready: true };
    apigeeplanetData.request.body.children['qs.apigee.google.com/v1'].opdkqs.status = { ready: true };

    let res = await apigeeplanetController(apigeeplanetData);
    expect(res.body.children[0].metadata.name).to.equal('cluster-config');
    expect(res.body.children[1].kind).to.equal('datastore');
    expect(res.body.children[2].kind).to.equal('managementserver');
    expect(res.body.children[3].kind).to.equal('qs');
    expect(res.body.children[4].kind).to.equal('psmaster');
  });
  
  it('Should return specs cm(cluster-config) && ds() && ms() && qs && psmaster && psslave', async () => {
    apigeeplanetData.request.body.children['ConfigMap.v1'] = { notempty: true };
    apigeeplanetData.request.body.children['datastore.apigee.google.com/v1'].opdkds.status = { ready: true };
    apigeeplanetData.request.body.children['managementserver.apigee.google.com/v1'].opdkms.status = { ready: true };
    apigeeplanetData.request.body.children['qs.apigee.google.com/v1'].opdkqs.status = { ready: true };
    apigeeplanetData.request.body.children['psmaster.apigee.google.com/v1'].opdkpsmaster.status = { ready: true };

    let res = await apigeeplanetController(apigeeplanetData);
    expect(res.body.children[0].metadata.name).to.equal('cluster-config');
    expect(res.body.children[1].kind).to.equal('datastore');
    expect(res.body.children[2].kind).to.equal('managementserver');
    expect(res.body.children[3].kind).to.equal('qs');
    expect(res.body.children[4].kind).to.equal('psmaster');
    expect(res.body.children[5].kind).to.equal('psslave');
  });
  it('Should return specs cm(cluster-config) && ds() && ms() && qs && psmaster && psslave && router', async () => {
    apigeeplanetData.request.body.children['ConfigMap.v1'] = { notempty: true };
    apigeeplanetData.request.body.children['datastore.apigee.google.com/v1'].opdkds.status = { ready: true };
    apigeeplanetData.request.body.children['managementserver.apigee.google.com/v1'].opdkms.status = { ready: true };
    apigeeplanetData.request.body.children['qs.apigee.google.com/v1'].opdkqs.status = { ready: true };
    apigeeplanetData.request.body.children['psmaster.apigee.google.com/v1'].opdkpsmaster.status = { ready: true };
    apigeeplanetData.request.body.children['psslave.apigee.google.com/v1'].opdkpsslave.status = { ready: true };

    let res = await apigeeplanetController(apigeeplanetData);
    expect(res.body.children[0].metadata.name).to.equal('cluster-config');
    expect(res.body.children[1].kind).to.equal('datastore');
    expect(res.body.children[2].kind).to.equal('managementserver');
    expect(res.body.children[3].kind).to.equal('qs');
    expect(res.body.children[4].kind).to.equal('psmaster');
    expect(res.body.children[5].kind).to.equal('psslave');
    expect(res.body.children[6].kind).to.equal('router');
  });
});
