FROM node:22-bookworm-slim

ARG SIGNAL_CLI_VERSION=0.14.7
ARG SIGNAL_CLI_SHA256=0fe065294adcf35df4c249b635d0ce57de7765d4fec660bffaa2e7f0549d4e5f

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl gosu \
    && curl -fsSL "https://github.com/AsamK/signal-cli/releases/download/v${SIGNAL_CLI_VERSION}/signal-cli-${SIGNAL_CLI_VERSION}-Linux-native.tar.gz" -o /tmp/signal-cli.tar.gz \
    && echo "${SIGNAL_CLI_SHA256}  /tmp/signal-cli.tar.gz" | sha256sum -c - \
    && tar -xzf /tmp/signal-cli.tar.gz -C /usr/local/bin \
    && chmod 0755 /usr/local/bin/signal-cli \
    && rm -f /tmp/signal-cli.tar.gz \
    && apt-get purge -y --auto-remove curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force
COPY server.mjs ./
COPY signal-cli-updater.mjs ./
COPY public ./public
COPY docker-entrypoint.sh /usr/local/bin/cloudphone-signal-entrypoint

RUN mkdir -p /data/signal-cli /data/app \
    && chown -R node:node /data /app \
    && chmod 0755 /usr/local/bin/cloudphone-signal-entrypoint

ENV NODE_ENV=production PORT=8080 DATA_DIR=/data
VOLUME ["/data"]
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD node -e "fetch('http://127.0.0.1:8080/healthz').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
ENTRYPOINT ["cloudphone-signal-entrypoint"]
CMD ["node", "server.mjs"]
