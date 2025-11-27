-- Add model transform settings to building_3d_settings table
ALTER TABLE building_3d_settings 
ADD COLUMN model_position_x NUMERIC DEFAULT 0,
ADD COLUMN model_position_y NUMERIC DEFAULT 0,
ADD COLUMN model_position_z NUMERIC DEFAULT 0,
ADD COLUMN model_rotation_x NUMERIC DEFAULT 0,
ADD COLUMN model_rotation_y NUMERIC DEFAULT 0,
ADD COLUMN model_rotation_z NUMERIC DEFAULT 0,
ADD COLUMN model_scale NUMERIC DEFAULT 1.5;

COMMENT ON COLUMN building_3d_settings.model_position_x IS 'Model X position (left/right)';
COMMENT ON COLUMN building_3d_settings.model_position_y IS 'Model Y position (up/down)';
COMMENT ON COLUMN building_3d_settings.model_position_z IS 'Model Z position (front/back)';
COMMENT ON COLUMN building_3d_settings.model_rotation_x IS 'Model X rotation in degrees';
COMMENT ON COLUMN building_3d_settings.model_rotation_y IS 'Model Y rotation in degrees';
COMMENT ON COLUMN building_3d_settings.model_rotation_z IS 'Model Z rotation in degrees';
COMMENT ON COLUMN building_3d_settings.model_scale IS 'Model scale multiplier';