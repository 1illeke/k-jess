const parseOrigins = (value) => {
  if (!value) return ['*'];
  try {
    return value.split(',').map((s) => s.trim()).filter(Boolean);
  } catch {
    return ['*'];
  }
};

export const env = {
  port: parseInt(process.env.PORT ?? '3001', 10),
  corsOrigins: parseOrigins(process.env.CORS_ORIGINS ?? '*'),
};