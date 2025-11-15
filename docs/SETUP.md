# 低代码平台后端搭建完整指南

基于 OpenSpec 提案的后端系统实施文档

版本：v1.0  
技术栈：Node.js + Nest.js + PostgreSQL + Prisma + JWT

---

## 目录

1. [项目初始化](#1-项目初始化)
2. [数据库设计与配置](#2-数据库设计与配置)
3. [用户认证系统](#3-用户认证系统)
4. [项目管理API](#4-项目管理api)
5. [安全与中间件](#5-安全与中间件)
6. [测试](#6-测试)
7. [部署](#7-部署)
8. [环境变量配置](#8-环境变量配置)

---

## 1. 项目初始化

### 1.1 安装 Nest.js CLI

```bash
npm install -g @nestjs/cli
```

### 1.2 创建项目

```bash
cd lowcode-backend
nest new . --package-manager npm
```

选择项目配置：
- Package manager: npm
- 项目名称：lowcode-backend

### 1.3 安装核心依赖

```bash
# Prisma ORM
npm install @prisma/client
npm install -D prisma

# JWT 认证
npm install @nestjs/jwt @nestjs/passport passport passport-jwt
npm install -D @types/passport-jwt

# 密码加密
npm install bcrypt
npm install -D @types/bcrypt

# 配置管理
npm install @nestjs/config

# 验证器
npm install class-validator class-transformer

# CORS
npm install @nestjs/platform-express
```

### 1.4 项目结构

```
lowcode-backend/
├── prisma/
│   ├── schema.prisma          # 数据库模型
│   └── migrations/            # 迁移文件
├── src/
│   ├── auth/                  # 认证模块
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.module.ts
│   │   ├── dto/               # 数据传输对象
│   │   ├── guards/            # 守卫
│   │   └── strategies/        # JWT 策略
│   ├── projects/              # 项目模块
│   │   ├── projects.controller.ts
│   │   ├── projects.service.ts
│   │   ├── projects.module.ts
│   │   └── dto/
│   ├── users/                 # 用户模块
│   │   ├── users.service.ts
│   │   └── users.module.ts
│   ├── common/                # 公共模块
│   │   ├── decorators/        # 装饰器
│   │   ├── filters/           # 异常过滤器
│   │   ├── interceptors/      # 拦截器
│   │   └── pipes/             # 管道
│   ├── prisma/                # Prisma 服务
│   │   ├── prisma.service.ts
│   │   └── prisma.module.ts
│   ├── app.module.ts
│   └── main.ts
├── test/                      # 测试文件
├── .env                       # 环境变量
├── .env.example               # 环境变量示例
├── .gitignore
├── package.json
└── tsconfig.json
```

---

## 2. 数据库设计与配置

### 2.1 初始化 Prisma

```bash
npx prisma init
```

### 2.2 配置数据库连接

编辑 `.env` 文件：

```env
DATABASE_URL="postgresql://username:password@localhost:5432/lowcode_db?schema=public"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="7d"
PORT=3000
FRONTEND_URL="http://localhost:5173"
BCRYPT_ROUNDS=10
```

### 2.3 设计数据库模型

编辑 `prisma/schema.prisma`：

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(uuid())
  username  String   @unique @db.VarChar(20)
  email     String   @unique @db.VarChar(100)
  password  String   @db.VarChar(100)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  
  projects  Project[]

  @@map("users")
}

model Project {
  id         String   @id @default(uuid())
  name       String   @db.VarChar(50)
  components Json     @default("[]")
  userId     String   @map("user_id")
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")
  
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("projects")
}
```

### 2.4 创建数据库迁移

```bash
# 创建迁移文件
npx prisma migrate dev --name init

# 生成 Prisma Client
npx prisma generate
```

### 2.5 创建 Prisma Service

**prisma/prisma.service.ts**

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

**prisma/prisma.module.ts**

```typescript
import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

---

## 3. 用户认证系统

### 3.1 创建认证模块

```bash
nest g module auth
nest g service auth
nest g controller auth
```

### 3.2 创建用户服务

**users/users.service.ts**

```typescript
import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(username: string, email: string, password: string) {
    // 检查用户名是否存在
    const existingUser = await this.prisma.user.findUnique({
      where: { username },
    });
    if (existingUser) {
      throw new ConflictException('用户名已被使用');
    }

    // 检查邮箱是否存在
    const existingEmail = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingEmail) {
      throw new ConflictException('邮箱已被使用');
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(
      password,
      parseInt(process.env.BCRYPT_ROUNDS) || 10,
    );

    // 创建用户
    const user = await this.prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
      },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
      },
    });

    return user;
  }

  async findByUsername(username: string) {
    return this.prisma.user.findUnique({
      where: { username },
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
      },
    });
  }

  async validatePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }
}
```

### 3.3 创建 DTO (数据传输对象)

**auth/dto/register.dto.ts**

```typescript
import { IsString, IsEmail, MinLength, MaxLength, Matches } from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(4, { message: '用户名至少需要4个字符' })
  @MaxLength(20, { message: '用户名最多20个字符' })
  username: string;

  @IsEmail({}, { message: '邮箱格式不正确' })
  email: string;

  @IsString()
  @MinLength(8, { message: '密码至少需要8位字符' })
  password: string;
}
```

**auth/dto/login.dto.ts**

```typescript
import { IsString, IsNotEmpty } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty({ message: '用户名不能为空' })
  username: string;

  @IsString()
  @IsNotEmpty({ message: '密码不能为空' })
  password: string;
}
```

### 3.4 实现认证服务

**auth/auth.service.ts**

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const user = await this.usersService.create(
      registerDto.username,
      registerDto.email,
      registerDto.password,
    );

    return {
      code: 0,
      message: '注册成功',
      data: user,
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByUsername(loginDto.username);
    
    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    const isPasswordValid = await this.usersService.validatePassword(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    const payload = { userId: user.id, username: user.username };
    const accessToken = this.jwtService.sign(payload);

    return {
      code: 0,
      message: '登录成功',
      data: {
        accessToken,
        expiresIn: parseInt(process.env.JWT_EXPIRES_IN) || 604800,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
      },
    };
  }

  async verify(userId: string) {
    const user = await this.usersService.findById(userId);
    
    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    return {
      code: 0,
      message: 'Token 有效',
      data: user,
    };
  }
}
```

### 3.5 实现 JWT 策略

**auth/strategies/jwt.strategy.ts**

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    return { userId: payload.userId, username: payload.username };
  }
}
```

### 3.6 创建 JWT 守卫

**auth/guards/jwt-auth.guard.ts**

```typescript
import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }
}
```

### 3.7 实现认证控制器

**auth/auth.controller.ts**

```typescript
import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('api/v1/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('verify')
  async verify(@Request() req) {
    return this.authService.verify(req.user.userId);
  }
}
```

### 3.8 配置认证模块

**auth/auth.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: configService.get<string>('JWT_EXPIRES_IN') },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
```

---

## 4. 项目管理API

### 4.1 创建项目模块

```bash
nest g module projects
nest g service projects
nest g controller projects
```

### 4.2 创建项目 DTO

**projects/dto/create-project.dto.ts**

```typescript
import { IsString, IsNotEmpty, MaxLength, IsOptional, IsArray } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty({ message: '项目名称不能为空' })
  @MaxLength(50, { message: '项目名称长度不能超过50个字符' })
  name: string;

  @IsOptional()
  @IsArray()
  components?: any[];
}
```

**projects/dto/update-project.dto.ts**

```typescript
import { IsString, IsOptional, MaxLength, IsArray } from 'class-validator';

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: '项目名称长度不能超过50个字符' })
  name?: string;

  @IsOptional()
  @IsArray()
  components?: any[];
}
```

**projects/dto/batch-import.dto.ts**

```typescript
import { IsArray, ArrayMaxSize, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateProjectDto } from './create-project.dto';

export class BatchImportDto {
  @IsArray()
  @ArrayMaxSize(100, { message: '批量导入最多支持100个项目' })
  @ValidateNested({ each: true })
  @Type(() => CreateProjectDto)
  projects: CreateProjectDto[];
}
```

### 4.3 实现项目服务

**projects/projects.service.ts**

```typescript
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { BatchImportDto } from './dto/batch-import.dto';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createProjectDto: CreateProjectDto) {
    const project = await this.prisma.project.create({
      data: {
        name: createProjectDto.name,
        components: createProjectDto.components || [],
        userId,
      },
    });

    return {
      code: 0,
      message: '创建成功',
      data: project,
    };
  }

  async findAll(userId: string, page = 1, pageSize = 20, sortBy = 'updatedAt', order = 'desc') {
    const skip = (page - 1) * pageSize;
    const take = Math.min(pageSize, 100);

    const [projects, total] = await Promise.all([
      this.prisma.project.findMany({
        where: { userId },
        skip,
        take,
        orderBy: { [sortBy]: order },
      }),
      this.prisma.project.count({ where: { userId } }),
    ]);

    return {
      code: 0,
      message: '获取成功',
      data: {
        projects,
        pagination: {
          total,
          page,
          pageSize: take,
          totalPages: Math.ceil(total / take),
        },
      },
    };
  }

  async findOne(userId: string, id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      throw new NotFoundException('项目不存在');
    }

    if (project.userId !== userId) {
      throw new ForbiddenException('无权访问该项目');
    }

    return {
      code: 0,
      message: '获取成功',
      data: project,
    };
  }

  async update(userId: string, id: string, updateProjectDto: UpdateProjectDto) {
    const project = await this.prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      throw new NotFoundException('项目不存在');
    }

    if (project.userId !== userId) {
      throw new ForbiddenException('无权修改该项目');
    }

    const updated = await this.prisma.project.update({
      where: { id },
      data: updateProjectDto,
    });

    return {
      code: 0,
      message: '更新成功',
      data: updated,
    };
  }

  async remove(userId: string, id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      throw new NotFoundException('项目不存在');
    }

    if (project.userId !== userId) {
      throw new ForbiddenException('无权删除该项目');
    }

    await this.prisma.project.delete({
      where: { id },
    });

    return {
      code: 0,
      message: '删除成功',
      data: { id },
    };
  }

  async batchImport(userId: string, batchImportDto: BatchImportDto) {
    const createdProjects = [];
    const failedProjects = [];

    for (const projectDto of batchImportDto.projects) {
      try {
        const project = await this.prisma.project.create({
          data: {
            name: projectDto.name,
            components: projectDto.components || [],
            userId,
          },
        });
        createdProjects.push({ id: project.id, name: project.name });
      } catch (error) {
        failedProjects.push(projectDto.name);
      }
    }

    return {
      code: 0,
      message: '批量导入成功',
      data: {
        imported: createdProjects.length,
        failed: failedProjects.length,
        projects: createdProjects,
      },
    };
  }
}
```

### 4.4 实现项目控制器

**projects/projects.controller.ts**

```typescript
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { BatchImportDto } from './dto/batch-import.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/v1/projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private projectsService: ProjectsService) {}

  @Post()
  create(@Request() req, @Body() createProjectDto: CreateProjectDto) {
    return this.projectsService.create(req.user.userId, createProjectDto);
  }

  @Get()
  findAll(
    @Request() req,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('sortBy') sortBy?: string,
    @Query('order') order?: 'asc' | 'desc',
  ) {
    return this.projectsService.findAll(
      req.user.userId,
      Number(page) || 1,
      Number(pageSize) || 20,
      sortBy || 'updatedAt',
      order || 'desc',
    );
  }

  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    return this.projectsService.findOne(req.user.userId, id);
  }

  @Put(':id')
  update(@Request() req, @Param('id') id: string, @Body() updateProjectDto: UpdateProjectDto) {
    return this.projectsService.update(req.user.userId, id, updateProjectDto);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    return this.projectsService.remove(req.user.userId, id);
  }

  @Post('batch-import')
  batchImport(@Request() req, @Body() batchImportDto: BatchImportDto) {
    return this.projectsService.batchImport(req.user.userId, batchImportDto);
  }
}
```

---

## 5. 安全与中间件

### 5.1 全局异常过滤器

**common/filters/http-exception.filter.ts**

```typescript
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.message
        : '服务器内部错误';

    response.status(status).json({
      code: status === 200 ? 0 : status * 10,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
```

### 5.2 配置 CORS

**main.ts**

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // 全局异常过滤器
  app.useGlobalFilters(new AllExceptionsFilter());

  // CORS 配置
  app.enableCors({
    origin: configService.get<string>('FRONTEND_URL'),
    credentials: true,
  });

  const port = configService.get<number>('PORT') || 3000;
  await app.listen(port);
  console.log(`🚀 Server running on http://localhost:${port}`);
}
bootstrap();
```

### 5.3 配置应用模块

**app.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProjectsModule } from './projects/projects.module';

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
  ],
})
export class AppModule {}
```

---

## 6. 测试

### 6.1 单元测试示例

**auth/auth.service.spec.ts**

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            create: jest.fn(),
            findByUsername: jest.fn(),
            validatePassword: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(() => 'test-token'),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // 添加更多测试用例...
});
```

### 6.2 运行测试

```bash
# 单元测试
npm run test

