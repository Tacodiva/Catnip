#include "./catnip.h"

catnip_f64_t catnip_value_to_number(catnip_runtime *runtime, catnip_value value) {
  if (CATNIP_VALUE_IS_STRING(value)) {
    return catnip_numconv_parse(runtime, CATNIP_VALUE_AS_STRING(value));
  } else {
    return CATNIP_VALUE_AS_NUMBER(value);
  }
}

catnip_hstring *catnip_value_to_string(catnip_runtime *runtime, catnip_value value) {
  if (CATNIP_VALUE_IS_STRING(value)) {
    return CATNIP_VALUE_AS_STRING(value);
  } else {
    return catnip_numconv_stringify_f64(runtime, CATNIP_VALUE_AS_NUMBER(value));
  }
}