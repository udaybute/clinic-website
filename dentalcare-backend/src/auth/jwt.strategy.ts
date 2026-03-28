// src/auth/jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // Throws at startup if JWT_SECRET is not set — never falls back to a weak default
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    // Attached as req.user in every @UseGuards(JwtAuthGuard) route
    return {
      id:       payload.sub,
      email:    payload.email,
      role:     payload.role,
      clinicId: payload.clinicId,
    };
  }
}