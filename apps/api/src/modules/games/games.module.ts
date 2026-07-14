import { Module } from "@nestjs/common";
import { ProviderModule } from "../provider/provider.module";
import { ResponsibleModule } from "../responsible/responsible.module";
import { GamesController } from "./games.controller";
import { GamesService } from "./games.service";

@Module({
  imports: [ProviderModule, ResponsibleModule],
  controllers: [GamesController],
  providers: [GamesService],
})
export class GamesModule {}
