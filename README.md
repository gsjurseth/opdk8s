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
 * added ingress and tested
 * tried killing off datastore pods to see if they'd autorecover (the Dockerbuild includes a change to the jvm's java.security file which should override the caching nature of the jvm ... but it does't seem to work)

# TODO
I need to automate a bit more and i need to find a way to have the k8s setup automagically detect issues with zookeeper and recover.... I will look into PodLifeCycle which I think will help

## Docker
So, I had to build the docker with the docker file you see below. I used this command to do so:
```bash
docker build -t apigee-ds . --build-arg user=<userUser> --build-arg pass=<yourPass>
```

With that done I gat it and upload it to gcr like so:
```bash
docker tag apigee-opdk eu.gcr.io/gsj-k8s-training/apigee-opdk:6
docker push eu.gcr.io/gsj-k8s-training/apigee-opdk:6
```

Now we're ready for the k8s part of this

## Kubernetes
What I have here is a statefulset which I've copied from the example on kubernete's own homepage. It's working and *is* successfully setting up domain names that resolve between the hosts... 

I have a 5 node config set as a configmap which I create like so:
```bash
kubectrl create configmap node.config --from-file=5-node.config
```
I also have setup config maps for the license and the organization config (Note .. license file not included in this org .. you'll need to refer to the path of your own license file)
```bash
kubectl create configmap license.config --from-file=../../license.txt
kubectl create configmap org.config --from-file=org.config
```

## Now setup the statefulset

### datastore
```bash
kubectl apply -f opdk-manifests/ds.yaml
```
### management-server
```bash
kubectl apply -f opdk-manifests/ms.yaml
```
### routers and message processors
```bash
kubectl apply -f opdk-manifests/rmp.yaml
```
### routers and message processors
```bash
kubectl apply -f opdk-manifests/rmp.yaml
```
## Now let's setup the ingress and create the org
You'll notice in the spec I've defined a livenessProbe and a readinessProbe. It seems that kubedns auto assigns the ip's once those work .. which is why i've set them up the way I have.

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
