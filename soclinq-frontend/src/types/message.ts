export interface BaseMessage {
    id: string;
    text: string;
    senderId: string;
    createdAt: string;
  }
  
  export interface ChatMessage extends BaseMessage {
    type: "chat";
    readBy: string[];
  }
  
  export interface Announcement extends BaseMessage {
    type: "announcement";
    pinned: boolean;
  }
  
  export type CommunityMessage =
    | ChatMessage
    | Announcement;
  