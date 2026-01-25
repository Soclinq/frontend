export type GroupLevel =
  | "TOWN"
  | "LGA"
  | "STATE"
  | "NATIONAL";

export interface Group {
  id: string;
  name: string;
  level: GroupLevel;
  parentId?: string;
  createdAt: string;
}
