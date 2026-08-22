import "reflect-metadata";
import { randomUUID } from "node:crypto";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { ApiExceptionFilter } from "./platform/api-exception.filter";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    rawBody: true,
  });
  app.setGlobalPrefix("api/v1");
  app.use(helmet());
  app.use(cookieParser(process.env.COOKIE_SECRET));
  app.use((request: any, response: any, next: () => void) => {
    const started = Date.now();
    request.correlationId = request.headers["x-correlation-id"] || randomUUID();
    response.setHeader("x-correlation-id", request.correlationId);
    response.on("finish", () =>
      console.info(
        JSON.stringify({
          level: "info",
          event: "http_request",
          method: request.method,
          path: request.originalUrl,
          status: response.statusCode,
          durationMs: Date.now() - started,
          correlationId: request.correlationId,
        }),
      ),
    );
    next();
  });
  app.enableCors({
    origin: process.env.WEB_URL || "http://localhost:3000",
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new ApiExceptionFilter());
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle("Gemjar Commerce API")
      .setDescription("Versioned commerce, portal and integration API")
      .setVersion("1.0")
      .addCookieAuth("gj_access")
      .build(),
  );
  SwaggerModule.setup("docs", app, document);
  app.flushLogs();
  await app.listen(Number(process.env.PORT || 4000));
}

void bootstrap();
