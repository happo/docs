FROM node:22-slim

WORKDIR /app

# Set up a non-root user to run as
ARG user=pod_user
ARG group=pod_user
ARG uid=950
ARG gid=950
RUN groupadd --gid ${gid} ${group} \
    && useradd --uid ${uid} \
        --gid ${gid} ${user} \
        --system \
        --shell /bin/sh \
        --create-home --home-dir /home/${user} \
    && chown --recursive ${user}:${group} /tmp /app /home/${user}

# Switch to the non-root user
USER ${user}

COPY --chown=${user}:${group} package.json yarn.lock /app/
RUN yarn install

COPY --chown=${user}:${group} . /app/

RUN yarn build

EXPOSE 3344

CMD ["yarn", "serve", "--port", "3344"]
