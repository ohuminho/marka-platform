import bcrypt from "bcrypt";

export class PasswordService {

  async hash(password: string) {
    return bcrypt.hash(password, 12);
  }


  async compare(
    password: string,
    hash: string
  ) {
    return bcrypt.compare(
      password,
      hash
    );
  }

}
