import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { IoAdapter } from '@nestjs/platform-socket.io';

import { AppModule } from './app/app.module';
import { env } from './app/env';

(async () => {
  const app = await NestFactory.create(AppModule);

  app.enableCors({ origin: env.CLIENT_URL });
  app.useWebSocketAdapter(new IoAdapter(app));

  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  await app.listen(env.PORT);

  Logger.log(
    `🚀 Application is running on: http://localhost:${env.PORT}/${globalPrefix}`,
  );
})().catch((error: unknown) => {
  Logger.error(`Failed to launch app`, { error });
  throw error;
});
