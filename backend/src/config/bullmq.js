const shouldSkipVersionCheck = process.env.BULLMQ_SKIP_VERSION_CHECK !== "false";

export const bullmqOptions = {
  skipVersionCheck: shouldSkipVersionCheck,
};

export const withBullmqOptions = (options = {}) => ({
  ...options,
  ...bullmqOptions,
});
