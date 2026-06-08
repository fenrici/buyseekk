import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let httpException: { status: number; message: string };

    switch (exception.code) {
      case 'P2002':
        httpException = { status: HttpStatus.CONFLICT, message: 'El registro ya existe' };
        break;
      case 'P2025':
        httpException = { status: HttpStatus.NOT_FOUND, message: 'Registro no encontrado' };
        break;
      default:
        httpException = {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Error de base de datos',
        };
    }

    response.status(httpException.status).json({
      statusCode: httpException.status,
      message: httpException.message,
      error: exception.code,
    });
  }
}
