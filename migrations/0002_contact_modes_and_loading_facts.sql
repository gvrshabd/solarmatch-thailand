PRAGMA foreign_keys = OFF;

CREATE TABLE contact_configuration_versions (
  id TEXT PRIMARY KEY,
  version_number INTEGER NOT NULL UNIQUE,
  state TEXT NOT NULL CHECK (state IN ('draft', 'published', 'archived')),
  contact_collection_mode TEXT NOT NULL CHECK (contact_collection_mode IN ('disabled', 'validation_interest', 'named_installer_handoff')),
  contact_collection_enabled INTEGER NOT NULL DEFAULT 0 CHECK (contact_collection_enabled IN (0, 1)),
  retention_days INTEGER CHECK (retention_days BETWEEN 1 AND 3650),
  receiving_company_en TEXT,
  receiving_company_th TEXT,
  receiving_company_privacy_url TEXT,
  permitted_contact_methods_json TEXT NOT NULL DEFAULT '["phone","line"]' CHECK (json_valid(permitted_contact_methods_json)),
  shared_fields_json TEXT NOT NULL DEFAULT '["legalFirstName","legalLastName","phone","preferredContactMethod","lineId","assessmentAnswers"]' CHECK (json_valid(shared_fields_json)),
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  published_by TEXT,
  published_at TEXT,
  archived_at TEXT,
  restored_from_id TEXT REFERENCES contact_configuration_versions(id),
  CHECK (contact_collection_mode <> 'disabled' OR contact_collection_enabled = 0),
  CHECK (contact_collection_mode <> 'validation_interest' OR (receiving_company_en IS NULL AND receiving_company_th IS NULL AND receiving_company_privacy_url IS NULL)),
  CHECK (contact_collection_mode <> 'named_installer_handoff' OR contact_collection_enabled = 0 OR (receiving_company_en IS NOT NULL AND receiving_company_th IS NOT NULL AND receiving_company_privacy_url IS NOT NULL AND retention_days IS NOT NULL))
);

INSERT INTO contact_configuration_versions
  (id, version_number, state, contact_collection_mode, contact_collection_enabled, created_by, published_by, published_at)
VALUES
  ('contact-configuration-legacy-v0', 0, 'archived', 'named_installer_handoff', 0, 'system:migration-0002', 'system:migration-0002', CURRENT_TIMESTAMP),
  ('contact-configuration-v1', 1, 'published', 'disabled', 0, 'system:migration-0002', 'system:migration-0002', CURRENT_TIMESTAMP);

