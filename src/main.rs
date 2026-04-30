use axum::{
    extract::DefaultBodyLimit,
    http::{header, StatusCode},
    response::{Html, IntoResponse, Response},
    Router,
};
use mime_guess::from_path;
use rust_embed::Embed;
use std::sync::Arc;
use tower_governor::{governor::GovernorConfigBuilder, GovernorLayer};
use tower_governor::key_extractor::SmartIpKeyExtractor;
use tower_http::compression::CompressionLayer;

// Svelte-Build-Output wird zur Compile-Zeit eingebettet.
// `frontend/dist/` muss beim `cargo build` existieren (siehe Dockerfile).
#[derive(Embed)]
#[folder = "frontend/dist/"]
struct Assets;

#[tokio::main]
async fn main() {
    let governor_conf = Arc::new(
        GovernorConfigBuilder::default()
            .per_second(160)
            .burst_size(320)
            .key_extractor(SmartIpKeyExtractor)
            .finish()
            .expect("Governor config invalid")
    );

    let app = Router::new()
        .fallback(spa_handler)
        .layer(DefaultBodyLimit::max(1024))      // axum 0.8: direkt am Router
        .layer(
    CompressionLayer::new()
        .br(true)
        .gzip(false)    // Fallback für ältere Clients
        .zstd(false)
        .deflate(false)
)          // brotli, gzip, zstd
        .layer(GovernorLayer::new(governor_conf.clone()));

    let listener = tokio::net::TcpListener::bind("0.0.0.0:8080").await.unwrap();
    println!("Listening on {}", listener.local_addr().unwrap());

    // Erweitere axum::serve um .into_make_service_with_connect_info, damit
    // auch Verbindungs-IPs ohne Forwarded-Headers erfasst werden können.
    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<std::net::SocketAddr>()
    )
        .with_graceful_shutdown(shutdown_signal())
        .await
        .unwrap();
}

async fn spa_handler(uri: axum::http::Uri) -> Response {
    let path = uri.path().trim_start_matches('/');

    if let Some(content) = Assets::get(path) {
        let mime = from_path(path).first_or_octet_stream();
        let cache = if path.starts_with("assets/") {
            "public, max-age=31536000, immutable" // Vite-gehashte Assets
        } else {
            "no-cache"
        };
        return (
            StatusCode::OK,
            [
                (header::CONTENT_TYPE, mime.as_ref()),
                (header::CACHE_CONTROL, cache),
            ],
            content.data,
        )
            .into_response();
    }

    // SPA-Fallback → index.html
    let index = Assets::get("index.html").expect("index.html not embedded");
    Html(String::from_utf8_lossy(&index.data).into_owned()).into_response()
}

async fn shutdown_signal() {
    tokio::signal::ctrl_c().await.expect("failed to listen for ctrl_c");
    println!("Shutting down gracefully…");
}