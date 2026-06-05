import dotenvExpand from 'dotenv-expand';
import dotenvFlow from 'dotenv-flow';
import { z } from 'zod';

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}

dotenvExpand.expand(dotenvFlow.config({ path: './profiles', silent: true }));

export const env = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']),
    PORT: z.coerce.number(),
    CLIENT_URL: z.string(),
  })
  .parse(process.env);
