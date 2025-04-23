/*
  # Add Database Functions for Opportunity Verification
  
  1. New Functions
    - approve_opportunity: Approves an opportunity
    - reject_opportunity: Rejects an opportunity with a reason
  
  2. Security
    - Functions can only be called by authenticated users
*/

-- Function to approve an opportunity
CREATE OR REPLACE FUNCTION approve_opportunity(opportunity_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE opportunities
  SET 
    verification_status = 'approved',
    is_verified = true,
    rejection_reason = null,
    updated_at = now()
  WHERE id = opportunity_id
  AND verification_status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Failed to approve opportunity';
  END IF;
END;
$$;

-- Function to reject an opportunity
CREATE OR REPLACE FUNCTION reject_opportunity(opportunity_id uuid, reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF reason IS NULL OR trim(reason) = '' THEN
    RAISE EXCEPTION 'Rejection reason is required';
  END IF;

  UPDATE opportunities
  SET 
    verification_status = 'rejected',
    is_verified = false,
    rejection_reason = reason,
    updated_at = now()
  WHERE id = opportunity_id
  AND verification_status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Failed to reject opportunity';
  END IF;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION approve_opportunity TO authenticated;
GRANT EXECUTE ON FUNCTION reject_opportunity TO authenticated;