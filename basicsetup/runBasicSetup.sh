#!/bin/bash

BASE=$(dirname $0)

TMPDIR=/tmp/tmp.$$

mkdir -p $TMPDIR

function finish() {
  echo "cleaning up temp resources" >&2
  rm -rf $TMPDIR
  exit
}

function doHelp() {
  echo "$0 [-u user -d domain] -l /path/to/license -c [clean-all|clean-mc|clean-apigee|setup-all|setup-apigee|setup-mc]" >&2
  finish
}

trap finish SIGINT SIGQUIT SIGTSTP SIGTERM

while getopts "hu:d:c:l:x" arg; do
  case $arg in
    h)
      doHelp
    ;;
    u)
      user=$OPTARG
    ;;
    d)
      domain=$OPTARG
    ;;
    c)
      cmd=$OPTARG
    ;;
    x)
      skipdelete=true
    ;;
    l)
      license=$OPTARG
    ;;
  esac
done


function cleanMC() {
  echo "cleaning metacontroller" >&2
  kubectl -n metacontroller delete pod --all
  kubectl -n metacontroller delete cm --all
  kubectl -n metacontroller delete svc --all
  kubectl -n metacontroller delete compositecontroller --all
  kubectl delete crd controllerrevisions.metacontroller.k8s.io
  kubectl delete crd decoratorcontrollers.metacontroller.k8s.io
  kubectl delete crd compositecontrollers.metacontroller.k8s.io
  kubectl delete crd catsets.ctl.enisoc.com
  kubectl delete ns metacontroller
}

function cleanApigee() {
  echo "cleaning apigee" >&2
  kubectl delete -f $BASE/controllers
  kubectl -n apigee delete pod --all
  kubectl -n apigee delete compositecontroller apigeeplanet-controller
  kubectl -n apigee delete compositecontroller datastore-controller
  kubectl -n apigee delete compositecontroller managementserver-controller
  kubectl -n apigee delete cm --all
  kubectl -n metacontroller delete cm hooks
  kubectl -n metacontroller delete cm tplconfigs
  kubectl -n apigee delete svc --all
  kubectl -n apigee delete pvc --all
  kubectl -n apigee delete pv --all
  kubectl delete -f $BASE/crds
  kubectl delete ns apigee
}

function setupMetacontroller() {
  echo "setting up metacontroller" >&2
  if [ -z $user ] || [ -z $domain ]
  then
    echo "you must set both <user> and <domain> if the setup of metacontroller is included" >&2
    doHelp
  fi

  kubectl create clusterrolebinding ${user}-cluster-admin-binding --clusterrole=cluster-admin --user=${user}@${domain}
  # Create metacontroller namespace.
  kubectl create namespace metacontroller
  # Create metacontroller service account and role/binding.
  kubectl apply -f https://raw.githubusercontent.com/GoogleCloudPlatform/metacontroller/master/manifests/metacontroller-rbac.yaml
  # Create CRDs for Metacontroller APIs, and the Metacontroller StatefulSet.
  kubectl apply -f https://raw.githubusercontent.com/GoogleCloudPlatform/metacontroller/master/manifests/metacontroller.yaml

  ## why in the hell is this not possible without this ridiculous work around?
  curl -q https://raw.githubusercontent.com/GoogleCloudPlatform/metacontroller/master/examples/catset/sync.js -o $TMPDIR/sync.js
  kubectl create configmap catset-controller -n metacontroller --from-file=$TMPDIR/sync.js
  kubectl apply -f https://raw.githubusercontent.com/GoogleCloudPlatform/metacontroller/master/examples/catset/catset-controller.yaml
}

function setupApigee() {
  if [ -z $license ]
  then
    echo "you must include <license> if you're running apigeesetup" >&2
    doHelp
  fi
  echo "setting up apigee" >&2
  kubectl create ns apigee
  kubectl apply -f $BASE/crds

  ## CM for use with the apigee controllers
  kubectl -n metacontroller create cm hooks --from-file=$BASE/hooks
  kubectl -n metacontroller create cm tplconfigs --from-file=$BASE/tplconfigs

  ## CM for use with apigee itself
  kubectl -n apigee create cm apigee-license --from-file=$license
  kubectl -n metacontroller apply -f $BASE/controllers
}

### The main bits, yo
if [ -z $cmd ]
then
  echo "you simply must include a command" >&2
  doHelp
fi

case $cmd in
  clean-all)
    cleanApigee
    cleanMC
  ;;
  clean-mc)
    cleanMC
  ;;
  clean-apigee)
    cleanApigee
  ;;
  setup-all)
    if [ -z skipdelete ]
    then
      cleanApigee
      cleanMC
    fi
    setupMetacontroller
    setupApigee
  ;;
  setup-mc)
    if [ -z skipdelete ]
    then
      cleanMC
    fi
    setupMetacontroller
  ;;
  setup-apigee)
    if [ skipdelete != "true" ]
    then
      echo "skipdelete is $skipdelete"
      cleanApigee
    fi
      echo "skipdelete is $skipdelete"
    setupApigee
  ;;
esac


finish
