FROM node:24-slim

ENV PNPM_HOME="/pnpm"
ENV PATH="${PNPM_HOME}:${PATH}"

RUN npm install -g pnpm@11 \
    && rm -rf /tmp/node-compile-cache

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

COPY --chown=${user}:${group} package.json pnpm-lock.yaml pnpm-workspace.yaml /app/
# ffmpeg is only used by the docs media tooling (see media/README.md), so drop
# its ~45 MB binary in the same layer it's installed in.
RUN pnpm install --frozen-lockfile \
    && rm -f node_modules/ffmpeg-static/ffmpeg

COPY --chown=${user}:${group} . /app/

RUN pnpm build

EXPOSE 3344

CMD ["pnpm", "serve", "--host", "0.0.0.0", "--port", "3344"]
