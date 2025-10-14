-- Remove duplicate crops (keeping the older ones with earlier created_at)
DELETE FROM public.crops 
WHERE id IN (
  '142a0b4a-d030-4e76-b50b-f071ab6fc490',
  '564c1cd8-69ac-411f-8650-ebe607f500a1',
  '372e07f1-26d3-4baa-b825-7a0a15af7668',
  '34d52c6d-e2c8-4349-9deb-971419affaeb',
  '2b1091b8-2d32-492c-8a99-933168c1d284',
  'f1fe30e2-405e-4d9d-9f0d-557ddb1975c3',
  'b417428a-da4f-497e-88b4-7409300c5661',
  'ac4c6ec2-8751-4095-a62f-d6efe6ddf7f9',
  'c6323f6d-10ba-4cdb-8f6d-6a0970ba91e3',
  'f8ed5c56-11f5-4283-8b5e-01b673bf81cd',
  '11fcee40-1201-43eb-803e-700ca57939f2',
  '62196d77-6f44-45f9-bcde-207d3a315bb0'
);