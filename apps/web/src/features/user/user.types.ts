export interface User {
  id: string;
  username: string;
  role: "owner" | "admin" | "member" | "viewer";
  createdAt: Date;
}
