import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwksProvider } from './strategies/jwks.provider';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocationModule } from '../location/location.module';

@Module({
  imports: [PassportModule, LocationModule],
  providers: [JwtStrategy, JwksProvider],
  exports: [PassportModule],
})
export class AuthModule {}