# e2e 测试
npm run test:e2e

# 测试覆盖率
npm run test:cov
```

---

## 7. 部署

### 7.1 生产环境配置

创建 `.env.production` 文件：

```env
DATABASE_URL="postgresql://username:password@production-host:5432/lowcode_db"
JWT_SECRET="production-secret-key-very-long-and-random"
JWT_EXPIRES_IN="7d"
PORT=3000
FRONTEND_URL="https://your-frontend-domain.com"
BCRYPT_ROUNDS=12
NODE_ENV=production
```

### 7.2 数据库迁移

```bash
# 生产环境迁移
npx prisma migrate deploy
```

### 7.3 构建项目

```bash
npm run build
```

### 7.4 启动服务

```bash
# 使用 PM2 管理进程
npm install -g pm2
pm2 start dist/main.js --name lowcode-backend

# 或使用 Node.js 直接启动
node dist/main.js
```

### 7.5 推荐部署平台

1. **Railway** - 简单易用，支持自动部署
2. **Render** - 免费层可用，支持 PostgreSQL
3. **Heroku** - 老牌 PaaS 平台
4. **AWS EC2** - 完全控制，适合大规模部署
5. **Vercel** - 适合无服务器部署

### 7.6 数据库部署

1. **Supabase** - 免费 PostgreSQL，500MB 存储
2. **Railway** - 集成数据库服务
3. **Amazon RDS** - 生产级数据库
4. **自建 PostgreSQL** - Docker 部署

---

## 8. 环境变量配置

### 8.1 创建 `.env.example`

```env
# 数据库配置
DATABASE_URL=postgresql://username:password@localhost:5432/lowcode_db

