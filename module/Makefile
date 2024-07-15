
debug:
	clang \
			--target=wasm32 \
			-O3 \
			-flto \
			-nostdlib \
			-mbulk-memory \
			-Wl,--import-memory \
			-Wl,--import-table \
			-Wl,--no-entry \
			-Wl,--lto-O3 \
			-o ../public/catnip.wasm \
			-D CATNIP_DEBUG \
			catnip.c

release:
	clang \
			--target=wasm32 \
			-O3 \
			-flto \
			-nostdlib \
			-mbulk-memory \
			-Wl,--import-memory \
			-Wl,--import-table \
			-Wl,--no-entry \
			-Wl,--lto-O3 \
			-o ../public/catnip.wasm \
			catnip.c