# syntax=docker/dockerfile:1
# ↑ Explizit: aktiviert alle BuildKit-Features (cache mounts, bind mounts, heredocs)

# ─── Stage 1: Svelte bauen ────────────────────────────────────────────────────
FROM oven/bun:1-alpine AS frontend
WORKDIR /app
COPY frontend/package.json frontend/bun.lock* ./
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile
COPY frontend/ ./
RUN bun run build
# Output: /app/dist/

# ─── Stage 2: Rust binary (musl = statisch gelinkt) ───────────────────────────
FROM rust:1-alpine AS builder
RUN apk add --no-cache musl-dev
RUN rustup target add x86_64-unknown-linux-musl
WORKDIR /app

# Dep-Caching: Cargo registry + git + target/ persistent über Builds hinweg
# → bei reinen src-Änderungen werden Deps nicht neu compiliert
COPY Cargo.toml Cargo.lock ./
RUN mkdir src && echo 'fn main(){}' > src/main.rs
RUN --mount=type=cache,target=/usr/local/cargo/registry,sharing=locked \
    --mount=type=cache,target=/usr/local/cargo/git,sharing=locked \
    --mount=type=cache,target=/app/target,sharing=locked \
    cargo build --release --target x86_64-unknown-linux-musl

# Svelte-Build einbetten + echten main.rs bauen
COPY --from=frontend /app/dist ./frontend/dist/
COPY src/ ./src/
RUN --mount=type=cache,target=/usr/local/cargo/registry,sharing=locked \
    --mount=type=cache,target=/usr/local/cargo/git,sharing=locked \
    --mount=type=cache,target=/app/target,sharing=locked \
    touch src/main.rs && \
    cargo build --release --target x86_64-unknown-linux-musl && \
    cp target/x86_64-unknown-linux-musl/release/spa-server /spa-server

# ─── Stage 3: Scratch — nur das Binary ────────────────────────────────────────
FROM scratch
COPY --from=builder /spa-server /app
EXPOSE 8080
ENTRYPOINT ["/app"]