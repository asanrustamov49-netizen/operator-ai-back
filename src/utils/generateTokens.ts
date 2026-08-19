import jwt from "jsonwebtoken";

interface IPayload {
  id: number;
  name: string;
  email: string;
  google_id?: number;
}

export const access_secret = "access_webops";
export const refresh_secret = "refresh_webops";

export const generateTokens = (payload: IPayload) => {
  const accessToken = jwt.sign(payload, access_secret, {
    expiresIn: "15m",
  });
  const refreshToken = jwt.sign(payload, refresh_secret, {
    expiresIn: "7d",
  });

  return {
    accessToken,
    refreshToken,
  };
};
