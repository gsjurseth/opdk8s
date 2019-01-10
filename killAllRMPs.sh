for a in $(curl -v -u opdk@google.com:Simple123 "http://0:8080/v1/servers?pod=gateway" | fgrep -A 1 'type" : [ "router' | fgrep uUID | awk -F'"' '{print $4}')
do
  curl -u opdk@google.com:Simple123 \
      -X POST http://0:8080/v1/o/VALIDATE/e/test/servers \
      -d "uuid=${a}&region=dc-1&pod=gateway&action=remove"

  curl -u opdk@google.com:Simple123 \
    -X POST http://0:8080/v1/servers \
    -d "type=router&region=dc-1&pod=gateway&uuid=${a}&action=remove"

  curl -u opdk@google.com:Simple123 -X DELETE http://0:8080/v1/servers/${a}
done

for a in $(curl -v -u opdk@google.com:Simple123 "http://0:8080/v1/servers?pod=gateway" | fgrep -A 1 'type" : [ "message' | fgrep uUID | awk -F'"' '{print $4}')
do
  curl -u opdk@google.com:Simple123 \
      -X POST http://0:8080/v1/o/VALIDATE/e/test/servers \
      -d "uuid=${a}&region=dc-1&pod=gateway&action=remove"

  curl -u opdk@google.com:Simple123 \
    -X POST http://0:8080/v1/servers \
    -d "type=message-processor&region=dc-1&pod=gateway&uuid=${a}&action=remove"

  curl -u opdk@google.com:Simple123 -X DELETE http://0:8080/v1/servers/${a}
done

for a in $(curl -v -u opdk@google.com:Simple123 "http://0:8080/v1/servers?pod=gateway" | fgrep -A 1 'type" : [ ]' | fgrep uUID | awk -F'"' '{print $4}')
do
  curl -u opdk@google.com:Simple123 -X DELETE http://0:8080/v1/servers/${a}
done
