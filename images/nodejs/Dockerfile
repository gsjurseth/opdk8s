FROM node:8
COPY server.js /node/
WORKDIR /node
RUN apt update
RUN apt install curl net-tools -y
RUN npm i properties-reader node-fetch lodash
ENTRYPOINT ["node", "/node/server.js"]
