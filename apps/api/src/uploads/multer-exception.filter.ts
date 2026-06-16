import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  INestApplication,
  PayloadTooLargeException,
} from '@nestjs/common';
import { MulterError } from 'multer';
import { NextFunction, Request, Response } from 'express';

function multerErrorMessage(code: string) {
  return code === 'LIMIT_FILE_SIZE'
    ? 'La imagen no puede superar 5 MB'
    : 'No se pudo procesar la imagen';
}

@Catch(MulterError, PayloadTooLargeException)
export class MulterExceptionFilter implements ExceptionFilter {
  catch(exception: MulterError | PayloadTooLargeException, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const message =
      exception instanceof PayloadTooLargeException ||
      (exception instanceof MulterError && exception.code === 'LIMIT_FILE_SIZE')
        ? 'La imagen no puede superar 5 MB'
        : multerErrorMessage(
            exception instanceof MulterError ? exception.code : 'UNKNOWN',
          );

    response.status(400).json({
      statusCode: 400,
      message,
    });
  }
}

/** Express error handler for multer failures that bypass Nest exception filters (e.g. LIMIT_FILE_SIZE → 413). */
export function registerMulterErrorHandler(app: INestApplication) {
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (err instanceof MulterError) {
      res.status(400).json({
        statusCode: 400,
        message: multerErrorMessage(err.code),
      });
      return;
    }
    next(err);
  });
}
