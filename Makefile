

base_sources = ./module/catnip_assert.c ./module/catnip_blockutil.c ./module/catnip_hstring.c ./module/catnip_list.c \
	./module/catnip_mem.c ./module/catnip_numconv.c ./module/catnip_runtime.c ./module/catnip_sprite.c ./module/catnip_target.c \
	./module/catnip_thread.c ./module/catnip_unicode.c ./module/catnip_util.c ./module/catnip_value.c ./module/catnipr_canvas.c

catnip_sources = ./module/catnip.c
catnipr_sources = ./module/catnipr.c

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
			-o ./public/catnip.wasm \
			-D CATNIP_DEBUG \
			$(base_sources) $(catnip_sources) $(catnipr_sources)

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
			-o ./public/catnip.wasm \
			$(base_sources) $(catnip_sources) $(catnipr_sources)