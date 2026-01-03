import { Module } from '@nestjs/common';
import { AppController } from './app.controller';

import { AppService } from './app.service';
import { UserService } from './user/user.service';
import { TelegramService } from './telegram/telegram.service';
import { TaskSchedulerService } from './task-scheduler/task-scheduler.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService, UserService, TelegramService, TaskSchedulerService],
})
export class AppModule { }
