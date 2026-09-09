import jwt from "jsonwebtoken";

export class TokenService {

  generate(payload: object) {
    return jwt.sign(
      payload,
      process.env.JWT_SECRET || "MARKA_SECRET",
      {
        expiresIn: "24h",
        issuer: "MARKA",
      }
    );
  }


  verify(token: string) {
    return jwt.verify(
      token,
      process.env.JWT_SECRET || "MARKA_SECRET"
    );
  }

}
