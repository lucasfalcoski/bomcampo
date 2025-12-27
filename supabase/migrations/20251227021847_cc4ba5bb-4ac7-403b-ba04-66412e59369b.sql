-- Policy for partner agronomists/admins to view conversations from their partner
CREATE POLICY "conv_select_partner_agronomist"
ON fala_agronomo_conversation FOR SELECT
TO authenticated
USING (
  partner_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN profiles p ON p.id = ur.user_id
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('partner_agronomist', 'partner_admin', 'system_admin')
      AND p.partner_id = fala_agronomo_conversation.partner_id
  )
);