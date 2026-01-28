import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SchoolsModule } from './modules/schools/schools.module';
import { UsersModule } from './modules/users/users.module';
import { PlayersModule } from './modules/players/players.module';
import { TrainingSessionsModule } from './modules/training-sessions/training-sessions.module';
import { FinanceModule } from './modules/finance/finance.module';
import { ProductsModule } from './modules/products/products.module';
import { AuthModule } from './modules/auth/auth.module';
import { CoreModule } from './modules/core/core.module';
import { GrowthModule } from './modules/growth/growth.module';
import { MethodologyModule } from './modules/methodology/methodology.module';
import { OperationsModule } from './modules/operations/operations.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  imports: [
    SchoolsModule,
    UsersModule,
    PlayersModule,
    TrainingSessionsModule,
    FinanceModule,
    ProductsModule,
    AuthModule,
    CoreModule,
    GrowthModule,
    MethodologyModule,
    OperationsModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
