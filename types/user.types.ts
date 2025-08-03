// types/user.types.ts

//* usar openapi cuando este Swagger
export type Role = 'administrador' | 'cajero';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}
