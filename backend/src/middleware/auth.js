import { unauthorized } from '../utils/errors.js';

export const requireAdmin = (authService) => (req, _res, next) => {
  const header = req.get('authorization') || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return next(unauthorized());
  req.admin = authService.verify(token);
  next();
};
