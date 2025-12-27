-- Create enums for the Fala Agrônomo feature

CREATE TYPE public.user_origin AS ENUM ('B2C', 'B2B');

CREATE TYPE public.fala_agronomo_context AS ENUM ('B2C', 'B2B');

CREATE TYPE public.message_sender_type AS ENUM ('user', 'agronomist', 'system');