-- Public contact language belongs to the immutable content version. Merge the
-- new mode-specific copy without removing keys used by the Worker version that
-- remains live during this additive migration.
UPDATE content_versions
SET content_json = json_patch(content_json, '{"contactModes":{"validation_interest":{"question":{"en":"Would you like SolarMatch to contact you about the next step toward arranging a solar site assessment?","th":"ต้องการให้ SolarMatch ติดต่อกลับเพื่อแนะนำขั้นตอนถัดไปในการนัดสำรวจหน้างานไหม?"},"help":{"en":"We can confirm your interest and explain what normally happens next. During this validation stage, your details will remain with SolarMatch and will not be sent to a solar company without asking you first.","th":"เราจะติดต่อเพื่อยืนยันความสนใจและอธิบายขั้นตอนถัดไป ในช่วงทดสอบนี้ข้อมูลของคุณจะเก็บไว้กับ SolarMatch และจะไม่ถูกส่งต่อให้บริษัทโซลาร์ เว้นแต่เราจะขอและได้รับความยินยอมจากคุณอีกครั้ง"},"yesLabel":{"en":"Yes, SolarMatch may contact me","th":"ต้องการให้ SolarMatch ติดต่อกลับ"},"noLabel":{"en":"Not right now","th":"ยังไม่ต้องการตอนนี้"},"consent":{"en":"I agree that SolarMatch may store my contact request and contact me through my selected method about the next step toward a residential solar site assessment. My details will not be shared with a solar company without separate permission.","th":"ฉันยินยอมให้ SolarMatch จัดเก็บคำขอติดต่อและติดต่อกลับผ่านช่องทางที่เลือก เพื่อแนะนำขั้นตอนถัดไปในการนัดสำรวจหน้างานโซลาร์สำหรับที่พักอาศัย โดยข้อมูลของฉันจะไม่ถูกส่งต่อให้บริษัทโซลาร์หากยังไม่ได้รับความยินยอมแยกต่างหาก"}},"named_installer_handoff":{"question":{"en":"Would you like {{recipient}} to contact you to arrange a site assessment?","th":"ต้องการให้ {{recipient}} ติดต่อกลับเพื่อนัดสำรวจหน้างานไหม?"},"help":{"en":"If you continue, SolarMatch will send the information listed below to {{recipient}} so its team can contact you about a residential solar assessment and quotation.","th":"หากดำเนินการต่อ SolarMatch จะส่งข้อมูลตามรายการด้านล่างให้ {{recipient}} เพื่อให้ทีมงานติดต่อคุณเกี่ยวกับการประเมินหน้างานและใบเสนอราคาโซลาร์สำหรับที่พักอาศัย"},"yesLabel":{"en":"Yes, I would like to be contacted","th":"ต้องการให้ติดต่อ"},"noLabel":{"en":"Not right now","th":"ยังไม่ต้องการตอนนี้"},"consent":{"en":"I agree that SolarMatch may send the information listed below to {{recipient}} so that the company may contact me through my selected method about a residential solar site assessment and quotation. I have read the recipient’s Privacy Notice. I understand that SolarMatch is not the installer and may be paid by the receiving company.","th":"ฉันยินยอมให้ SolarMatch ส่งข้อมูลตามรายการด้านล่างให้ {{recipient}} เพื่อให้บริษัทติดต่อกลับผ่านช่องทางที่เลือก เกี่ยวกับการประเมินหน้างานและใบเสนอราคาโซลาร์สำหรับที่พักอาศัย ฉันได้อ่านประกาศความเป็นส่วนตัวของผู้รับข้อมูลแล้ว และเข้าใจว่า SolarMatch ไม่ใช่ผู้ติดตั้งและอาจได้รับค่าตอบแทนจากบริษัทผู้รับข้อมูล"}},"common":{"declineTitle":{"en":"Continue without contact details","th":"ดูผลประเมินต่อโดยไม่ต้องให้ข้อมูลติดต่อ"},"declineBody":{"en":"Your estimate is still available. You can continue now and reconsider later.","th":"คุณยังดูผลประเมินได้ตามปกติ และสามารถกลับมาเลือกให้ติดต่อภายหลังได้"},"declineContinueLabel":{"en":"Continue to my result","th":"ดูผลประเมินต่อ"},"skipLabel":{"en":"Continue to my results without submitting","th":"ดูผลประเมินต่อโดยไม่ส่งข้อมูลติดต่อ"},"failureTitle":{"en":"We could not save your contact request","th":"ยังบันทึกคำขอติดต่อไม่ได้"},"failureBody":{"en":"Your assessment and result are safe in this browser. You can try again or continue to your result without submitting contact details.","th":"คำตอบและผลประเมินของคุณยังอยู่ในเบราว์เซอร์นี้ คุณสามารถลองอีกครั้งหรือดูผลประเมินต่อโดยไม่ส่งข้อมูลติดต่อ"}}},"loading":{"title":{"en":"Preparing your solar estimate","th":"กำลังเตรียมผลประเมินโซลาร์ของคุณ"},"help":{"en":"While we prepare your result, here’s a quick solar fact.","th":"ระหว่างเตรียมผลประเมิน ลองดูเกร็ดน่ารู้เกี่ยวกับพลังงานแสงอาทิตย์"}}}')
WHERE id = 'residential-content-v1';

CREATE TABLE loading_fact_set_versions (
  id TEXT PRIMARY KEY,
  version_number INTEGER NOT NULL UNIQUE,
  state TEXT NOT NULL CHECK (state IN ('draft', 'published', 'archived')),
  schema_version INTEGER NOT NULL,
  document_json TEXT NOT NULL CHECK (json_valid(document_json)),
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  published_by TEXT,
  published_at TEXT,
  archived_at TEXT,
  restored_from_id TEXT REFERENCES loading_fact_set_versions(id)
);

CREATE TABLE loading_facts (
  id TEXT PRIMARY KEY,
  fact_set_version_id TEXT NOT NULL REFERENCES loading_fact_set_versions(id) ON DELETE CASCADE,
  stable_fact_id TEXT NOT NULL CHECK (stable_fact_id GLOB '[a-z0-9-]*'),
  display_order INTEGER NOT NULL CHECK (display_order >= 0),
  weight INTEGER NOT NULL DEFAULT 1 CHECK (weight BETWEEN 1 AND 20),
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  title_en TEXT NOT NULL,
  title_th TEXT NOT NULL,
  fact_copy_en TEXT NOT NULL,
  fact_copy_th TEXT NOT NULL,
  alt_en TEXT NOT NULL,
  alt_th TEXT NOT NULL,
  sketch_source_type TEXT NOT NULL CHECK (sketch_source_type IN ('built-in', 'r2-media')),
  built_in_sketch_id TEXT,
  media_asset_id TEXT REFERENCES media_assets(id),
  short_citation TEXT NOT NULL,
  reference_json TEXT NOT NULL CHECK (json_valid(reference_json)),
  source_context_en TEXT NOT NULL DEFAULT '',
  source_context_th TEXT NOT NULL DEFAULT '',
  resources_anchor TEXT NOT NULL CHECK (resources_anchor GLOB '[a-z0-9-]*'),
  source_reviewed_on TEXT NOT NULL,
  UNIQUE(fact_set_version_id, stable_fact_id),
  UNIQUE(fact_set_version_id, resources_anchor),
  CHECK ((sketch_source_type = 'built-in' AND built_in_sketch_id IS NOT NULL AND media_asset_id IS NULL) OR (sketch_source_type = 'r2-media' AND built_in_sketch_id IS NULL AND media_asset_id IS NOT NULL))
);

