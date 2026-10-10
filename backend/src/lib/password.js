import bcrypt from 'bcrypt';
import { config } from '../config/index.js';

export const hashPassword = (password) => bcrypt.hash(password, config.bcryptRounds);

export const verifyPassword = (password, hash) => bcrypt.compare(password, hash);