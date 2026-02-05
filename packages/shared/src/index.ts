import { z } from "zod";

/**
 * Shared Type Definitions for the Monorepo
 */

export const TodoSchema = z.object({
	id: z.union([z.string(), z.number()]),
	content: z.string().min(1),
	completed: z.boolean().default(false),
	fileUrl: z.string().optional().nullable(),
	fileName: z.string().optional().nullable(),
	createdAt: z.string(),
});

export const CreateTodoSchema = z.object({
	content: z.string().min(1),
	completed: z.boolean().optional(),
	fileUrl: z.string().optional().nullable(),
	fileName: z.string().optional().nullable(),
});

export type Todo = z.infer<typeof TodoSchema>;
export type CreateTodo = z.infer<typeof CreateTodoSchema>;
