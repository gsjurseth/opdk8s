tag = 0.3

image:
	docker build -t nodejs-server:$(tag) .

tag:
	docker tag nodejs-server:$(tag) eu.gcr.io/apigee-trashcan-backends/nodejs-server:$(tag)

push: image tag
	docker push eu.gcr.io/apigee-trashcan-backends/nodejs-server:$(tag)

