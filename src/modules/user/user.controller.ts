import { Controller, Post, Get, Body, Param, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Request } from 'express';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { Roles } from '@core/decorators/roles.decorator';
import { Role, User } from '@prisma/client';

interface RequestWithUser extends Request {
  user: User;
}

@ApiTags('users')
@Controller('users')
@Roles(Role.ADMIN)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @Roles(Role.ADMIN, Role.ANALYST)
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiResponse({ status: 200, description: 'Current user profile.' })
  me(@Req() req: RequestWithUser) {
    return {
      status: 'success',
      data: req.user,
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User successfully created.' })
  @ApiResponse({ status: 409, description: 'User already exists.' })
  async create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Get(':githubId')
  @ApiOperation({ summary: 'Get a user by GitHub ID' })
  @ApiResponse({ status: 200, description: 'User found.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async findOne(@Param('githubId') githubId: string) {
    return this.userService.findByGithubId(githubId);
  }
}
