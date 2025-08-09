/*
 * Copyright (c) 2025 Neo Qiss
 * 
 * This file is part of Sonet - a social media platform built for real connections.
 * 
 * This is the main entry point for the notification service.
 * I built this as a production-ready service runner that handles
 * configuration, logging, signal handling, and graceful shutdown.
 */

#include "service.h"
#include <iostream>
#include "../../core/logging/logger.h"
#include <csignal>
#include <memory>
#include <thread>
#include <chrono>
#include <cstdlib>
#include <fstream>

using namespace sonet::notification_service;

// Global service instance for signal handling
static std::unique_ptr<NotificationService> g_service;
static std::atomic<bool> g_shutdown_requested{false};

/**
 * Signal handler for graceful shutdown
 * 
 * I set this up to handle SIGINT and SIGTERM signals,
 * allowing the service to shut down cleanly when requested.
 */
void signal_handler(int signal) {
    std::cout << "\nReceived signal " << signal << ", initiating graceful shutdown..." << std::endl;
    g_shutdown_requested = true;
    
    if (g_service) {
        g_service->stop();
    }
}

/**
 * Setup signal handlers for graceful shutdown
 */
void setup_signal_handlers() {
    std::signal(SIGINT, signal_handler);
    std::signal(SIGTERM, signal_handler);
    
    // Ignore SIGPIPE (broken pipes are handled by the networking code)
    std::signal(SIGPIPE, SIG_IGN);
}

/**
 * Print usage information
 */
void print_usage(const char* program_name) {
    std::cout << "Usage: " << program_name << " [OPTIONS]\n"
              << "\n"
              << "Sonet Notification Service - Real-time notification delivery\n"
              << "\n"
              << "Options:\n"
              << "  -c, --config FILE    Configuration file path\n"
              << "  -e, --env ENV        Environment (development, testing, production)\n"
              << "  -p, --port PORT      HTTP server port (default: 8081)\n"
              << "  -g, --grpc-port PORT gRPC server port (default: 50051)\n"
              << "  -w, --ws-port PORT   WebSocket server port (default: 8080)\n"
              << "  -h, --help           Show this help message\n"
              << "  -v, --version        Show version information\n"
              << "\n"
              << "Environment Variables:\n"
              << "  SONET_DB_URL         Database connection URL\n"
              << "  SONET_REDIS_URL      Redis connection URL\n"
              << "  SONET_JWT_SECRET     JWT secret for authentication\n"
              << "  SONET_SMTP_HOST      SMTP server hostname\n"
              << "  SONET_SMTP_USER      SMTP username\n"
              << "  SONET_SMTP_PASS      SMTP password\n"
              << "  SONET_FCM_KEY        FCM server key for push notifications\n"
              << "  SONET_LOG_LEVEL      Log level (debug, info, warn, error)\n"
              << "\n"
              << "Examples:\n"
              << "  " << program_name << " --config /etc/sonet/notification.json\n"
              << "  " << program_name << " --env production --port 8081\n"
              << "  " << program_name << " --env development\n"
              << std::endl;
}

/**
 * Print version information
 */
void print_version() {
    std::cout << "Sonet Notification Service v1.0.0\n"
              << "Copyright (c) 2025 Neo Qiss\n"
              << "Built for real connections and instant communication\n"
              << std::endl;
}

/**
 * Load configuration from various sources
 */
