#include "./catnip.h"

catnip_f64_t catnip_value_to_number(catnip_value value) {
  if (CATNIP_VALUE_IS_STRING(value)) {
    return catnip_numconv_parse(CATNIP_VALUE_AS_STRING(value));
  } else {
    return CATNIP_VALUE_AS_NUMBER(value);
  }
}

catnip_hstring *catnip_value_to_string(catnip_value value) {
  if (CATNIP_VALUE_IS_STRING(value)) {
    catnip_hstring *valueString = CATNIP_VALUE_AS_STRING(value);
    catnip_hstring_ref(valueString);
    return valueString;
  } else {
    return catnip_numconv_stringify_f64(CATNIP_VALUE_AS_NUMBER(value));
  }
}