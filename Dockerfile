# Build stage: installs everything, builds the site, and bundles the server.
FROM node:24-slim AS build

ENV PNPM_HOME="/pnpm"
ENV PATH="${PNPM_HOME}:${PATH}"

RUN npm install -g pnpm@11

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml /app/
RUN pnpm install --frozen-lockfile

COPY . /app/

# Bundling server.mjs means the runtime image doesn't need node_modules.
RUN pnpm build \
    && pnpm exec esbuild server.mjs --bundle --platform=node --format=cjs \
        --outfile=server.cjs

# Runtime stage: only Node, the built site, and the bundled server. Distroless
# has no shell or package manager, so the entrypoint is already `node`.
FROM gcr.io/distroless/nodejs24-debian12

WORKDIR /app

COPY --from=build /app/build /app/build
COPY --from=build /app/server.cjs /app/server.cjs

# Run as a non-root user. Distroless has no useradd, so use the ids directly.
ARG uid=950
ARG gid=950
USER ${uid}:${gid}

EXPOSE 3344

CMD ["server.cjs"]
