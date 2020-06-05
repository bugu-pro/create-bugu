FROM node:10.21-alpine3.11 as nodeImage
LABEL maintainer Viccsen<lianghuang.vic@gmail>

WORKDIR /app

COPY package.json .
RUN npm install --registry=https://registry.npm.taobao.org

COPY . .
RUN npm run build

FROM nginx:stable-alpine
COPY --from=nodeImage ./app/dist/ /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
