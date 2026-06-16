import {
  Controller,
  Inject,
  Post,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { THROTTLE_LIMITS } from '../config/throttle.config';
import { STORAGE_SERVICE, StorageService } from '../storage/storage.interface';
import { MulterExceptionFilter } from './multer-exception.filter';
import { assertValidImageUpload } from './uploads.validation';

@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(@Inject(STORAGE_SERVICE) private storage: StorageService) {}

  @Throttle({ default: THROTTLE_LIMITS.upload })
  @Post()
  @UseFilters(MulterExceptionFilter)
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: Express.Multer.File) {
    const { ext, mime } = assertValidImageUpload(file);
    const url = await this.storage.upload(file.buffer, ext, mime);
    return { url };
  }
}
