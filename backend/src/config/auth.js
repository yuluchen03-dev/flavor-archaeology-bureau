const isProduction = process.env.NODE_ENV === 'production';
const jwtSecret = process.env.JWT_SECRET || (isProduction ? '' : 'flavor-archaeology-local-demo-secret');

if (isProduction && !jwtSecret) {
  throw new Error('JWT_SECRET must be configured in production');
}

module.exports = {
  jwtSecret,
  jwtSecretSource: process.env.JWT_SECRET ? 'environment' : 'development-default',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  saltRounds: 10
};
