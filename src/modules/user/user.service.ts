import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { UserRepository } from './repositories/user.repository';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  /**
   * Business logic for creating a user.
   * Checks if the user already exists before calling the repository.
   */
  async create(createUserDto: CreateUserDto) {
    const existingUser = await this.userRepository.findByGithubId(
      createUserDto.githubId,
    );

    if (existingUser) {
      throw new ConflictException('User with this GitHub ID already exists');
    }

    return this.userRepository.create(createUserDto);
  }

  /**
   * Business logic for finding a user by GitHub ID.
   */
  async findByGithubId(githubId: string) {
    const user = await this.userRepository.findByGithubId(githubId);

    if (!user) {
      throw new NotFoundException(`User with GitHub ID ${githubId} not found`);
    }

    return user;
  }
}
