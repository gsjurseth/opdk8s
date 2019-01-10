#!/bin/bash

source /config/opdk-ds-cluster.config

MY_MP_UUID=$(curl -s http://0:8082/v1/servers/self | fgrep uUID | awk -F '"' '{print $4}')
MY_R_UUID=$(curl -s http://0:8081/v1/servers/self | fgrep uUID | awk -F '"' '{print $4}')


echo "removing from prod and VALIDATE environments"
curl -u $ADMIN_EMAIL:$APIGEE_ADMINPW \
  -X POST "http://$MSIP:8080/v1/o/acme/e/prod/servers" \
  -d "uuid=${MY_MP_UUID}&region=${REGION}&pod=${MP_POD}&action=remove"

curl -u $ADMIN_EMAIL:$APIGEE_ADMINPW \
  -X POST "http://$MSIP:8080/v1/o/VALIDATE/e/test/servers" \
  -d "uuid=${MY_MP_UUID}&region=${REGION}&pod=${MP_POD}&action=remove"

echo "removing mp from region and pod"
curl -u $ADMIN_EMAIL:$APIGEE_ADMINPW \
  -X POST "http://$MSIP:8080/v1/servers" \
  -d "type=message-processor&region=${REGION}&pod=${MP_POD}&uuid=${MY_MP_UUID}&action=remove"

echo "removing router from region and pod"
curl -u $ADMIN_EMAIL:$APIGEE_ADMINPW \
  -X POST "http://$MSIP:8080/v1/servers" \
  -d "type=router&region=${REGION}&pod=${MP_POD}&uuid=${MY_R_UUID}&action=remove"

sleep 1


echo "deleting the node completely"
echo "First the router"
curl -u $ADMIN_EMAIL:$APIGEE_ADMINPW -X DELETE "http://$MSIP:8080/v1/servers/${MY_R_UUID}"
sleep 1
echo "And now the message processor"
curl -u $ADMIN_EMAIL:$APIGEE_ADMINPW -X DELETE "http://$MSIP:8080/v1/servers/${MY_MP_UUID}"
