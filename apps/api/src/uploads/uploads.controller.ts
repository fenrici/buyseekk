import {
  BadRequestException,
  Controller,
  Inject,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { extname } from 'path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { THROTTLE_LIMITS } from '../config/throttle.config';
import { STORAGE_SERVICE, StorageService } from '../storage/storage.interface';

@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(@Inject(STORAGE_SERVICE) private storage: StorageService) {}

  @Throttle({ upload: THROTTLE_LIMITS.upload })
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: Express.Multer.File) {
    if (!file?.buffer?.length) throw new BadRequestException('No se recibió ninguna imagen');
    const ext = extname(file.originalname).toLowerCase();
    const url = await this.storage.upload(file.buffer, ext, file.mimetype);
    return { url };
  }
}
