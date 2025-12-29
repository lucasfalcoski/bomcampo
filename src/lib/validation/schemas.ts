import { z } from 'zod';

// Auth schemas
export const emailSchema = z
  .string()
  .trim()
  .min(1, { message: 'E-mail é obrigatório' })
  .email({ message: 'E-mail inválido' })
  .max(255, { message: 'E-mail muito longo' });

export const passwordSchema = z
  .string()
  .min(6, { message: 'Senha deve ter pelo menos 6 caracteres' })
  .max(128, { message: 'Senha muito longa' });

export const nameSchema = z
  .string()
  .trim()
  .min(2, { message: 'Nome deve ter pelo menos 2 caracteres' })
  .max(100, { message: 'Nome muito longo' });

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const signupSchema = z.object({
  nome: nameSchema,
  email: emailSchema,
  password: passwordSchema,
});

// Farm schemas
export const farmNameSchema = z
  .string()
  .trim()
  .min(1, { message: 'Nome da fazenda é obrigatório' })
  .max(100, { message: 'Nome muito longo' });

export const areaSchema = z
  .string()
  .optional()
  .refine(
    (val) => !val || (!isNaN(parseFloat(val)) && parseFloat(val) > 0),
    { message: 'Área deve ser maior que zero' }
  );

export const estadoSchema = z
  .string()
  .max(2, { message: 'Use a sigla do estado (ex: SP)' })
  .optional();

export const farmSchema = z.object({
  nome: farmNameSchema,
  area_ha: areaSchema,
  cidade: z.string().max(100, { message: 'Cidade muito longa' }).optional(),
  estado: estadoSchema,
  pais: z.string().max(100, { message: 'País muito longo' }).optional(),
});

// Plot schemas
export const plotNameSchema = z
  .string()
  .trim()
  .min(1, { message: 'Nome do talhão é obrigatório' })
  .max(100, { message: 'Nome muito longo' });

export const latitudeSchema = z
  .string()
  .optional()
  .refine(
    (val) => !val || (!isNaN(parseFloat(val)) && parseFloat(val) >= -90 && parseFloat(val) <= 90),
    { message: 'Latitude deve estar entre -90 e 90' }
  );

export const longitudeSchema = z
  .string()
  .optional()
  .refine(
    (val) => !val || (!isNaN(parseFloat(val)) && parseFloat(val) >= -180 && parseFloat(val) <= 180),
    { message: 'Longitude deve estar entre -180 e 180' }
  );

export const plotSchema = z.object({
  nome: plotNameSchema,
  area_ha: areaSchema,
  solo_tipo: z.string().max(50, { message: 'Tipo de solo muito longo' }).optional(),
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  municipality_name: z.string().max(100, { message: 'Nome do município muito longo' }).optional(),
});

// Chat/Message schemas
export const messageSchema = z
  .string()
  .trim()
  .min(1, { message: 'Mensagem não pode estar vazia' })
  .max(5000, { message: 'Mensagem muito longa (máximo 5000 caracteres)' });

// Email schemas (for edge functions)
export const sendEmailSchema = z.object({
  to: emailSchema,
  subject: z
    .string()
    .trim()
    .min(1, { message: 'Assunto é obrigatório' })
    .max(200, { message: 'Assunto muito longo' }),
  html: z
    .string()
    .min(1, { message: 'Conteúdo do e-mail é obrigatório' })
    .max(50000, { message: 'Conteúdo do e-mail muito longo' }),
});

// Utility function to safely validate and get errors
export function validateWithSchema<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    errors: result.error.errors.map((e) => e.message),
  };
}

// Get first error message from validation
export function getFirstError<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): string | null {
  const result = schema.safeParse(data);
  if (result.success) {
    return null;
  }
  return result.error.errors[0]?.message || 'Dados inválidos';
}