CREATE INDEX loading_facts_public ON loading_facts(fact_set_version_id, enabled, display_order);

INSERT INTO loading_fact_set_versions
  (id, version_number, state, schema_version, document_json, created_by, published_by, published_at)
VALUES
  ('solar-facts-v1', 1, 'published', 1, '{"id":"solar-facts-v1","schemaVersion":1}', 'system:migration-0002', 'system:migration-0002', CURRENT_TIMESTAMP);

INSERT INTO loading_facts
  (id, fact_set_version_id, stable_fact_id, display_order, weight, enabled, title_en, title_th, fact_copy_en, fact_copy_th, alt_en, alt_th, sketch_source_type, built_in_sketch_id, short_citation, reference_json, resources_anchor, source_reviewed_on)
VALUES
  ('solar-facts-v1:home-value', 'solar-facts-v1', 'home-value', 0, 1, 1, 'Boosting Home Value', 'เพิ่มมูลค่าให้บ้าน', 'Adding rooftop solar panels boosts a home''s resale value by roughly 4% on average compared to homes without them (Hoen et al., 2015).', 'การติดตั้งแผงโซลาร์บนหลังคาช่วยเพิ่มมูลค่าขายต่อของบ้านโดยเฉลี่ยประมาณ 4% เมื่อเทียบกับบ้านที่ไม่ได้ติดตั้ง (Hoen et al., 2015)', 'Monochrome line drawing of a cozy house wearing a small solar-panel hat beside an upward arrow.', 'ภาพลายเส้นสีเดียวของบ้านแสนอบอุ่นที่สวมแผงโซลาร์เหมือนหมวก พร้อมลูกศรชี้ขึ้นด้านข้าง', 'built-in', 'home-value', 'Hoen et al. (2015)', '{"citation":"Hoen et al. (2015)","fullReference":"Hoen, B., Adomatis, S., Jackson, T., Graff-Zivin, J., Thayer, M., Wong, G. T., & Fowlie, M. (2015). Selling into the sun: Price premium analysis of a multi-state dataset of solar homes (Report LBNL-6942E). Lawrence Berkeley National Laboratory.","url":"https://doi.org/10.2172/1239972","context":{"en":"This United States multi-state study describes an observed average resale-price association, not a guaranteed increase for a home in Thailand.","th":"งานวิจัยนี้ศึกษาข้อมูลการขายบ้านในหลายรัฐของสหรัฐอเมริกา ตัวเลขดังกล่าวเป็นความสัมพันธ์โดยเฉลี่ยที่สังเกตพบ ไม่ใช่การรับประกันว่าบ้านในประเทศไทยจะมีมูลค่าเพิ่มเท่ากัน"}}', 'home-value', '2026-09-01'),
  ('solar-facts-v1:carbon-trees', 'solar-facts-v1', 'carbon-trees', 1, 1, 1, 'Mini Rooftop Forest', 'ป่าเล็ก ๆ บนหลังคา', 'Powering a home with solar clears as much carbon each year as growing dozens of baby trees for a decade (U.S. Environmental Protection Agency, 2023).', 'การใช้โซลาร์จ่ายไฟให้บ้านช่วยลดคาร์บอนในแต่ละปีได้พอ ๆ กับการปลูกกล้าไม้หลายสิบต้นให้เติบโตนาน 10 ปี (U.S. Environmental Protection Agency, 2023)', 'Monochrome line drawing of two smiling young tree saplings growing side by side.', 'ภาพลายเส้นสีเดียวของต้นกล้าเล็ก ๆ สองต้นยิ้มและเติบโตอยู่เคียงข้างกัน', 'built-in', 'carbon-trees', 'U.S. Environmental Protection Agency (2023)', '{"citation":"U.S. Environmental Protection Agency (2023)","fullReference":"U.S. Environmental Protection Agency. (2023). Greenhouse gas equivalencies calculator. EPA.","url":"https://www.epa.gov/energy/greenhouse-gas-equivalencies-calculator","context":{"en":"The EPA calculator expresses emissions in familiar equivalents. The number of trees depends on the solar output and emissions assumptions used.","th":"เครื่องมือของ EPA แปลงการลดการปล่อยก๊าซเรือนกระจกเป็นหน่วยเปรียบเทียบที่เข้าใจง่าย จำนวนต้นไม้จริงขึ้นอยู่กับผลผลิตโซลาร์และสมมติฐานด้านการปล่อยก๊าซที่ใช้"}}', 'carbon-trees', '2026-09-01'),
  ('solar-facts-v1:neighbor-effect', 'solar-facts-v1', 'neighbor-effect', 2, 1, 1, 'Friendly Green Ripple', 'พลังสีเขียวส่งต่อถึงเพื่อนบ้าน', 'Putting solar on your roof inspires your street, making nearby neighbors up to 40% more likely to go solar too (Graziano & Gillingham, 2015).', 'การติดโซลาร์บนหลังคาของคุณช่วยสร้างแรงบันดาลใจให้คนในละแวกเดียวกัน ทำให้เพื่อนบ้านใกล้เคียงมีแนวโน้มติดโซลาร์เพิ่มขึ้นได้สูงสุด 40% (Graziano & Gillingham, 2015)', 'Monochrome line drawing of two neighboring houses smiling and giving each other a high-five across their fences.', 'ภาพลายเส้นสีเดียวของบ้านเพื่อนบ้านสองหลังยิ้มและแตะมือกันเหนือรั้ว', 'built-in', 'neighbor-effect', 'Graziano & Gillingham (2015)', '{"citation":"Graziano & Gillingham (2015)","fullReference":"Graziano, M., & Gillingham, K. (2015). Spatial patterns of solar photovoltaic system adoption: The influence of neighbors and the built environment. Journal of Economic Geography, 15(4), 815–839.","url":"https://doi.org/10.1093/jeg/lbu036","context":{"en":"The study observed spatial adoption effects in its study area. It does not guarantee the same response in every street or country.","th":"งานวิจัยพบรูปแบบการติดตั้งที่ส่งต่อกันในพื้นที่ศึกษา แต่ไม่ได้รับประกันว่าจะเกิดผลในระดับเดียวกันกับทุกชุมชนหรือทุกประเทศ"}}', 'neighbor-effect', '2026-09-01'),
  ('solar-facts-v1:patio-gardens', 'solar-facts-v1', 'patio-gardens', 3, 1, 1, 'Happy Patio Gardens', 'สวนกระถางแสนสุข', 'The gentle shade from residential panels helps potted herbs and greens thrive in the summer heat using less water (Barron-Gafford et al., 2019).', 'ร่มเงาอ่อน ๆ จากแผงโซลาร์สำหรับบ้านช่วยให้สมุนไพรและผักสวนครัวในกระถางเติบโตได้ดีท่ามกลางอากาศร้อนในฤดูร้อน โดยใช้น้ำน้อยลง (Barron-Gafford et al., 2019)', 'Monochrome line drawing of a potted basil plant wearing sunglasses beneath a small parasol.', 'ภาพลายเส้นสีเดียวของต้นโหระพาในกระถางสวมแว่นกันแดดและพักอยู่ใต้ร่มคันเล็ก', 'built-in', 'patio-gardens', 'Barron-Gafford et al. (2019)', '{"citation":"Barron-Gafford et al. (2019)","fullReference":"Barron-Gafford, G. A., Pavao-Zuckerman, M. A., Minor, R. L., Sutter, L. F., Barnett-Moreno, I., Blackett, D. T., Thompson, M., Dimond, K., Gerlak, A. K., Nabhan, G. P., & Macknick, J. E. (2019). Agrivoltaics provide mutual benefits across the food–energy–water nexus in drylands. Nature Sustainability, 2(9), 848–855.","url":"https://doi.org/10.1038/s41893-019-0364-5","context":{"en":"The source studied agrivoltaic growing conditions in drylands. A home patio plant will still depend on species, climate, drainage, and the amount of shade.","th":"แหล่งข้อมูลศึกษาการปลูกพืชร่วมกับแผงโซลาร์ในพื้นที่แห้งแล้ง ผลลัพธ์ของสวนกระถางที่บ้านยังขึ้นอยู่กับชนิดพืช ภูมิอากาศ การระบายน้ำ และปริมาณร่มเงา"}}', 'patio-gardens', '2026-09-01'),
  ('solar-facts-v1:water-use', 'solar-facts-v1', 'water-use', 4, 1, 1, 'Saving River Water', 'ช่วยรักษาสายน้ำ', 'Home solar makes clean electricity using almost no water, keeping local rivers and freshwater wildlife happy and thriving (Macknick et al., 2012).', 'โซลาร์สำหรับบ้านผลิตไฟฟ้าสะอาดโดยแทบไม่ใช้น้ำ ช่วยให้แม่น้ำในท้องถิ่นและสัตว์น้ำจืดยังคงดำรงชีวิตและเติบโตได้อย่างอุดมสมบูรณ์ (Macknick et al., 2012)', 'Monochrome line drawing of a cheerful small fish jumping from a sparkling water ripple.', 'ภาพลายเส้นสีเดียวของปลาตัวเล็กแสนร่าเริงกระโดดขึ้นจากระลอกน้ำเป็นประกาย', 'built-in', 'water-use', 'Macknick et al. (2012)', '{"citation":"Macknick et al. (2012)","fullReference":"Macknick, J., Newmark, R., Heath, G., & Hallett, K. C. (2012). Operational water consumption and withdrawal factors for electricity generating technologies: A review of existing literature. Environmental Research Letters, 7(4), Article 045802.","url":"https://doi.org/10.1088/1748-9326/7/4/045802","context":{"en":"The review compares operational water use across electricity technologies. Manufacturing and occasional panel cleaning are outside the short loading-screen statement.","th":"บทความทบทวนนี้เปรียบเทียบการใช้น้ำระหว่างการเดินระบบของเทคโนโลยีผลิตไฟฟ้าแต่ละประเภท โดยข้อความสั้นไม่ได้กล่าวถึงการผลิตอุปกรณ์หรือการล้างแผงเป็นครั้งคราว"}}', 'water-use', '2026-09-01');

