import jwt from "jsonwebtoken";

interface TokenPayload {
  id: number;
  email: string;
  role: "ADMIN" | "SALES_EXECUTIVE";
}

const generateToken = (user: TokenPayload): string => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET!,
    {
      expiresIn: "1d",
    }
  );
};

export default generateToken;