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

const dsSvc = {
    "apiVersion": "v1",
    "kind": "Service",
    "metadata": {
      "labels": {
        "app": "ds"
      },
      "name": "dshs"
    },
    "spec": {
      "clusterIP": "None",
      "ports": [
        {
          "name": "client",
          "port": 2181
        },
        {
          "name": "server",
          "port": 2888
        },
        {
          "name": "leader-election",
          "port": 3888
        },
        {
          "name": "jmx",
          "port": 7199
        },
        {
          "name": "internode-comms",
          "port": 7000
        },
        {
          "name": "cql",
          "port": 9042
        },
        {
          "name": "thrift",
          "port": 9160
        }
      ],
      "selector": {
        "app": "ds"
      }
    }
  };

const dsPvc =  {
    "apiVersion": "policy/v1beta1",
    "kind": "PodDisruptionBudget",
    "metadata": {
      "name": "ds-pdb"
    },
    "spec": {
      "maxUnavailable": 1,
      "selector": {
        "matchLabels": {
          "app": "ds"
        }
      }
    }
  };

const dsPod = {
    "apiVersion": "apps/v1",
    "kind": "StatefulSet",
    "metadata": {
      "name": "ds"
    },
    "spec": {
      "podManagementPolicy": "Parallel",
      "replicas": 3,
      "selector": {
        "matchLabels": {
          "app": "ds"
        }
      },
      "serviceName": "dshs",
      "template": {
        "metadata": {
          "labels": {
            "app": "ds"
          }
        },
        "spec": {
          "affinity": {
            "podAntiAffinity": {
              "requiredDuringSchedulingIgnoredDuringExecution": [
                {
                  "labelSelector": {
                    "matchExpressions": [
                      {
                        "key": "app",
                        "operator": "In",
                        "values": [
                          "ds"
                        ]
                      }
                    ]
                  },
                  "topologyKey": "kubernetes.io/hostname"
                }
              ]
            }
          },
          "containers": [
            {
              "command": [
                "sh",
                "-c",
                "sudo HOSTIP=\"$(hostname).dshs.default.svc.cluster.local\" /opt/apigee/apigee-setup/bin/setup.sh -p ds -f /config/opdk-ds-cluster.config && (for a in $(echo -e \"ds-0.dshs\nds-1.dshs\nds-2.dshs\" | fgrep -v $(hostname)) ; do echo \"trying $a\" ; curl -s -X POST http://$a:9999/zk ; done ; exit 0) && /localdaemon/zk-Keeper"
              ],
              "image": "eu.gcr.io/gsj-k8s-training/apigee-opdk:16",
              "imagePullPolicy": "Always",
              "livenessProbe": {
                "exec": {
                  "command": [
                    "sh",
                    "-c",
                    "netstat -anp | fgrep 9999 | fgrep LISTEN"
                  ]
                },
                "initialDelaySeconds": 180,
                "timeoutSeconds": 15
              },
              "name": "apigee-ds",
              "ports": [
                {
                  "containerPort": 2181,
                  "name": "client"
                },
                {
                  "containerPort": 2888,
                  "name": "server"
                },
                {
                  "containerPort": 3888,
                  "name": "leader-election"
                },
                {
                  "containerPort": 7199,
                  "name": "jmx"
                },
                {
                  "containerPort": 7000,
                  "name": "internode-comms"
                },
                {
                  "containerPort": 9042,
                  "name": "cql"
                },
                {
                  "containerPort": 9160,
                  "name": "thrift"
                }
              ],
              "resources": {
                "requests": {
                  "cpu": ".5",
                  "memory": ".5Gi"
                }
              },
              "volumeMounts": [
                {
                  "mountPath": "/opt/apigee/data",
                  "name": "datadir"
                },
                {
                  "mountPath": "/opt/apigee/var",
                  "name": "vardir"
                },
                {
                  "mountPath": "/config/opdk-ds-cluster.config",
                  "name": "configmap-volume",
                  "readOnly": true,
                  "subPath": "opdk-ds-cluster.config"
                },
                {
                  "mountPath": "/license/license.txt",
                  "name": "license-volume",
                  "readOnly": true,
                  "subPath": "license.txt"
                }
              ]
            }
          ],
          "securityContext": {
            "fsGroup": 998,
            "runAsUser": 999
          },
          "volumes": [
            {
              "configMap": {
                "defaultMode": 493,
                "name": "opdk-ds-cluster.config"
              },
              "name": "configmap-volume"
            },
            {
              "configMap": {
                "defaultMode": 493,
                "name": "license.config"
              },
              "name": "license-volume"
            }
          ]
        }
      },
      "updateStrategy": {
        "type": "RollingUpdate"
      },
      "volumeClaimTemplates": [
        {
          "metadata": {
            "name": "datadir"
          },
          "spec": {
            "accessModes": [
              "ReadWriteOnce"
            ],
            "resources": {
              "requests": {
                "storage": "10Gi"
              }
            }
          }
        },
        {
          "metadata": {
            "name": "vardir"
          },
          "spec": {
            "accessModes": [
              "ReadWriteOnce"
            ],
            "resources": {
              "requests": {
                "storage": "10Gi"
              }
            }
          }
        }
      ]
    }
  };

module.exports = async function (context) {
  let observed = context.request.body;
  //let desired = {status: {}, children: []};
  console.log('all of it: %j', context);
  console.log('The body: %j', observed);

  let dastuff = [ dsSvc, dsPvc, dsPod ];

  //  let observedRS = observed.children['ReplicaSet.extensions/v1beta1'];

  //  let service = observed.children['Service.v1'][bgd.spec.service.metadata.name];

  return {status: 200, body: dastuff, headers: {'Content-Type': 'application/json'}};
};
