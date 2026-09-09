import { BaseEntity } from "../schemas/base.schema";

export interface UserModel extends BaseEntity {
  name: string;
  email: string;
  role: string;
}