NotificationServiceConfig load_configuration(int argc, char* argv[]) {
    NotificationServiceConfig config;
    std::string config_file;
    std::string environment = "development";
    
    // Parse command line arguments
    for (int i = 1; i < argc; i++) {
        std::string arg = argv[i];
        
        if (arg == "-h" || arg == "--help") {
            print_usage(argv[0]);
            std::exit(0);
        } else if (arg == "-v" || arg == "--version") {
            print_version();
            std::exit(0);
        } else if ((arg == "-c" || arg == "--config") && i + 1 < argc) {
            config_file = argv[++i];
        } else if ((arg == "-e" || arg == "--env") && i + 1 < argc) {
            environment = argv[++i];
        } else if ((arg == "-p" || arg == "--port") && i + 1 < argc) {
            config.http_port = std::stoi(argv[++i]);
        } else if ((arg == "-g" || arg == "--grpc-port") && i + 1 < argc) {
            config.grpc_port = std::stoi(argv[++i]);
        } else if ((arg == "-w" || arg == "--ws-port") && i + 1 < argc) {
            config.websocket_port = std::stoi(argv[++i]);
        } else {
            std::cerr << "Unknown argument: " << arg << std::endl;
            print_usage(argv[0]);
            std::exit(1);
        }
    }
    
    // Load from config file if specified
    if (!config_file.empty()) {
        try {
            std::ifstream file(config_file);
            if (file.is_open()) {
                nlohmann::json config_json;
                file >> config_json;
                config = NotificationServiceConfig::from_json(config_json);
                std::cout << "Loaded configuration from: " << config_file << std::endl;
            } else {
                std::cerr << "Warning: Could not open config file: " << config_file << std::endl;
            }
        } catch (const std::exception& e) {
            std::cerr << "Error loading config file: " << e.what() << std::endl;
            std::exit(1);
        }
    }
    
    // Load from environment variables
    const char* db_url = std::getenv("SONET_DB_URL");
    if (db_url) {
        config.database_url = db_url;
    }
    
    const char* redis_url = std::getenv("SONET_REDIS_URL");
    if (redis_url) {
        config.redis_url = redis_url;
    }
    
    const char* jwt_secret = std::getenv("SONET_JWT_SECRET");
    if (jwt_secret) {
        config.jwt_secret = jwt_secret;
    }
    
    const char* smtp_host = std::getenv("SONET_SMTP_HOST");
    if (smtp_host) {
        config.smtp_host = smtp_host;
    }
    
    const char* smtp_user = std::getenv("SONET_SMTP_USER");
    if (smtp_user) {
        config.smtp_username = smtp_user;
    }
    
    const char* smtp_pass = std::getenv("SONET_SMTP_PASS");
    if (smtp_pass) {
        config.smtp_password = smtp_pass;
    }
    
    const char* fcm_key = std::getenv("SONET_FCM_KEY");
    if (fcm_key) {
        config.fcm_server_key = fcm_key;
    }
    
    // Set environment-specific defaults
    if (environment == "production") {
        config.enable_authentication = true;
        config.enable_rate_limiting = true;
        config.processor_worker_threads = 8;
        config.max_websocket_connections = 50000;
    } else if (environment == "development") {
        config.enable_authentication = false;
        config.enable_rate_limiting = false;
        config.processor_worker_threads = 2;
        config.max_websocket_connections = 1000;
    } else if (environment == "testing") {
        config.enable_authentication = false;
        config.enable_rate_limiting = false;
        config.processor_worker_threads = 1;
        config.max_websocket_connections = 100;
        config.enable_grpc = false;
        config.enable_http = true;
    }
    
    return config;
}

/**
 * Setup logging based on environment
 */
void setup_logging(const std::string& environment) {
    (void)environment;
    (void)sonet::logging::init_json_stdout_logger();
    spdlog::info(R"({"event":"startup","message":"Notification logging initialized"})");
}

/**
 * Validate configuration before starting service
 */
bool validate_configuration(const NotificationServiceConfig& config) {
    bool valid = true;
    
    // Check database configuration
    if (config.database_url.empty()) {
        std::cerr << "Error: Database URL is required" << std::endl;
        valid = false;
    }
    
    // Check Redis configuration if caching is enabled
    if (config.enable_caching && config.redis_url.empty()) {
        std::cerr << "Error: Redis URL is required when caching is enabled" << std::endl;
        valid = false;
    }
    
    // Check JWT secret if authentication is enabled
    if (config.enable_authentication && config.jwt_secret.empty()) {
        std::cerr << "Error: JWT secret is required when authentication is enabled" << std::endl;
        valid = false;
    }
    
    // Check port conflicts
    if (config.http_port == config.grpc_port || 
        config.http_port == config.websocket_port || 
        config.grpc_port == config.websocket_port) {
        std::cerr << "Error: Ports must be unique" << std::endl;
        valid = false;
    }
    
    return valid;
}

/**
 * Print startup banner
 */
