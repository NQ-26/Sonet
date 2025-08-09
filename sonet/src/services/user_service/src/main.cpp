/*
 * Copyright (c) 2025 Neo Qiss
 * All rights reserved.
 * 
 * This software is proprietary and confidential.
 * Unauthorized copying, distribution, or use is strictly prohibited.
 */

#include "user_service.h"
#include <grpcpp/grpcpp.h>
#include <spdlog/spdlog.h>
#include "../../../core/logging/logger.h"
#include <csignal>
#include <memory>
#include <cstdlib>

// I always want clean shutdowns - no zombie processes on my watch
std::unique_ptr<grpc::Server> g_server;

static std::string getenv_or(const char* key, const std::string& def) {
    const char* v = std::getenv(key); return v ? std::string(v) : def;
}

void signal_handler(int signal) {
    if (signal == SIGINT || signal == SIGTERM) {
        spdlog::info("Received shutdown signal, gracefully stopping server...");
        if (g_server) { g_server->Shutdown(); }
    }
}

int main(int argc, char* argv[]) {
    // Initialize JSON logger for ELK ingestion
    (void)sonet::logging::init_json_stdout_logger();
    spdlog::info(R"({"event":"startup","message":"Starting Sonet User Service"})");
    
    // Set up signal handlers for graceful shutdown
    std::signal(SIGINT, signal_handler);
    std::signal(SIGTERM, signal_handler);
    
    try {
        const std::string grpc_address = getenv_or("GRPC_ADDRESS", "0.0.0.0:9090");
        
        // Create the service implementation
        sonet::user::UserServiceImpl service;
        
        // Build the gRPC server
        grpc::ServerBuilder builder;
        
        // Listen on the gRPC port without authentication (handled by API Gateway)
        builder.AddListeningPort(grpc_address, grpc::InsecureServerCredentials());
        
        // Register our service
        builder.RegisterService(&service);
        
        // Configure server settings for production load
        builder.SetMaxSendMessageSize(4 * 1024 * 1024);    // 4MB max send
        builder.SetMaxReceiveMessageSize(4 * 1024 * 1024); // 4MB max receive
        builder.SetMaxConcurrentRpcs(1000);                // Handle 1000 concurrent requests
        
        // Build and start the server
        g_server = builder.BuildAndStart();
        
        if (!g_server) {
            spdlog::error("Failed to start gRPC server");
            return 1;
        }
        
        spdlog::info("gRPC server listening on: {}", grpc_address);
        spdlog::info("Service health: OK");
        spdlog::info("Ready to handle authentication requests like a boss 💪");
        
        // Wait for the server to shutdown
        g_server->Wait();
        
    } catch (const std::exception& e) {
        spdlog::error("Fatal error in User Service: {}", e.what());
        return 1;
    }
    
    spdlog::info("User Service stopped gracefully");
    return 0;
}
