import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { sign, type Secret, type SignOptions } from 'jsonwebtoken';

// Prisma enum name is based on your schema enum `identity_provider`
import { identity_provider } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async register(email: string, name: string | undefined, password: string) {
    // 1) Check if user already exists
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new BadRequestException('Email already in use');
    }

    // 2) Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // 3) Create user + identity in a single transaction
    const user = await this.prisma.user.create({
      data: {
        email,
        name: name ?? null,
        identities: {
          create: {
            provider: identity_provider.LOCAL,
            providerUserId: email,     // simple stable key for LOCAL
            passwordHash,
          },
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    // 4) Issue JWT
    const secret = this.config.get<string>('JWT_SECRET');
if (!secret) {
  throw new Error('JWT_SECRET is missing in .env');
}

const expiresInRaw = this.config.get<string>('JWT_EXPIRES_IN') ?? '7d';

// jsonwebtoken types in recent versions expect a specific StringValue type,
// so we cast here to avoid TS picking the wrong overload.
const options: SignOptions = { expiresIn: expiresInRaw as any };

const token = sign({ userId: user.id }, secret as Secret, options);

    return { user, token };
  }
}