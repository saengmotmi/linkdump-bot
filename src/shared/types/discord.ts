/**
 * Discord Webhook 관련 타입 정의
 * discord-api-types 패키지의 공식 타입을 사용
 */

import type {
  RESTPostAPIWebhookWithTokenJSONBody,
  APIEmbed,
  APIEmbedField,
} from "discord-api-types/v10";

export type DiscordWebhookPayload = RESTPostAPIWebhookWithTokenJSONBody;
export type DiscordEmbed = APIEmbed;
export type DiscordEmbedField = APIEmbedField;

// 웹훅 응답 타입 (필요한 경우)
export interface DiscordWebhookResponse {
  id: string;
  type: number;
  content?: string;
  channel_id: string;
  author: {
    id: string;
    username: string;
    avatar?: string;
    discriminator: string;
    public_flags: number;
    bot?: boolean;
  };
  attachments: unknown[];
  embeds: DiscordEmbed[];
  mentions: unknown[];
  mention_roles: unknown[];
  pinned: boolean;
  mention_everyone: boolean;
  tts: boolean;
  timestamp: string;
  edited_timestamp?: string;
  flags: number;
  webhook_id: string;
}
