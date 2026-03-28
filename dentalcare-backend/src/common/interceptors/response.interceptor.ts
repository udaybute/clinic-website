// src/common/interceptors/response.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Wraps every successful response in the standard envelope:
 * { success: true, message: 'OK', data: <payload> }
 *
 * Matches the shape expected by lib/api.ts on the frontend.
 * Error responses are NOT wrapped here — they're handled by NestJS exception filters.
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, any> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        // If the service already returned a full envelope (e.g. auth.service login),
        // pass it through unchanged to avoid double-wrapping.
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }

        return {
          success: true,
          message: 'OK',
          data,
        };
      }),
    );
  }
}
