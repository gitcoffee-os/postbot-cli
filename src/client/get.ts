import { ClientApi, PlatformApi } from '@gitcoffee/postbot-sdk';
import { appName, createApiClient } from '../config.js';
import type { GlobalOptions } from '../cli.js';
import { formatDateTime, printHeading, printJson, printKeyValues } from '../output.js';
import { isClientOnline } from '../resources.js';
import { normalizePlatformCode } from '../platform/registry.js';

export async function clientGet(clientId: string, global: GlobalOptions): Promise<void> {
  const id = Number(clientId);
  if (!Number.isInteger(id) || id < 1) throw new Error(`客户端 ID 非法: ${clientId}`);

  const client = createApiClient(appName(global.app));
  const [mediaClient, platforms] = await Promise.all([
    new ClientApi(client).get(id),
    new PlatformApi(client).list(),
  ]);

  const platform = platforms.find((item) => Number(item.id) === Number(mediaClient.mediaPlatformId));

  if (global.json) {
    printJson({ ...mediaClient, online: isClientOnline(mediaClient), platformCode: platform?.code });
    return;
  }

  printHeading(`客户端 #${mediaClient.id}`);
  printKeyValues([
    ['名称', mediaClient.name],
    ['类型', mediaClient.type],
    ['Client Key', mediaClient.clientKey],
    ['在线', isClientOnline(mediaClient) ? '是' : '否'],
    ['最后在线', formatDateTime(mediaClient.lastOnlineAt)],
    ['平台', platform ? `${platform.name} (${normalizePlatformCode(platform.code)})` : mediaClient.mediaPlatformId],
    ['账号 ID', mediaClient.mediaAccountId],
    ['SessionBot 会话 ID', mediaClient.sessionbotSessionId],
    ['用户 ID', mediaClient.userId],
  ]);
}
