//
// Copyright (c) 2025 Neo Qiss
// All rights reserved.
//
// This software is proprietary and confidential.
// Unauthorized copying, distribution, or use is strictly prohibited.
//

#include "service.h"

#include <grpcpp/grpcpp.h>
#include <iostream>
#include "../../core/logging/logger.h"

using grpc::Server;
using grpc::ServerBuilder;

int main(int argc, char** argv) {
	(void)argc; (void)argv;
	(void)sonet::logging::init_json_stdout_logger();
	spdlog::info(R"({"event":"startup","message":"Starting Sonet Media Service"})");
	// Natural comments: tune via env/flags later; good defaults for dev
	std::string listen_addr = "0.0.0.0:50053"; // avoid clashing with other services
	std::string local_store_dir = "/tmp/sonet-media";
	std::string local_base_url = "file:///tmp/sonet-media"; // placeholder URL scheme
	uint64_t max_upload = 200ULL * 1024ULL * 1024ULL; // 200MB
	if (const char* e = std::getenv("SONET_MEDIA_MAX_UPLOAD")) { try { uint64_t v = std::stoull(e); if (v>0) max_upload = v; } catch(...) {} }

	// Optional Postgres repository via env SONET_MEDIA_PG
	const char* pg = std::getenv("SONET_MEDIA_PG");
	std::shared_ptr<sonet::media_service::MediaRepository> repo;
	if (pg) {
		auto r = sonet::media_service::CreatePostgresRepo(pg);
		if (r) repo.reset(r.release());
	}
	if (!repo) {
		repo.reset(sonet::media_service::CreateInMemoryRepo().release());
	}

	// Choose storage backend via env SONET_MEDIA_STORAGE=s3|local
	std::string storage_kind = std::getenv("SONET_MEDIA_STORAGE") ? std::getenv("SONET_MEDIA_STORAGE") : std::string("local");
	std::shared_ptr<sonet::media_service::StorageBackend> storage;
	if (storage_kind == "s3") {
		const char* bucket = std::getenv("SONET_MEDIA_BUCKET");
		const char* public_url = std::getenv("SONET_MEDIA_PUBLIC_BASE_URL"); // e.g., https://cdn.example.com/media
		const char* endpoint = std::getenv("SONET_MEDIA_S3_ENDPOINT"); // for MinIO/R2
		if (bucket && public_url) {
			storage.reset(sonet::media_service::CreateS3Storage(bucket, public_url, endpoint ? endpoint : "").release());
		} else {
			std::cerr << "S3 storage selected but SONET_MEDIA_BUCKET or SONET_MEDIA_PUBLIC_BASE_URL not set; falling back to local" << std::endl;
			storage.reset(sonet::media_service::CreateLocalStorage(local_store_dir, local_base_url).release());
		}
	} else {
		storage.reset(sonet::media_service::CreateLocalStorage(local_store_dir, local_base_url).release());
	}
	auto img = std::shared_ptr<sonet::media_service::ImageProcessor>(sonet::media_service::CreateImageProcessor().release());
	auto vid = std::shared_ptr<sonet::media_service::VideoProcessor>(sonet::media_service::CreateVideoProcessor().release());
	auto gif = std::shared_ptr<sonet::media_service::GifProcessor>(sonet::media_service::CreateGifProcessor().release());

	bool enable_nsfw = true;
	if (const char* e = std::getenv("SONET_MEDIA_NSFW")) {
		std::string v = e; for (auto& c : v) c = static_cast<char>(std::tolower(c));
		if (v=="0" || v=="false" || v=="no") enable_nsfw = false;
	}
	auto nsfw = std::shared_ptr<sonet::media_service::NsfwScanner>(sonet::media_service::CreateBasicScanner(enable_nsfw).release());
	sonet::media_service::MediaServiceImpl service(repo, storage, img, vid, gif, nsfw, max_upload);

	grpc::ServerBuilder builder;
	builder.AddListeningPort(listen_addr, grpc::InsecureServerCredentials());
	builder.RegisterService(&service);
	std::unique_ptr<grpc::Server> server(builder.BuildAndStart());
	std::cout << "Media service listening on " << listen_addr << std::endl;
	server->Wait();
	return 0;
}

