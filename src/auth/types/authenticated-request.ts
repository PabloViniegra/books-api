import { Request } from 'express';
import { AuthUser } from './auth-user';

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}