-- Keep the public loading copy playful while preserving the complete research
-- limitations and corrected bibliographic details on the Resources page.
UPDATE loading_facts SET reference_json = '{"citation":"Hoen et al. (2015)","fullReference":"Hoen, B., Adomatis, S., Jackson, T., Graff-Zivin, J., Thayer, M. A., Klise, G. T., & Wiser, R. H. (2015). Selling Into the Sun: Price Premium Analysis of a Multi-State Dataset of Solar Homes (Report LBNL-6942E). Lawrence Berkeley National Laboratory.","url":"https://doi.org/10.2172/1239972","context":{"en":"This was a multi-state United States study of homes with owner-owned rooftop photovoltaic systems. It does not establish a guaranteed resale premium for an individual home or a Thailand-specific market effect.","th":"งานวิจัยนี้ศึกษาบ้านที่ติดตั้งระบบโซลาร์แบบเจ้าของระบบในหลายรัฐของสหรัฐอเมริกา จึงไม่ได้รับประกันว่าบ้านแต่ละหลังจะมีมูลค่าขายต่อเพิ่มขึ้นเท่ากัน หรือสะท้อนผลของตลาดอสังหาริมทรัพย์ไทยโดยตรง"}}' WHERE fact_set_version_id = 'solar-facts-v1' AND stable_fact_id = 'home-value';
UPDATE loading_facts SET reference_json = '{"citation":"U.S. Environmental Protection Agency (2023)","fullReference":"U.S. Environmental Protection Agency. (2023). Greenhouse Gas Equivalencies Calculator. EPA.","url":"https://www.epa.gov/energy/greenhouse-gas-equivalencies-calculator","context":{"en":"This is a simplified greenhouse-gas equivalency. The number of tree seedlings depends on the amount of solar electricity generated, the grid emissions displaced, and the calculator assumptions. It is not a fixed result for every home.","th":"ข้อความนี้เป็นการเปรียบเทียบปริมาณก๊าซเรือนกระจกแบบเข้าใจง่าย จำนวนต้นกล้าที่เทียบเท่าได้จริงขึ้นอยู่กับปริมาณไฟฟ้าที่ผลิตได้ การปล่อยคาร์บอนของไฟฟ้าที่ถูกทดแทน และสมมติฐานของเครื่องคำนวณ จึงไม่ใช่ตัวเลขตายตัวสำหรับบ้านทุกหลัง"}}' WHERE fact_set_version_id = 'solar-facts-v1' AND stable_fact_id = 'carbon-trees';
UPDATE loading_facts SET reference_json = '{"citation":"Graziano & Gillingham (2015)","fullReference":"Graziano, M., & Gillingham, K. (2015). Spatial patterns of solar photovoltaic system adoption: The influence of neighbors and the built environment. Journal of Economic Geography, 15(4), 815–839.","url":"https://doi.org/10.1093/jeg/lbu036","context":{"en":"This research examined geographic patterns of residential solar adoption in Connecticut, United States. The loading statement is simplified homeowner-facing editorial copy and should not be interpreted as a guaranteed effect for every neighborhood or as a Thailand-specific measured result.","th":"งานวิจัยนี้ศึกษารูปแบบการติดตั้งโซลาร์ตามพื้นที่ในรัฐคอนเนตทิคัต สหรัฐอเมริกา ข้อความบนหน้าจอโหลดเป็นการสรุปแบบเข้าใจง่ายสำหรับเจ้าของบ้าน ไม่ควรตีความว่าเป็นผลที่รับประกันสำหรับทุกชุมชนหรือเป็นตัวเลขที่วัดจากประเทศไทยโดยตรง"}}' WHERE fact_set_version_id = 'solar-facts-v1' AND stable_fact_id = 'neighbor-effect';
UPDATE loading_facts SET reference_json = '{"citation":"Barron-Gafford et al. (2019)","fullReference":"Barron-Gafford, G. A., Pavao-Zuckerman, M. A., Minor, R. L., Sutter, L. F., Barnett-Moreno, I., Blackett, D. T., Thompson, M., Dimond, K., Gerlak, A. K., Nabhan, G. P., & Macknick, J. E. (2019). Agrivoltaics provide mutual benefits across the food–energy–water nexus in drylands. Nature Sustainability, 2(9), 848–855.","url":"https://doi.org/10.1038/s41893-019-0364-5","context":{"en":"The cited study examined dryland agrivoltaics, where crops were grown beneath raised photovoltaic panels. It did not directly test ordinary residential rooftop panels shading patio pots. The loading statement is simplified homeowner-facing editorial copy.","th":"งานวิจัยที่อ้างถึงศึกษาระบบเกษตรร่วมกับโซลาร์ในพื้นที่แห้งแล้ง โดยปลูกพืชใต้แผงโซลาร์ที่ยกสูง ไม่ได้ทดสอบกระถางต้นไม้บนลานบ้านใต้แผงโซลาร์หลังคาทั่วไปโดยตรง ข้อความบนหน้าจอโหลดเป็นการสรุปแบบเข้าใจง่ายสำหรับเจ้าของบ้าน"}}' WHERE fact_set_version_id = 'solar-facts-v1' AND stable_fact_id = 'patio-gardens';
UPDATE loading_facts SET reference_json = '{"citation":"Macknick et al. (2012)","fullReference":"Macknick, J., Newmark, R., Heath, G., & Hallett, K. C. (2012). Operational water consumption and withdrawal factors for electricity generating technologies: A review of existing literature. Environmental Research Letters, 7(4), Article 045802.","url":"https://doi.org/10.1088/1748-9326/7/4/045802","context":{"en":"The study compares operational water consumption and withdrawal across electricity-generation technologies. It does not directly measure the ecological effect of one residential installation on a particular local river or wildlife population.","th":"งานวิจัยนี้เปรียบเทียบการใช้น้ำและการดึงน้ำระหว่างเทคโนโลยีผลิตไฟฟ้าหลายประเภท ไม่ได้วัดผลโดยตรงว่าการติดตั้งโซลาร์ที่บ้านหนึ่งหลังส่งผลต่อแม่น้ำหรือประชากรสัตว์น้ำในพื้นที่ใดพื้นที่หนึ่งอย่างไร"}}' WHERE fact_set_version_id = 'solar-facts-v1' AND stable_fact_id = 'water-use';

