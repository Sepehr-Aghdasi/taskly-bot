import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TelegramService } from './telegram/telegram.service';
import { PrismaService } from './prisma/prisma.service';
import { UserService } from './user/user.service';
import { TaskSchedulerService } from './task-scheduler/task-scheduler.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService, PrismaService, TelegramService, UserService, TaskSchedulerService],
})
export class AppModule { }
