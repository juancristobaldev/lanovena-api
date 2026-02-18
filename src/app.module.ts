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
import { FlowModule } from './modules/flow/flow.module';
import { TasksService } from './modules/tasks/tasks.service';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import { CategoriesModule } from './modules/categories/categories.module';
import { EvaluationsModule } from './modules/evaluations/evaluations.module';
import { StrategyModule } from './modules/strategy/strategy.module';
import { MatchModule } from './modules/match/match.module';
import { ExerciseModule } from './modules/exercise/exercise.module';
import { TacticalBoardModule } from './modules/tactical-board/tactical-board.module';

@Module({
  imports: [
GraphQLModule.forRoot<ApolloDriverConfig>({
  driver: ApolloDriver,
  autoSchemaFile: process.env.NODE_ENV === 'production'
    ? true
    : join(process.cwd(), 'src/schema.gql'),
  
  // 🚀 OPTIMIZACIÓN: Desactiva esto en producción para arrancar más rápido
  playground: false, 
  sortSchema: false,
  introspection: false,
}),
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
    FlowModule,
    CategoriesModule,
    EvaluationsModule,
    StrategyModule,
    MatchModule,
    ExerciseModule,
    TacticalBoardModule,
  ],
  controllers: [AppController],
  providers: [AppService, TasksService],
})
export class AppModule {}
