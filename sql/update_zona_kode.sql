-- Update zona kode from zona-01, zona-02, etc to 1, 2, 3, etc
-- This simplifies the zona identification system

-- First, check current zonas
SELECT id, kode, nama FROM zonas ORDER BY id;

-- Update kode for each zona (1-17)
UPDATE zonas SET kode = '1' WHERE kode = 'zona-01';
UPDATE zonas SET kode = '2' WHERE kode = 'zona-02';
UPDATE zonas SET kode = '3' WHERE kode = 'zona-03';
UPDATE zonas SET kode = '4' WHERE kode = 'zona-04';
UPDATE zonas SET kode = '5' WHERE kode = 'zona-05';
UPDATE zonas SET kode = '6' WHERE kode = 'zona-06';
UPDATE zonas SET kode = '7' WHERE kode = 'zona-07';
UPDATE zonas SET kode = '8' WHERE kode = 'zona-08';
UPDATE zonas SET kode = '9' WHERE kode = 'zona-09';
UPDATE zonas SET kode = '10' WHERE kode = 'zona-10';
UPDATE zonas SET kode = '11' WHERE kode = 'zona-11';
UPDATE zonas SET kode = '12' WHERE kode = 'zona-12';
UPDATE zonas SET kode = '13' WHERE kode = 'zona-13';
UPDATE zonas SET kode = '14' WHERE kode = 'zona-14';
UPDATE zonas SET kode = '15' WHERE kode = 'zona-15';
UPDATE zonas SET kode = '16' WHERE kode = 'zona-16';
UPDATE zonas SET kode = '17' WHERE kode = 'zona-17';

-- Verify updates
SELECT id, kode, nama FROM zonas ORDER BY id;
