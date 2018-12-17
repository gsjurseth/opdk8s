# Initial experiments to get opdk running
so basically I did the following

 * built a docker with apigee-setup installed and ready
 * published said docker to my project gcr
 * created a cluster with 5 nodes
 * created a spec which updates some requirements (lower the mem and cpu reqs for ZK)
 * deployed a stateful set and watched
--- updates
 * added a few more configmaps to handle license file and hardware_requirements.properties
 * changed profile to ds: this is now working
 * added a sts for profile ms which is now working

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
What I have here is a statefulset which I've copied from the example on kubernete's own homepage. It's not working but it *is* successfully setting up domain names that resolve between the hosts... ZooKeeper refuses to see them as valid domain names which I don't understand, but working they are...

I have a 5 node config set as a configmap which I create like so:
```bash
kubectrl create configmap node.config --from-file=5-node.config
```
I also have overridden the hardware requirements and added license file like so:
```bash
kubectl create configmap hwreqs.config --from-file=hardware_requirements.properties
kubectl create configmap license.config --from-file=../../license.txt
```

And then i'm ready to just fire off the statefulset

### datastore
```bash
kubectl apply -f opdk-manifests/ds.yaml
```
### management-server
```bash
kubectl apply -f opdk-manifests/ms.yaml
```

You'll notice in the spec I've defined a livenessProbe and a readinessProbe. It seems that kubedns auto assigns the ip's once those work .. which is why i've set them up the way I have.

It may be that I just need to bounce each node once this is done ..... I'm about to try that but wanted to get my stuff checked in for y'alls perusal.


***** UPDATE *****
Confirmed... bouncing them all in their running containers makes them work
