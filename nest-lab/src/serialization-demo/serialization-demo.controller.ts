import { ClassSerializerInterceptor, Controller, Get, SerializeOptions, UseInterceptors } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator.js';
import { UsersService } from '../users/users.service.js';
import { UserBlacklistEntity, UserWhitelistEntity } from './user-entities.js';

// Day 18 实验专用:同一个用户(id=1),用不同方式「装进外卖盒」。
// 不挂进 AppModule,只在 day18 脚本和测试里临时组装。
@Public()
@UseInterceptors(ClassSerializerInterceptor) // 出餐口的打包检查员:只认 class 实例上的装饰器
@Controller('serialization-demo')
export class SerializationDemoController {
  constructor(private readonly users: UsersService) {}

  // 直接把内部对象 return 出去
  @Get('raw')
  raw() {
    return this.users.findOne(1);
  }

  // 黑名单:class 实例 + @Exclude(passwordHash)
  @Get('blacklist')
  blacklist() {
    return new UserBlacklistEntity(this.users.findOne(1));
  }

  // 黑名单,但手滑返回了普通对象(展开运算符把 class 实例变成了普通对象)
  @Get('blacklist-plain')
  blacklistPlain() {
    return { ...new UserBlacklistEntity(this.users.findOne(1)) };
  }

  // 白名单:excludeAll + @Expose
  @SerializeOptions({ strategy: 'excludeAll' })
  @Get('whitelist')
  whitelist() {
    return new UserWhitelistEntity(this.users.findOne(1));
  }

  // 白名单 + groups:管理员视图
  @SerializeOptions({ strategy: 'excludeAll', groups: ['admin'] })
  @Get('whitelist-admin')
  whitelistAdmin() {
    return new UserWhitelistEntity(this.users.findOne(1));
  }

  // 白名单,但返回了普通对象
  @SerializeOptions({ strategy: 'excludeAll' })
  @Get('whitelist-plain')
  whitelistPlain() {
    return { ...new UserWhitelistEntity(this.users.findOne(1)) };
  }

  // 白名单 + 普通对象,但用 @SerializeOptions({ type }) 告诉检查员「按这个类来查」(Nest 10+)
  @SerializeOptions({ strategy: 'excludeAll', type: UserWhitelistEntity })
  @Get('whitelist-plain-typed')
  whitelistPlainTyped() {
    return { ...this.users.findOne(1) };
  }
}
