export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  picture?: string;
}

export interface ApiJwtPayload {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
}