void print_startup_banner(const NotificationServiceConfig& config) {
    std::cout << "\n";
    std::cout << "╔═══════════════════════════════════════════════════════════════╗\n";
    std::cout << "║                  Sonet Notification Service                  ║\n";
    std::cout << "║                     Version 1.0.0                           ║\n";
    std::cout << "║                Built for Real Connections                    ║\n";
    std::cout << "╚═══════════════════════════════════════════════════════════════╝\n";
    std::cout << "\n";
    std::cout << "Configuration:\n";
    std::cout << "  HTTP Server:    " << config.http_host << ":" << config.http_port << "\n";
    std::cout << "  gRPC Server:    " << config.grpc_host << ":" << config.grpc_port << "\n";
    std::cout << "  WebSocket:      " << config.websocket_host << ":" << config.websocket_port << "\n";
    std::cout << "  Database:       " << config.database_url << "\n";
    std::cout << "  Redis:          " << config.redis_url << "\n";
    std::cout << "  Workers:        " << config.processor_worker_threads << "\n";
    std::cout << "  Authentication: " << (config.enable_authentication ? "Enabled" : "Disabled") << "\n";
    std::cout << "  Rate Limiting:  " << (config.enable_rate_limiting ? "Enabled" : "Disabled") << "\n";
    std::cout << "\n";
}

/**
 * Monitor service health and print status updates
 */
void monitor_service_health(NotificationService& service) {
    std::thread monitor_thread([&service]() {
        while (!g_shutdown_requested.load() && service.is_running()) {
            try {
                nlohmann::json health = service.get_health_status();
                nlohmann::json metrics = service.get_service_metrics();
                
                // Print periodic status update
                std::cout << "[" << std::chrono::duration_cast<std::chrono::seconds>(
                    std::chrono::system_clock::now().time_since_epoch()).count() 
                    << "] Service healthy: " << (health["healthy"].get<bool>() ? "YES" : "NO")
                    << ", Active connections: " << service.get_active_connection_count()
                    << std::endl;
                
                // Sleep for 60 seconds
                std::this_thread::sleep_for(std::chrono::seconds{60});
                
            } catch (const std::exception& e) {
                std::cerr << "Health monitoring error: " << e.what() << std::endl;
                std::this_thread::sleep_for(std::chrono::seconds{60});
            }
        }
    });
    
    monitor_thread.detach();
}

/**
 * Main entry point
 */
int main(int argc, char* argv[]) {
    try {
        // Load configuration
        NotificationServiceConfig config = load_configuration(argc, argv);
        
        // Setup logging
        setup_logging(environment);

        // Enforce JWT secret in non-development environments
        if (environment != "development" && config.jwt_secret.empty()) {
            std::cerr << "JWT secret is required outside development" << std::endl;
            return 1;
        }
        
        // Validate configuration
        if (!validate_configuration(config)) {
            std::cerr << "Configuration validation failed" << std::endl;
            return 1;
        }
        
        // Print startup banner
        print_startup_banner(config);
        
        // Setup signal handlers
        setup_signal_handlers();
        
        // Create and start service
        std::cout << "Starting notification service..." << std::endl;
        g_service = NotificationServiceFactory::create_production(config);
        
        if (!g_service->start()) {
            std::cerr << "Failed to start notification service" << std::endl;
            return 1;
        }
        
        std::cout << "✅ Notification service started successfully!" << std::endl;
        std::cout << "Ready to deliver notifications with lightning speed ⚡" << std::endl;
        std::cout << "\nEndpoints:" << std::endl;
        std::cout << "  Health:     http://" << config.http_host << ":" << config.http_port << "/health" << std::endl;
        std::cout << "  Metrics:    http://" << config.http_host << ":" << config.http_port << "/metrics" << std::endl;
        std::cout << "  WebSocket:  ws://" << config.websocket_host << ":" << config.websocket_port << std::endl;
        std::cout << "  gRPC:       " << config.grpc_host << ":" << config.grpc_port << std::endl;
        std::cout << "\nPress Ctrl+C to shutdown gracefully\n" << std::endl;
        
        // Start health monitoring
        monitor_service_health(*g_service);
        
        // Wait for shutdown signal
        while (!g_shutdown_requested.load() && g_service->is_running()) {
            std::this_thread::sleep_for(std::chrono::milliseconds{100});
        }
        
        // Graceful shutdown
        std::cout << "Shutting down notification service..." << std::endl;
        g_service->stop();
        std::cout << "✅ Notification service stopped gracefully" << std::endl;
        
        return 0;
        
    } catch (const std::exception& e) {
        std::cerr << "Fatal error: " << e.what() << std::endl;
        return 1;
    } catch (...) {
        std::cerr << "Unknown fatal error occurred" << std::endl;
        return 1;
    }
}