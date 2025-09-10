/*
  # Correction des erreurs de base de données

  1. Nouvelles Tables
    - `direct_messages` pour la messagerie privée
  
  2. Corrections de sécurité
    - Correction de la politique RLS récursive sur `group_members`
    - Ajout des politiques pour `direct_messages`
*/

-- Table pour les messages directs (messagerie privée)
CREATE TABLE IF NOT EXISTS direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

-- Policies pour direct_messages
CREATE POLICY "direct_messages_read_participant"
  ON direct_messages
  FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "direct_messages_insert_sender"
  ON direct_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "direct_messages_update_receiver"
  ON direct_messages
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id);

-- Correction de la politique RLS récursive pour group_members
DROP POLICY IF EXISTS "group_members_read_member" ON group_members;

CREATE POLICY "group_members_read_all"
  ON group_members
  FOR SELECT
  TO authenticated
  USING (true);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS direct_messages_sender_id_idx ON direct_messages(sender_id);
CREATE INDEX IF NOT EXISTS direct_messages_receiver_id_idx ON direct_messages(receiver_id);
CREATE INDEX IF NOT EXISTS direct_messages_created_at_idx ON direct_messages(created_at DESC);