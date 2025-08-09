#pragma once

#include <spdlog/spdlog.h>
#include <spdlog/sinks/stdout_color_sinks.h>
#include <nlohmann/json.hpp>
#include <cstdlib>
#include <string>
#include <memory>

namespace sonet::logging {

inline spdlog::level::level_enum parse_level_from_env(const char* env_key, spdlog::level::level_enum fallback) {
    const char* value = std::getenv(env_key);
    if (!value) return fallback;
    std::string s(value);
    for (auto& c : s) c = static_cast<char>(std::tolower(c));
    if (s == "trace") return spdlog::level::trace;
    if (s == "debug") return spdlog::level::debug;
    if (s == "info") return spdlog::level::info;
    if (s == "warn" || s == "warning") return spdlog::level::warn;
    if (s == "error") return spdlog::level::err;
    if (s == "critical" || s == "fatal") return spdlog::level::critical;
    return fallback;
}

inline std::shared_ptr<spdlog::logger> init_json_stdout_logger(const std::string& service_name_env = "SERVICE_NAME",
                                                               const std::string& log_level_env = "LOG_LEVEL",
                                                               const std::string& environment_env = "ENVIRONMENT") {
    auto sink = std::make_shared<spdlog::sinks::stdout_color_sink_mt>();
    auto logger = std::make_shared<spdlog::logger>("sonet", sink);
    spdlog::set_default_logger(logger);

    auto level = parse_level_from_env(log_level_env.c_str(), spdlog::level::info);
    spdlog::set_level(level);

    // Use simple message, we will produce JSON manually in helper functions
    spdlog::set_pattern("%v");

    return logger;
}

inline void log_json(spdlog::level::level_enum level,
                     const std::string& message,
                     const nlohmann::json& extra = {}) {
    nlohmann::json j;
    const char* svc = std::getenv("SERVICE_NAME");
    const char* env = std::getenv("ENVIRONMENT");

    j["service"] = svc ? svc : "unknown";
    j["environment"] = env ? env : "development";
    j["level"] = spdlog::level::to_string_view(level);
    j["message"] = message;
    for (auto it = extra.begin(); it != extra.end(); ++it) {
        j[it.key()] = it.value();
    }

    switch (level) {
        case spdlog::level::trace: spdlog::trace(j.dump()); break;
        case spdlog::level::debug: spdlog::debug(j.dump()); break;
        case spdlog::level::info: spdlog::info(j.dump()); break;
        case spdlog::level::warn: spdlog::warn(j.dump()); break;
        case spdlog::level::err: spdlog::error(j.dump()); break;
        case spdlog::level::critical: spdlog::critical(j.dump()); break;
        default: spdlog::info(j.dump()); break;
    }
}

} // namespace sonet::logging