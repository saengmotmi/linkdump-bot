/**
 * Discord Webhook 관련 타입 정의
 */

export interface DiscordWebhookPayload {
  content?: string;
  username?: string;
  avatar_url?: string;
  tts?: boolean;
  embeds?: DiscordEmbed[];
  allowed_mentions?: {
    parse?: ("roles" | "users" | "everyone")[];
    roles?: string[];
    users?: string[];
    replied_user?: boolean;
  };
}

export interface DiscordEmbed {
  title?: string;
  type?: "rich" | "image" | "video" | "gifv" | "article" | "link";
  description?: string;
  url?: string;
  timestamp?: string;
  color?: number;
  footer?: {
    text: string;
    icon_url?: string;
    proxy_icon_url?: string;
  };
  image?: {
    url: string;
    proxy_url?: string;
    height?: number;
    width?: number;
  };
  thumbnail?: {
    url: string;
    proxy_url?: string;
    height?: number;
    width?: number;
  };
  video?: {
    url?: string;
    proxy_url?: string;
    height?: number;
    width?: number;
  };
  provider?: {
    name?: string;
    url?: string;
  };
  author?: {
    name: string;
    url?: string;
    icon_url?: string;
    proxy_icon_url?: string;
  };
  fields?: DiscordEmbedField[];
}

export interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

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
