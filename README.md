# OPDK8S
This is an attempt to create a robust and easy setup for running apigee opdk inside of kubernets

# Prerequisites
There are, alas, a few requirements before you can just get up and running. This software is, after all, licensed and so you'll need to build the docker images and then update the image location in all of the spec files.

## A k8s cluster
This should go without saying, really... You're going to need a k8s cluster to make this work. I recommend at a minimum using a 3-node cluster with 4core and 16gb of ram per node.

## Building the docker images
In addition to building the apigee docker image you'll also need to build a custom metacontroller-nodejs image. I'm using nodejs for all of the operator-controllers and have added a few npm-libs to make development easier.

### The nodejs docker image
I've copied the metacontroller nodejs examle into my own repository here and updated it just a bit to get it working.

So let's first go to where this is:
```bash
cd images/nodejs
```

You'll want to update the Makefile. Set the version (if it's your first time you can set it 0.1) and container registry as appropriate.

To get this setup you'll be able to simply do the following:
```bash
make push
```

That should build, tag, and push it to where it belongs. Now update this spec with the appropriate url and version:
`basicsetup/controllers/controller-deployment.yaml`

### The apigee docker image
Now we can update this image. The docker build process will copy over a simple zookeeper daemon into the image and download and setup the bootstrap for the apigee installation. Doing the following should get you setup.

NOTE: You'll need to enter your own user and pass as these are passed to the bootstrap script to get everything setup

```bash
cd images/apigee-opdk
docker build -t apigee-ds . --build-arg user=<userUser> --build-arg pass=<yourPass>
```

With that done we can tag and upload to the gcr (you'll need to update this with your own details):

```bash
docker tag apigee-opdk eu.gcr.io/gsj-k8s-training/apigee-opdk:6
docker push eu.gcr.io/gsj-k8s-training/apigee-opdk:6
```

Finally, with all this done you're going to need to update the image in all spec.json files located here:

`basicsetup/tplconfigs`

I realize this part sucks... This is low hanging fruit for easy improvement for someone so inclined.

## The license
This setup needs a license file. Get yours and make note of the file location. We're going to use when we setup the planet.

# Playbooks
I've divided this into two sections: the planet itself and the org (plus all environments). At this point and time only the planet is finished. The org is coming along quickly, however, and I expect to have it done in the coming days.

## Setup the basics
To make this as easy as possible i've included a setup script that should do nearly all the work. So, to get this kicked off you'll need to run the following and replace `license.txt` with the path to your own license file.

```bash
basicsetup/runBasicSetup.sh -u <yourk8suser> -d <yourk8sdomain> -l license.txt -c setup-all
```

This will create all metacontroller pieces, create the apigee ns, all controllers needed for apigee, and even create a configmap for your license file. With this in place you can now create a planet.

## Creating a planet
Finally, we can create our planet. Edit the file in `concreteApigeePlanet/apigeeplanet.yaml` and set your admin-user and pass as appropriate. Now apply that file:

```bash
kubectl apply -n apigee -f concreateApigeePlanet/apigeeplanet.yaml
```

You can monitor the status of bits and pieces coming up by simply grabbing the pods from the apigee name space like so

```bash
kubectl -n apigee get pods
```

# Development
Most of the work for development is really done through the controllers themselves

## The hooks
You'll notice that there is a `src` directory here. I've symlinked the hooks from `basicsetup/hooks/*.js` so that we can build tests with chai/mocha here. This makes it much easier to try and work on logic for the controllers themselves (and they're what's really doing all the work).

## Trying out new things
Once this is done you don't have to tear everything down again. You can actually update the hooks and controllers by simply running the following:

```bash
basicsetup/runBasicSetup.sh -u <yourk8suser> -d <yourk8sdomain> -l license.txt -c update-hooks
```

this will recreate the controllers, crds, and hooks without actually removing your planet.

## Logs
Obviously you're going to need to look at logs while working on this. I typically log the controllers in the `metacontroller` namespace while working on new functionality.