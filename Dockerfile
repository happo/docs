FROM node:14

WORKDIR /app/website

COPY ./website/package.json ./website/yarn.lock /app/website/
RUN yarn install

COPY ./website /app/website

RUN yarn build

EXPOSE 3344

CMD ["yarn", "start", "--no-watch", "--port", "3344"]