UPDATE loading_facts
SET source_context_en = json_extract(reference_json, '$.context.en'),
    source_context_th = json_extract(reference_json, '$.context.th');

ALTER TABLE public_releases ADD COLUMN contact_configuration_version_id TEXT REFERENCES contact_configuration_versions(id);
ALTER TABLE public_releases ADD COLUMN fact_set_version_id TEXT REFERENCES loading_fact_set_versions(id);

UPDATE public_releases
SET contact_configuration_version_id = 'contact-configuration-v1',
    fact_set_version_id = 'solar-facts-v1';

ALTER TABLE leads RENAME TO leads_legacy;

CREATE TABLE leads (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  idempotency_key TEXT NOT NULL UNIQUE,
  request_fingerprint TEXT NOT NULL,
  legal_first_name TEXT NOT NULL,
  legal_last_name TEXT NOT NULL,
  phone_e164 TEXT NOT NULL,
  phone_display TEXT NOT NULL,
  preferred_contact_method TEXT NOT NULL CHECK (preferred_contact_method IN ('phone', 'line')),
  line_id TEXT,
  province TEXT NOT NULL,
  custom_location TEXT,
  ownership_status TEXT NOT NULL CHECK (ownership_status IN ('owner', 'renter', 'other')),
  property_type TEXT NOT NULL,
  custom_property_type TEXT,
  daytime_loads_json TEXT NOT NULL CHECK (json_valid(daytime_loads_json)),
  custom_daytime_load TEXT,
  air_conditioner_count INTEGER NOT NULL CHECK (air_conditioner_count BETWEEN 0 AND 100),
  monthly_bill_thb INTEGER NOT NULL CHECK (monthly_bill_thb > 0),
  roof_material TEXT NOT NULL,
  custom_roof_material TEXT,
  roof_shade TEXT NOT NULL,
  roof_area TEXT NOT NULL,
  daytime_pattern TEXT NOT NULL,
  installation_timeframe TEXT NOT NULL,
  answers_json TEXT NOT NULL CHECK (json_valid(answers_json)),
  questionnaire_version_id TEXT NOT NULL REFERENCES questionnaire_versions(id),
  rule_version_id TEXT NOT NULL REFERENCES rule_versions(id),
  release_id TEXT NOT NULL REFERENCES public_releases(id),
  raw_score INTEGER NOT NULL CHECK (raw_score BETWEEN 0 AND 100),
  quality_score INTEGER NOT NULL CHECK (quality_score BETWEEN 1 AND 5),
  hard_eligible INTEGER NOT NULL CHECK (hard_eligible IN (0, 1)),
  high_quality INTEGER NOT NULL CHECK (high_quality IN (0, 1)),
  scoring_explanation_json TEXT NOT NULL CHECK (json_valid(scoring_explanation_json)),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'exported', 'archived', 'deleted')),
  selection_override TEXT CHECK (selection_override IS NULL OR selection_override IN ('selected', 'deselected')),
  exported_at TEXT,
  archived_at TEXT,
  deleted_at TEXT,
  consent_version TEXT NOT NULL,
  consent_text_en TEXT NOT NULL,
  consent_text_th TEXT NOT NULL,
  consented_at TEXT NOT NULL,
  receiving_company_en TEXT,
  receiving_company_th TEXT,
  source_locale TEXT NOT NULL CHECK (source_locale IN ('en', 'th')),
  user_agent_summary TEXT,
  contact_collection_mode TEXT NOT NULL DEFAULT 'named_installer_handoff' CHECK (contact_collection_mode IN ('validation_interest', 'named_installer_handoff')),
  contact_configuration_version_id TEXT NOT NULL DEFAULT 'contact-configuration-legacy-v0' REFERENCES contact_configuration_versions(id),
  content_version_id TEXT NOT NULL DEFAULT 'residential-content-v1' REFERENCES content_versions(id),
  privacy_version TEXT NOT NULL DEFAULT 'legacy',
  consent_scope TEXT NOT NULL DEFAULT 'named_installer_site_assessment' CHECK (consent_scope IN ('solar_match_validation_followup', 'named_installer_site_assessment')),
  solar_match_followup_authorized INTEGER NOT NULL DEFAULT 0 CHECK (solar_match_followup_authorized IN (0, 1)),
  third_party_disclosure_authorized INTEGER NOT NULL DEFAULT 1 CHECK (third_party_disclosure_authorized IN (0, 1)),
  recipient_privacy_url TEXT,
  recipient_snapshot_json TEXT CHECK (recipient_snapshot_json IS NULL OR json_valid(recipient_snapshot_json)),
  retention_days_snapshot INTEGER CHECK (retention_days_snapshot IS NULL OR retention_days_snapshot BETWEEN 1 AND 3650),
  CHECK (
    (contact_collection_mode = 'validation_interest' AND consent_scope = 'solar_match_validation_followup' AND solar_match_followup_authorized = 1 AND third_party_disclosure_authorized = 0 AND receiving_company_en IS NULL AND receiving_company_th IS NULL AND recipient_privacy_url IS NULL AND recipient_snapshot_json IS NULL)
    OR
    (contact_collection_mode = 'named_installer_handoff' AND consent_scope = 'named_installer_site_assessment' AND third_party_disclosure_authorized = 1 AND receiving_company_en IS NOT NULL AND receiving_company_th IS NOT NULL AND recipient_snapshot_json IS NOT NULL AND (contact_configuration_version_id = 'contact-configuration-legacy-v0' OR recipient_privacy_url IS NOT NULL))
  )
);

