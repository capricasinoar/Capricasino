import { Module } from "@nestjs/common";
import { ProviderModule } from "../provider/provider.module";
import { GamesController } from "./games.controller";

@Module({
  imports: [ProviderModule],
  controllers: [GamesController],
})
export class GamesModule {}
