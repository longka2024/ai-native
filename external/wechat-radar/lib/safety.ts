import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { DATA_DIR, readConfig } from './config';
import { wxDbPaths } from './wechat-db-adapter';

export function legacyWxAllowed(): boolean {
  return process.env.WECHAT_RADAR_ALLOW_LEGACY_WX === '1';
}

export function llmRawContentEgressAllowed(): boolean {
  return process.env.WECHAT_RADAR_ALLOW_LLM_EGRESS === '1';
}

export function shouldUseLegacyWx(): boolean {
  return readConfig().wechatDataSource === 'wx' && legacyWxAllowed();
}

export function safetyStatus() {
  const cfg = readConfig();
  const paths = wxDbPaths();
  return {
    data_source_requested: cfg.wechatDataSource,
    effective_data_source: shouldUseLegacyWx() ? 'wx' : 'db',
    legacy_wx_allowed: legacyWxAllowed(),
    legacy_wx_blocked:
      cfg.wechatDataSource === 'wx' && !legacyWxAllowed()
        ? 'WECHAT_RADAR_DATA_SOURCE=wx was ignored because WECHAT_RADAR_ALLOW_LEGACY_WX is not 1.'
        : null,
    llm_raw_content_egress_allowed: llmRawContentEgressAllowed(),
    local_paths: {
      data_dir: DATA_DIR,
      collector_db: paths.collectorDb,
      decrypted_dir: paths.decryptedDir,
      radar_db: join(DATA_DIR, 'radar.db'),
    },
    sensitive_files: [
      sensitiveFile(paths.collectorDb, 'collector_db'),
      sensitiveFile(join(cfg.wechatAssistantDir, 'assistant.db'), 'assistant_db'),
      sensitiveFile(join(cfg.wechatAssistantDir, 'all_keys.json'), 'all_keys'),
      sensitiveFile(join(DATA_DIR, 'radar.db'), 'radar_db'),
    ].filter((item) => item.exists),
  };
}

function sensitiveFile(path: string, kind: string) {
  try {
    const exists = existsSync(path);
    const size = exists ? statSync(path).size : 0;
    return { kind, path, exists, size };
  } catch {
    return { kind, path, exists: false, size: 0 };
  }
}