INSERT INTO leads (
  id, created_at, updated_at, idempotency_key, request_fingerprint, legal_first_name, legal_last_name,
  phone_e164, phone_display, preferred_contact_method, line_id, province, custom_location, ownership_status,
  property_type, custom_property_type, daytime_loads_json, custom_daytime_load, air_conditioner_count,
  monthly_bill_thb, roof_material, custom_roof_material, roof_shade, roof_area, daytime_pattern,
  installation_timeframe, answers_json, questionnaire_version_id, rule_version_id, release_id, raw_score,
  quality_score, hard_eligible, high_quality, scoring_explanation_json, status, selection_override,
  exported_at, archived_at, deleted_at, consent_version, consent_text_en, consent_text_th, consented_at,
  receiving_company_en, receiving_company_th, source_locale, user_agent_summary, contact_collection_mode,
  contact_configuration_version_id, content_version_id, privacy_version, consent_scope,
  solar_match_followup_authorized, third_party_disclosure_authorized, recipient_snapshot_json
)
SELECT
  id, created_at, updated_at, idempotency_key, request_fingerprint, legal_first_name, legal_last_name,
  phone_e164, phone_display, preferred_contact_method, line_id, province, custom_location, ownership_status,
  property_type, custom_property_type, daytime_loads_json, custom_daytime_load, air_conditioner_count,
  monthly_bill_thb, roof_material, custom_roof_material, roof_shade, roof_area, daytime_pattern,
  installation_timeframe, answers_json, questionnaire_version_id, rule_version_id, release_id, raw_score,
  quality_score, hard_eligible, high_quality, scoring_explanation_json, status, selection_override,
  exported_at, archived_at, deleted_at, consent_version, consent_text_en, consent_text_th, consented_at,
  receiving_company_en, receiving_company_th, source_locale, user_agent_summary, 'named_installer_handoff',
  'contact-configuration-legacy-v0', 'residential-content-v1', consent_version,
  'named_installer_site_assessment', 0, 1,
  json_object('name', json_object('en', receiving_company_en, 'th', receiving_company_th))
