# syntax=docker/dockerfile:1

FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache git
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# restore timestamps from commits so that nginx can build stable ETag and
# Last-Modified headers.
RUN COMMIT_TS=$(git log -1 --format=%ct HEAD) && \
    find build -exec touch -d "@$COMMIT_TS" {} + && \
    find docs -name '*.md' | while read -r src; do \
        rel="${src#docs/}"; \
        base=$(echo "${rel%.md}" | sed -E 's:(^|/)[0-9]+_:\1:g'); \
        ts=$(git log -1 --format=%ct -- "$src"); \
        for ext in html md html__data.json; do \
            for compr in '' .br .gz; do \
                out="build/${base}.${ext}${compr}"; \
                if [ -f "$out" ]; then touch -d "@$ts" "$out"; fi; \
            done; \
        done; \
    done

FROM alpine:3
RUN apk add --no-cache nginx nginx-mod-http-brotli
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/http.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
