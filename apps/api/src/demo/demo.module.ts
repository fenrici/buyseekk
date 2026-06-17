import { Module } from '@nestjs/common';
import { MiamiAutoBootstrapService } from './miami-auto-bootstrap.service';

@Module({
  providers: [MiamiAutoBootstrapService],
})
export class DemoModule {}