FROM leads_legacy;

ALTER TABLE lead_score_history RENAME TO lead_score_history_legacy;
CREATE TABLE lead_score_history (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  rule_version_id TEXT NOT NULL REFERENCES rule_versions(id),
  raw_score INTEGER NOT NULL,
  quality_score INTEGER NOT NULL,
  hard_eligible INTEGER NOT NULL,
  explanation_json TEXT NOT NULL CHECK (json_valid(explanation_json)),
  reason TEXT NOT NULL,
  is_original INTEGER NOT NULL DEFAULT 0 CHECK (is_original IN (0, 1)),
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO lead_score_history SELECT * FROM lead_score_history_legacy;
DROP TABLE lead_score_history_legacy;

ALTER TABLE lead_status_events RENAME TO lead_status_events_legacy;
CREATE TABLE lead_status_events (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  reason TEXT,
  actor_email TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO lead_status_events SELECT * FROM lead_status_events_legacy;
DROP TABLE lead_status_events_legacy;

ALTER TABLE lead_notes RENAME TO lead_notes_legacy;
CREATE TABLE lead_notes (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  actor_email TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT
);
INSERT INTO lead_notes SELECT * FROM lead_notes_legacy;
DROP TABLE lead_notes_legacy;

ALTER TABLE export_batch_items RENAME TO export_batch_items_legacy;
CREATE TABLE export_batch_items (
  export_batch_id TEXT NOT NULL REFERENCES export_batches(id) ON DELETE CASCADE,
  lead_id TEXT NOT NULL REFERENCES leads(id),
  snapshot_json TEXT NOT NULL CHECK (json_valid(snapshot_json)),
  PRIMARY KEY(export_batch_id, lead_id)
);
INSERT INTO export_batch_items SELECT * FROM export_batch_items_legacy;
DROP TABLE export_batch_items_legacy;

DROP TABLE leads_legacy;

CREATE INDEX leads_created_at ON leads(created_at DESC);
CREATE INDEX leads_quality ON leads(quality_score DESC, created_at DESC);
CREATE INDEX leads_eligibility ON leads(hard_eligible, quality_score DESC);
CREATE INDEX leads_owner_ac ON leads(ownership_status, air_conditioner_count);
CREATE INDEX leads_location ON leads(province, created_at DESC);
CREATE INDEX leads_status ON leads(status, created_at DESC);
CREATE INDEX leads_phone ON leads(phone_e164);
CREATE INDEX leads_name ON leads(legal_last_name, legal_first_name);
CREATE INDEX leads_contact_scope ON leads(contact_collection_mode, consent_scope, third_party_disclosure_authorized);

ALTER TABLE export_batches ADD COLUMN export_scope TEXT NOT NULL DEFAULT 'legacy' CHECK (export_scope IN ('legacy', 'solar_match_validation_followup', 'named_installer_handoff'));
ALTER TABLE export_batches ADD COLUMN contact_collection_mode TEXT;
ALTER TABLE export_batches ADD COLUMN recipient_snapshot_json TEXT CHECK (recipient_snapshot_json IS NULL OR json_valid(recipient_snapshot_json));

CREATE TABLE lead_export_selections (
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  export_scope TEXT NOT NULL CHECK (export_scope IN ('solar_match_validation_followup', 'named_installer_handoff')),
  recipient_key TEXT NOT NULL DEFAULT '',
  selection_state TEXT NOT NULL CHECK (selection_state IN ('selected', 'deselected')),
  updated_by TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (lead_id, export_scope, recipient_key)
);

CREATE INDEX lead_export_selections_scope ON lead_export_selections(export_scope, recipient_key, selection_state);

PRAGMA foreign_keys = ON;
