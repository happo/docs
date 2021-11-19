FROM node:14

WORKDIR /app

COPY ./package.json ./yarn.lock /app/
RUN yarn install

COPY ./ /app/

RUN yarn build

EXPOSE 3344

CMD ["yarn", "start", "--no-watch", "--port", "3344"]
