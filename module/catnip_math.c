#include "./catnip_math.h"

#include "./math/catnip_math_scalbn.c"
#include "./math/catnip_math_log.c"
#include "./math/catnip_math_exp.c"
#include "./math/catnip_math_fmod.c"
#include "./math/catnip_math_pow.c"
#include "./math/catnip_math_sin.c"
#include "./math/catnip_math_cos.c"
#include "./math/catnip_math_tan.c"
#include "./math/catnip_math_atan.c"

// https://github.com/svaarala/duktape/blob/50af773b1b32067170786c2b7c661705ec7425d4/src-input/duk_bi_math.c#L146
catnip_f64_t catnip_math_round(catnip_f64_t x) {

	if (CATNIP_F64_ISINFINITE(x) || CATNIP_F64_ISNAN(x)) {
		return x;
	}

	if (x >= -0.5 && x < 0.5) {
		if (x < 0.0) {
			return -0.0;
		} else {
			return +0.0;
		}
	}

	return CATNIP_F64_FLOOR(x + 0.5);
}

// https://github.com/v8/v8/blob/085fed0fb5c3b0136827b5d7c190b4bd1c23a23e/src/base/utils/random-number-generator.h#L102
void catnip_math_random_progress_state(catnip_math_random_state *state) {
	catnip_ui64_t s1 = state->state0;
	catnip_ui64_t s0 = state->state1;
    state->state0 = s0;
    s1 ^= s1 << 23;
    s1 ^= s1 >> 17;
    s1 ^= s0;
    s1 ^= s0 >> 26;
    state->state1 = s1;
}

catnip_f64_t catnip_math_random(catnip_runtime *runtime) {
	catnip_math_random_progress_state(runtime->random_state);

	// https://github.com/v8/v8/blob/085fed0fb5c3b0136827b5d7c190b4bd1c23a23e/src/base/utils/random-number-generator.h#L93
	const catnip_ui64_t kExponentBits = 0x3FF0000000000000UL;
    const catnip_ui64_t kMantissaMask = 0x000FFFFFFFFFFFFFUL;
    catnip_ui64_t random = ((runtime->random_state->state0 + runtime->random_state->state1) & kMantissaMask) | kExponentBits;
    return (*(catnip_f64_t*)&random) - 1;
}
