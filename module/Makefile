

sources = catnip.c catnip_assert.c catnip_blockutil.c catnip_hstring.c catnip_list.c \
	catnip_mem.c catnip_numconv.c catnip_runtime.c catnip_sprite.c catnip_target.c \
	catnip_thread.c catnip_unicode.c catnip_util.c

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
			$(sources)

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
			$(sources)