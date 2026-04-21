import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProjectsModule } from './projects/projects.module';
import { TemplatesModule } from './templates/templates.module';
import { AiModule } from './ai/ai.module';
import { OperationLogInterceptor } from './common/interceptors/operation-log.interceptor';
import { FilesModule } from './files/files.module';
import { PublishModule } from './publish/publish.module';
import { FormsModule } from './forms/forms.module';
import { LogsModule } from './logs/logs.module';
import { ShareModule } from './share/share.module';
import { MarketModule } from './market/market.module';
import { TrashModule } from './trash/trash.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ProjectsModule,
    TemplatesModule,
    AiModule,
    FilesModule,
    PublishModule,
    FormsModule,
    LogsModule,
    ShareModule,
    MarketModule,
    TrashModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: OperationLogInterceptor,
    },
  ],
})
export class AppModule {}
