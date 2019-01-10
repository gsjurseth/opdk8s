#!/bin/bash

source /config/opdk-ds-cluster.config

MY_MP_UUID=$(curl -s http://0:8082/v1/servers/self | fgrep uUID | awk -F '"' '{print $4}')
MY_R_UUID=$(curl -s http://0:8081/v1/servers/self | fgrep uUID | awk -F '"' '{print $4}')


echo "adding router to configuration"
curl -v -u $ADMIN_EMAIL:$APIGEE_ADMINPW \
  -X POST http://$MSIP:8080/v1/regions/${REGION}/pods/${MP_POD}/servers \
  -d "action=add&uuid=${MY_R_UUID}&type=router"

echo "adding mp to configuration"
curl -v -u $ADMIN_EMAIL:$APIGEE_ADMINPW \
  -H "Content-Type: application/x-www-form-urlencoded" -X POST \
  "http://${MSIP}:8080/v1/o/VALIDATE/e/test/servers" \
  -d "action=add&uuid=${MY_MP_UUID}"

curl -v -u $ADMIN_EMAIL:$APIGEE_ADMINPW \
  -H "Content-Type: application/x-www-form-urlencoded" -X POST \
  "http://${MSIP}:8080/v1/o/acme/e/prod/servers" \
  -d "action=add&uuid=${MY_MP_UUID}"
