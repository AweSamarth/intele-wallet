import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';
require("dotenv").config({ path: ".env" });

const scryptAsync = promisify(scrypt);
const algorithm = 'aes-256-cbc';
const keyLength = 32; 
const ivLength = 16

const secretKey = process.env.SECRET_KEY

export const encryptData = async (text: string): Promise<string> => {
  const salt = randomBytes(16);
  const key = await scryptAsync(secretKey, salt, keyLength) as Buffer;
  const iv = randomBytes(ivLength);
  const cipher = createCipheriv(algorithm, key, iv);

  const encryptedBuffer = Buffer.concat([cipher.update(text, 'utf-8'), cipher.final()]);
  const result = Buffer.concat([salt, iv, encryptedBuffer]).toString('base64');

  return result;
};

export const decryptData = async (encryptedText: string): Promise<string> => {
  const buffer = Buffer.from(encryptedText, 'base64');
  const salt = buffer.slice(0, 16);
  const iv = buffer.slice(16, 32);
  const data = buffer.slice(32);

  const key = await scryptAsync(secretKey, salt, keyLength) as Buffer;
  const decipher = createDecipheriv(algorithm, key, iv);

  const decryptedBuffer = Buffer.concat([decipher.update(data), decipher.final()]);
  const result = decryptedBuffer.toString('utf-8');

  return result;
};

