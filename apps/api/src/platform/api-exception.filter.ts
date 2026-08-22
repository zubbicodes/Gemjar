import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const request = context.getRequest<{
      correlationId?: string;
      url: string;
    }>();
    const response = context.getResponse();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const body =
      exception instanceof HttpException ? exception.getResponse() : undefined;
    const message =
      typeof body === "string"
        ? body
        : typeof body === "object" && body && "message" in body
          ? (body as any).message
          : "An unexpected error occurred";
    const messages = Array.isArray(message) ? message : [message];
    const validation =
      status === HttpStatus.BAD_REQUEST &&
      typeof body === "object" &&
      body &&
      "error" in body &&
      (body as { error?: string }).error === "Bad Request" &&
      Array.isArray(message);
    const fieldErrors = validation
      ? messages.reduce<Record<string, string[]>>((result, entry) => {
          const safe = String(entry);
          const field = safe.split(" ", 1)[0] || "request";
          (result[field] ??= []).push(safe);
          return result;
        }, {})
      : undefined;
    if (status >= 500)
      console.error(
        JSON.stringify({
          level: "error",
          event: "http_exception",
          status,
          message: exception instanceof Error ? exception.message : message,
          correlationId: request.correlationId || "unknown",
          path: request.url,
        }),
      );
    response
      .status(status)
      .json({
        code:
          status === 500
            ? "INTERNAL_ERROR"
            : validation
              ? "VALIDATION_ERROR"
              : `HTTP_${status}`,
        message: messages[0],
        ...(fieldErrors ? { fieldErrors } : {}),
        correlationId: request.correlationId || "unknown",
        path: request.url,
      });
  }
}
