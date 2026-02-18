import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async health() {
    // A minimal DB query. If DB is down, this will throw.
    await this.prisma.user.count();
    return { ok: true };
  }
}