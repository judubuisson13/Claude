import { integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';
export const records = sqliteTable('records',{userId:text('user_id').notNull(),id:text('id').notNull(),kind:text('kind').notNull(),data:text('data').notNull(),version:integer('version').notNull().default(1),updatedAt:text('updated_at').notNull()}, t=>[primaryKey({columns:[t.userId,t.id]})]);
