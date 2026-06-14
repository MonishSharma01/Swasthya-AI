-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.patients (
  id text NOT NULL DEFAULT (gen_random_uuid())::text,
  full_name text NOT NULL,
  age integer,
  phone_number text NOT NULL UNIQUE,
  gender text,
  location text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT patients_pkey PRIMARY KEY (id)
);
CREATE TABLE public.family_groups (
  id text NOT NULL DEFAULT (gen_random_uuid())::text,
  family_name text NOT NULL,
  family_code text NOT NULL UNIQUE CHECK (family_code ~ '^[0-9]{6}$'::text),
  created_by text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT family_groups_pkey PRIMARY KEY (id),
  CONSTRAINT family_groups_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.patients(id)
);
CREATE TABLE public.family_members (
  id text NOT NULL DEFAULT (gen_random_uuid())::text,
  family_id text NOT NULL,
  patient_id text NOT NULL,
  role text DEFAULT 'member'::text,
  joined_at timestamp with time zone DEFAULT now(),
  CONSTRAINT family_members_pkey PRIMARY KEY (id),
  CONSTRAINT family_members_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.family_groups(id),
  CONSTRAINT family_members_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id)
);
CREATE TABLE public.medical_information (
  id text NOT NULL DEFAULT (gen_random_uuid())::text,
  patient_id text NOT NULL UNIQUE,
  weight text,
  height text,
  blood_type text,
  allergies text,
  blood_pressure text,
  heart_rate text,
  oxygen_level text,
  surgeries text,
  chronic_conditions text,
  vaccinations text,
  family_genetics text,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT medical_information_pkey PRIMARY KEY (id),
  CONSTRAINT medical_information_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id)
);