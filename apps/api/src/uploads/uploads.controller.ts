import { Controller, Post, UploadedFile, UseFilters, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser } from '../common/types/auth-user';
import { THROTTLE_LIMITS } from '../config/throttle.config';
import { StorageObjectsService } from '../storage/storage-objects.service';
import { MulterExceptionFilter } from './multer-exception.filter';
import { assertValidImageUpload } from './uploads.validation';

@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(private storageObjects: StorageObjectsService) {}

  @Throttle({ default: THROTTLE_LIMITS.upload })
  @Post()
  @UseFilters(MulterExceptionFilter)
  @UseInterceptors(FileInterceptor('file'))
  async upload(@CurrentUser() user: AuthUser, @UploadedFile() file: Express.Multer.File) {
    const { ext, mime } = assertValidImageUpload(file);
    const url = await this.storageObjects.uploadOwned(user.id, file.buffer, ext, mime);
    return { url };
  }
}
