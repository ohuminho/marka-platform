import { jwtVerify } from "jose";


export class EdgeTokenService {


  async verify(
    token: string
  ) {


    const secret =
      new TextEncoder().encode(
        process.env.JWT_SECRET || "MARKA_SECRET"
      );



    const {
      payload,
    } =
      await jwtVerify(
        token,
        secret,
        {
          issuer: "MARKA",
        }
      );



    return payload;

  }


}
