import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GqlAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ctx = GqlExecutionContext.create(context);
    const request = ctx.getContext().req;

    // 1. Extraer el token del header "Authorization: Bearer <token>"
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException(
        'No se proporcionó token de autenticación',
      );
    }

    try {
      // 2. Verificar la firma y expiración
      const payload = await this.jwtService.verifyAsync(token, {
        secret:
          this.configService.get<string>('JWT_SECRET') || 'SUPER_SECRET_KEY',
      });

      // 3. Inyectar el usuario en el request para que @CurrentUser lo lea
      // Aquí reconstruimos el objeto usuario ligero
      request['user'] = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        schoolId: payload.schoolId,
        isImpersonated: payload.isImpersonated || false,
      };
    } catch (error) {
      throw new UnauthorizedException('Token inválido o expirado');
    }

    return true;
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
