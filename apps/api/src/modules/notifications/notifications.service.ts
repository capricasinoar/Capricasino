// Centro de notificaciones del jugador (Cap. 7.7, UX.3). Otros módulos crean
// notificaciones (pagos, auth); aquí se listan y se marcan leídas. Cada alta
// emite un evento para empujarla por WebSocket (realtime).
import { Injectable, Optional } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export const NOTIFICATION_CREATED = "notification.created";
export interface NotificationCreatedEvent {
  userId: string;
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly events?: EventEmitter2,
  ) {}

  /** Crea una notificación y avisa al gateway para el push en vivo. */
  async create(userId: string, type: string, payload: Prisma.InputJsonValue = {}) {
    const n = await this.prisma.notification.create({ data: { userId, type, payload } });
    this.events?.emit(NOTIFICATION_CREATED, { userId } satisfies NotificationCreatedEvent);
    return n;
  }

  async list(userId: string, cursor?: string, limit = 20) {
    const take = Math.min(limit, 50);
    const items = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const hasMore = items.length > take;
    const page = hasMore ? items.slice(0, take) : items;
    return {
      items: page.map((n) => ({
        id: n.id,
        type: n.type,
        payload: n.payload,
        read: n.readAt !== null,
        createdAt: n.createdAt.toISOString(),
      })),
      nextCursor: hasMore ? page[page.length - 1].id : null,
    };
  }

  unreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, readAt: null } });
  }

  async markRead(userId: string, ids: string[]) {
    // Filtra por userId: nadie marca notificaciones de otro (anti-IDOR).
    await this.prisma.notification.updateMany({
      where: { userId, id: { in: ids }, readAt: null },
      data: { readAt: new Date() },
    });
    return { unread: await this.unreadCount(userId) };
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
    return { unread: 0 };
  }
}
