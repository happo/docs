FROM node:20.10.0

WORKDIR /app

COPY ./package.json ./yarn.lock /app/
RUN yarn install

COPY ./ /app/

RUN yarn build

EXPOSE 3344

CMD ["yarn", "serve", "--port", "3344"]
