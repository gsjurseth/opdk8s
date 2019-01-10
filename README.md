# Initial experiments to get opdk running
so basically I did the following

 * built a docker with apigee-setup installed and ready
 * published said docker to my project gcr
 * created a cluster with 5 nodes
 * created a spec which updates some requirements (lower the mem and cpu reqs for ZK)
 * deployed a stateful set and watched
--- updates
 * added a few more configmaps to handle license file and an org config file
 * changed profile to ds: this is now working
 * added a sts for profile ms which is now working
 * added rmp
 * added analytics
 * added ingress and tested
 * wrote a daemon to watch for zookeeper events
 * tested that I could kill datastore nodes indescriminately and see if everything would come back

# TODO
 * setup management server and rmp's to rely on the service for the datastore nodes instead of the individual nodes
 * setup slave ps-servers and use a service for them as well

# Playbooks
Here i've setup a couple of quick start play books to get this up and running in your own gke-cluster quickly.

## Spin up a working environment
Quick play book to get everything up and running. For my own environment i'm using an nginx-ingress (in ingress-manifests) that's configured to use hostnames i've registered at freedns: ui|apiprod|apims.evils.in. You can create your own ingress at the very end of the setup but you'll need to have your own DNS to make it work. I've not included those instructions here as they really have nothing to do with Apigee. At a later time I may add that info and even automate some of it as well.

For any of this you can watch them by looking at the logs like this for example:

`kubectl logs -f ds-0`

### Docker
So, I had to build the docker with the docker file you see below. I used this command to do so:
```bash
docker build -t apigee-ds . --build-arg user=<userUser> --build-arg pass=<yourPass>
```

With that done I gat it and upload it to gcr like so:
```bash
docker tag apigee-opdk eu.gcr.io/gsj-k8s-training/apigee-opdk:6
docker push eu.gcr.io/gsj-k8s-training/apigee-opdk:6
```

### Update the spec files in `opdk-manifests`
In this example it's just version `6`. If you've built this and deployed it gcr on your own you'll need to update he specs with the image as outlined above


### Move on the kube bits
First we need to create all the configmaps that the installation an registration process uses as scripts
```bash
kubectl create configmap deregister-rmp --from-file=deRegisterRMP.sh
kubectl create configmap opdk-ds-cluster.config --from-file=opdk-ds-cluster.config
kubectl create configmap register-rmp --from-file=registerRMP.sh
kubectl create configmap org.config --from-file=org.config
```

Second ... well, really it's another config map. But you need to use your own license file which i've obviously not included here
```bash
kubectl create configmap license.config --from-file=</path/to/license.txt>
```

### The datastore (about 5 minutes)
A stateful set. you can use the log statements listed below to keep track of them. The last thing that happens is that the datastore runs the Zookeeper Keeper whose job it is to bounce zookeeper whenever one of them goes down and has to come up again.
```bash
kubectl apply -f opdk-manifests/ds.yaml
## and now watch them until they've all come up like so ...
kubectl logs -f ds-0
kubectl logs -f ds-1
kubectl logs -f ds-2
```

### Managment Server (about 5 minutes)
Once that's done we can spin up the management server
```bash
kubectl apply -f opdk-manifests/ms.yaml
## and now watch it while it comes up
kubectl logs -f ms-0
```

### The RMPs (2 mins)
Now let's setup the RMPs
```bash
kubectl apply -f opdk-manifests/rmp-no-sts.yaml
```

### QPID (2 mins)
Qpidd
```bash
kubectl apply -f opdk-manifests/qs.yaml
```

### Postgres (this part needs to be done in steps)
For postgres we have to do things in an odd order to get it all straight.
We start with the postgres **slave**
```bash
kubectl apply -f opdk-manifests/ps-slave.yaml
```
That sets up a postgres alone instance via the `pdb` profile.

Now we can move on to the master
```bash
kubectl apply -f opdk-manifests/ps-master.yaml
```

Finally, we run the ps profile on the slave to finish the installation
```bash
kubectl exec -ti ps-slave-0 --  bash -c 'sudo HOSTIP="$(hostname).psslavehs.default.svc.cluster.local" /opt/apigee/apigee-setup/bin/setup.sh -p ps -f /config/opdk-ds-cluster.config'
```

### The org
Let's validate the install and onboard the org
```bash
kubectl exec -ti ms-0 --  bash -c '/opt/apigee/apigee-service/bin/apigee-service apigee-validate install'
kubectl exec -ti ms-0 --  bash -c '/opt/apigee/apigee-service/bin/apigee-service apigee-validate setup -f /org/org.config'
kubectl exec -ti ms-0 --  bash -c '/opt/apigee/apigee-service/bin/apigee-service apigee-provision setup-org -f /org/org.config'
```

### Bounce the ui
```bash
kubectl exec -ti ms-0 --  bash -c '/opt/apigee/apigee-service/bin/apigee-service edge-ui restart'
```

### Enjoy
Now you can use your environment for fun and profit

## Kill it all and wipe it
First we delete all the pods
```bash
kubectl delete -f opdk-manifests/
```

Next remove all the persisten volume claims
```bash
kubectl delete --all pvc
```

Finally remove all of the configmaps
```bash
kubectl delete --all configmap
```

### create ingress
First of all you'll need to edit ingress-frontend and update the host with one you think makes sense.... With that done you'll need to update the org.config configmap and recreate it so that when you create the org the vhost will be all setup
```bash
kubectl apply -f ingress-manifests/
```

### and now setup the org
```bash
kubectl exec -ti ms-0 --  bash
#/opt/apigee/apigee-service/bin/apigee-service apigee-provision setup-org /org/org.config
#and then get out
```

## Another update
log in and test :)... If you delete an individual datastore pod you'll need to restart the zookeeper process on the other pods once k8s restarts the one  you deleted. I've tested this and it does seem to work.
