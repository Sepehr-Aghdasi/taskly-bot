import { Module } from '@nestjs/common';
import { AppController } from './app.controller';

import { AppService } from './app.service';
import { UserService } from './user/user.service';
import { PrismaService } from './prisma/prisma.service';
import { TelegramService } from './telegram/telegram.service';
import { TaskSchedulerService } from './task-scheduler/task-scheduler.service';
import { TimeService } from './time-service/time.service';
import { TimeBlockSchedulerService } from './time-block-scheduler/time-block-scheduler.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [
    AppService,
    PrismaService,
    UserService,
    TelegramService,
    TaskSchedulerService,
    TimeService,
    TimeBlockSchedulerService,
  ],
})
export class AppModule { }
