import { Get, Param, Request, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { ApiController } from 'src/shared/decorators/api-controller.decorator';
import { Auth } from 'src/shared/decorators/auth.decorator';
import { Role } from 'src/shared/enums/role.enum';
import { FdpgRequest } from 'src/shared/types/request-user.interface';
import { FeasibilityUserQueryDetailDto } from './dto/feasibility-user-query-detail.dto';
import { FeasibilityService } from './feasibility.service';

@Auth(Role.Researcher)
@ApiController('feasibilities')
export class FeasibilityController {
  constructor(private readonly feasibilityService: FeasibilityService) {}

  @Get()
  @UsePipes(ValidationPipe)
  @ApiOperation({ summary: 'Returns all saved feasibility queries for the user' })
  async getQueriesByUser(@Request() { user }: FdpgRequest): Promise<FeasibilityUserQueryDetailDto[]> {
    return this.feasibilityService.getQueriesByUser(user.userId);
  }

  @Get('/redirect/:queryId')
  @Auth(Role.DizMember, Role.FdpgMember)
  async getRedirectUrl(
    @Param('queryId') queryId: number,
    @Request() { user }: FdpgRequest,
  ): Promise<{ redirectUrl: string }> {
    return await this.feasibilityService.getRedirectUrl(queryId, user.userId);
  }
}
