import { Body, Controller, Get, HttpCode, Post, Query, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { JwtAuthGuard, CurrentUser, type JwtPayload } from "../auth/jwt-auth.guard";
import { ZodValidationPipe } from "../../shared/zod-validation.pipe";
import { NotificationsService } from "./notifications.service";

const ReadBody = z.object({ ids: z.array(z.string()).min(1) });

@Controller("notifications")
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  async list(@CurrentUser() user: JwtPayload, @Query("cursor") cursor?: string) {
    const [page, unread] = await Promise.all([
      this.notifications.list(user.sub, cursor),
      this.notifications.unreadCount(user.sub),
    ]);
    return { ...page, unread };
  }

  @Post("read")
  @HttpCode(200)
  markRead(@Body(new ZodValidationPipe(ReadBody)) body: z.infer<typeof ReadBody>, @CurrentUser() user: JwtPayload) {
    return this.notifications.markRead(user.sub, body.ids);
  }

  @Post("read-all")
  @HttpCode(200)
  markAllRead(@CurrentUser() user: JwtPayload) {
    return this.notifications.markAllRead(user.sub);
  }
}
