-- Reuse is checked within the same database mutation as settings changes.
-- Nonmaterial changes may retain the current version, but previously retired
-- terms labels cannot be restored with a different commercial configuration.
CREATE TRIGGER installer_historical_terms_version_guard BEFORE UPDATE OF config_json ON installer_platform_settings
WHEN json_extract(NEW.config_json,'$.termsVersion') IS NOT json_extract(OLD.config_json,'$.termsVersion') BEGIN
 SELECT CASE WHEN EXISTS(SELECT 1 FROM installer_settings_revisions WHERE json_extract(config_json,'$.termsVersion')=json_extract(NEW.config_json,'$.termsVersion')) THEN RAISE(ABORT,'historical terms version cannot be reused') END;
END;
