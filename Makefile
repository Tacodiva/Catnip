

base_sources = ./module/catnip_assert.c ./module/catnip_blockutil.c ./module/catnip_hstring.c ./module/catnip_list.c \
	./module/catnip_mem.c ./module/catnip_numconv.c ./module/catnip_runtime.c ./module/catnip_sprite.c ./module/catnip_target.c \
	./module/catnip_thread.c ./module/catnip_unicode.c ./module/catnip_util.c ./module/catnip_value.c ./module/catnip_math.c \
	./module/catnip_io.c ./module/catnip_strings.c ./module/math/catnip_math_rem_pio2.c

catnip_sources = ./module/catnip.c


debug:
	clang \
			-O3 \
			-Wl,--lto-O3 \
			--target=wasm32 \
			-flto \
			-fno-delete-null-pointer-checks \
			-nostdlib \
			-mbulk-memory \
			-Wl,--import-memory \
			-Wl,--import-table \
			-Wl,--no-entry \
			-o ./public/catnip.wasm \
			-D CATNIP_DEBUG \
			$(base_sources) $(catnip_sources)

release:
	clang \
			--target=wasm32 \
			-O3 \
			-flto \
			-Wl,--lto-O3 \
			-fno-delete-null-pointer-checks \
			-nostdlib \
			-mbulk-memory \
			-Wl,--import-memory \
			-Wl,--import-table \
			-Wl,--no-entry \
			-o ./public/catnip.wasm \
			$(base_sources) $(catnip_sources)