# JWT 配置
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d

# 服务器配置
PORT=3000
NODE_ENV=development

# 前端 URL (CORS)
FRONTEND_URL=http://localhost:5173

# 密码加密
BCRYPT_ROUNDS=10
```

### 8.2 环境变量说明

| 变量 | 说明 | 示例 |
|------|------|------|
| DATABASE_URL | PostgreSQL 连接字符串 | postgresql://user:pass@localhost:5432/db |
| JWT_SECRET | JWT 签名密钥（至少32位随机字符） | a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6 |
| JWT_EXPIRES_IN | Token 有效期 | 7d / 24h / 3600 |
| PORT | 服务器端口 | 3000 |
| FRONTEND_URL | 前端地址（CORS白名单） | http://localhost:5173 |
| BCRYPT_ROUNDS | bcrypt 加密轮数（10-12） | 10 |

---

## 9. 常用命令

```bash
# 开发模式运行
npm run start:dev

# 生产模式运行
npm run start:prod

# 数据库迁移
npx prisma migrate dev
npx prisma migrate deploy

# 生成 Prisma Client
npx prisma generate

# 打开 Prisma Studio (可视化数据库工具)
npx prisma studio

# 格式化代码
npm run format

# Lint 检查
npm run lint
```

---

## 10. 故障排查

### 10.1 数据库连接失败

```bash
# 检查 PostgreSQL 是否运行
psql -U username -d lowcode_db

# 验证 DATABASE_URL 格式
echo $DATABASE_URL
```

### 10.2 JWT Token 验证失败

- 检查 `JWT_SECRET` 是否一致
- 确认前端传递的 Token 格式：`Bearer <token>`
- 检查 Token 是否过期

### 10.3 CORS 错误

- 确认 `FRONTEND_URL` 配置正确
- 检查前端请求是否包含 `credentials: 'include'`

---

## 11. 下一步

完成后端搭建后：

1. ✅ 使用 Postman/Insomnia 测试所有 API 接口
2. ✅ 编写单元测试和集成测试
3. ✅ 配置生产环境数据库
4. ✅ 部署到云平台
5. ✅ 前端集成对接

---

## 参考资料

- [Nest.js 官方文档](https://docs.nestjs.com/)
- [Prisma 文档](https://www.prisma.io/docs)
- [JWT 最佳实践](https://tools.ietf.org/html/rfc7519)
- [PostgreSQL 文档](https://www.postgresql.org/docs/)

---

**文档版本**: v1.0  
**最后更新**: 2025-11-15  
**维护者**: 低代码平台开发团队
