import { Module } from '@nestjs/common';
import { AuthTestService } from './auth-test.service';
import { AuthTestController } from './auth-test.controller';

@Module({
  controllers: [AuthTestController],
  providers: [AuthTestService]
})
export class AuthTestModule {}
