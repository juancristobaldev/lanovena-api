import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import {
  AuthResponse,
  LoginInput,
  RegisterInput,
} from '../../entitys/auth.entity';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  /**
   * Valida credenciales y retorna el usuario si son correctas.
   */
  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { school: true, schools: true },
    });

    console.log({ user });

    if (user && user.isActive && (await bcrypt.compare(pass, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  /**
   * Login tradicional para cualquier usuario
   */
  async login(input: LoginInput): Promise<AuthResponse> {
    const user = await this.validateUser(input.email, input.password);

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    return this.generateAuthResponse(user);
  }

  /**
   * 👑 GOD MODE: Permite a un SUPERADMIN loguearse como cualquier otro usuario
   * sin conocer la contraseña. (Solo funciona si quien llama es SuperAdmin).
   */
  async impersonate(
    adminId: string,
    targetUserId: string,
  ): Promise<AuthResponse> {
    // 1. Verificar que quien solicita sea realmente SUPERADMIN
    const admin = await this.prisma.user.findUnique({ where: { id: adminId } });

    if (!admin || admin.role !== Role.SUPERADMIN) {
      throw new ForbiddenException('Solo el SuperAdmin puede usar el God Mode');
    }

    // 2. Buscar al usuario objetivo
    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      include: { school: true },
    });

    if (!targetUser) {
      throw new NotFoundException('Usuario objetivo no encontrado');
    }

    // 3. Generar token a nombre del usuario objetivo
    return this.generateAuthResponse(targetUser, true);
  }

  /**
   * Registro básico de usuarios (Directores o Staff)
   */
  async register(
    input: RegisterInput,
    role: Role = Role.DIRECTOR,
  ): Promise<AuthResponse> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: input.email },
    });
    if (existingUser) {
      throw new BadRequestException('El correo ya está registrado');
    }

    const hashedPassword = await bcrypt.hash(input.password, 10);

    const newUser = await this.prisma.user.create({
      data: {
        email: input.email,
        password: hashedPassword,
        fullName: input.fullName,
        phone: input.phone,
        role: role,
        // Al crear usuario, no tiene escuela asignada aún (se hace en el onboarding)
      },
    });

    return this.generateAuthResponse(newUser);
  }

  /**
   * Actualiza el paso del Wizard (Onboarding) de la escuela del usuario
   */
  async updateOnboardingStep(userId: string, step: number) {
    // Primero obtenemos el usuario para saber su escuela
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user || !user.schoolId) {
      throw new BadRequestException(
        'El usuario no tiene una escuela asignada para actualizar el onboarding.',
      );
    }

    // Guardamos el paso en la escuela (asumiendo que agregaste el campo onboardingStep a School)
    // Si no lo agregaste, podrías guardarlo en el User o ignorar este paso por ahora.
    /* return this.prisma.school.update({
      where: { id: user.schoolId },
      data: { onboardingStep: step }
    });
    */
    return true; // Placeholder hasta que actualices el schema School con onboardingStep
  }

  /**
   * Genera la respuesta estándar con Token y Usuario
   */
  private async generateAuthResponse(
    user: any,
    isImpersonated = false,
  ): Promise<AuthResponse> {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      schoolId: user.schoolId,
      isImpersonated, // Flag útil para el frontend (mostrar banner "Estás viendo como...")
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user,
    };
  }
}
