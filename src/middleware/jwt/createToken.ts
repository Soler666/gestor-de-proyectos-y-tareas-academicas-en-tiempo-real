import * as jwt from 'jsonwebtoken'

interface Payload {
  id: number
  username: string
  role: string
  googleId?: string
}

const createToken = (payload: Payload, expiresIn: string | number) => {
  const secret: string = process.env.JWT_SECRET!;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables.');
  }
  const options: jwt.SignOptions = { expiresIn: expiresIn as jwt.SignOptions['expiresIn'] };
  return jwt.sign(payload, secret, options);
};

export default createToken

