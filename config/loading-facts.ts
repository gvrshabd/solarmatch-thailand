import type { LoadingFactSet } from '@/lib/loading-facts/types';

export const initialLoadingFactSet: LoadingFactSet = {
  id: 'solar-facts-v1',
  schemaVersion: 1,
  facts: [
    {
      id: 'home-value',
      title: { en: 'Boosting Home Value', th: 'เพิ่มมูลค่าให้บ้าน' },
      copy: {
        en: "Adding rooftop solar panels boosts a home's resale value by roughly 4% on average compared to homes without them (Hoen et al., 2015).",
        th: 'การติดตั้งแผงโซลาร์บนหลังคาช่วยเพิ่มมูลค่าขายต่อของบ้านโดยเฉลี่ยประมาณ 4% เมื่อเทียบกับบ้านที่ไม่ได้ติดตั้ง (Hoen et al., 2015)',
      },
      alt: {
        en: 'Monochrome line drawing of a cozy house wearing a small solar-panel hat beside an upward arrow.',
        th: 'ภาพลายเส้นสีเดียวของบ้านแสนอบอุ่นที่สวมแผงโซลาร์เหมือนหมวก พร้อมลูกศรชี้ขึ้นด้านข้าง',
      },
      sketchSource: 'built-in', sketchId: 'home-value', mediaId: null,
      resourcesAnchor: 'home-value', enabled: true, weight: 1, reviewedOn: '2026-09-01',
      reference: {
        citation: 'Hoen et al. (2015)',
        fullReference: 'Hoen, B., Adomatis, S., Jackson, T., Graff-Zivin, J., Thayer, M. A., Klise, G. T., & Wiser, R. H. (2015). Selling Into the Sun: Price Premium Analysis of a Multi-State Dataset of Solar Homes (Report LBNL-6942E). Lawrence Berkeley National Laboratory.',
        url: 'https://doi.org/10.2172/1239972',
        context: {
          en: 'This was a multi-state United States study of homes with owner-owned rooftop photovoltaic systems. It does not establish a guaranteed resale premium for an individual home or a Thailand-specific market effect.',
          th: 'งานวิจัยนี้ศึกษาบ้านที่ติดตั้งระบบโซลาร์แบบเจ้าของระบบในหลายรัฐของสหรัฐอเมริกา จึงไม่ได้รับประกันว่าบ้านแต่ละหลังจะมีมูลค่าขายต่อเพิ่มขึ้นเท่ากัน หรือสะท้อนผลของตลาดอสังหาริมทรัพย์ไทยโดยตรง',
        },
      },
    },
    {
      id: 'carbon-trees',
      title: { en: 'Mini Rooftop Forest', th: 'ป่าเล็ก ๆ บนหลังคา' },
      copy: {
        en: 'Powering a home with solar clears as much carbon each year as growing dozens of baby trees for a decade (U.S. Environmental Protection Agency, 2023).',
        th: 'การใช้โซลาร์จ่ายไฟให้บ้านช่วยลดคาร์บอนในแต่ละปีได้พอ ๆ กับการปลูกกล้าไม้หลายสิบต้นให้เติบโตนาน 10 ปี (U.S. Environmental Protection Agency, 2023)',
      },
      alt: {
        en: 'Monochrome line drawing of two smiling young tree saplings growing side by side.',
        th: 'ภาพลายเส้นสีเดียวของต้นกล้าเล็ก ๆ สองต้นยิ้มและเติบโตอยู่เคียงข้างกัน',
      },
      sketchSource: 'built-in', sketchId: 'carbon-trees', mediaId: null,
      resourcesAnchor: 'carbon-trees', enabled: true, weight: 1, reviewedOn: '2026-09-01',
      reference: {
        citation: 'U.S. Environmental Protection Agency (2023)',
        fullReference: 'U.S. Environmental Protection Agency. (2023). Greenhouse gas equivalencies calculator. EPA.',
        url: 'https://www.epa.gov/energy/greenhouse-gas-equivalencies-calculator',
        context: {
          en: 'This is a simplified greenhouse-gas equivalency. The number of tree seedlings depends on the amount of solar electricity generated, the grid emissions displaced, and the calculator assumptions. It is not a fixed result for every home.',
          th: 'ข้อความนี้เป็นการเปรียบเทียบปริมาณก๊าซเรือนกระจกแบบเข้าใจง่าย จำนวนต้นกล้าที่เทียบเท่าได้จริงขึ้นอยู่กับปริมาณไฟฟ้าที่ผลิตได้ การปล่อยคาร์บอนของไฟฟ้าที่ถูกทดแทน และสมมติฐานของเครื่องคำนวณ จึงไม่ใช่ตัวเลขตายตัวสำหรับบ้านทุกหลัง',
        },
      },
    },
    {
      id: 'neighbor-effect',
      title: { en: 'Friendly Green Ripple', th: 'พลังสีเขียวส่งต่อถึงเพื่อนบ้าน' },
      copy: {
        en: 'Putting solar on your roof inspires your street, making nearby neighbors up to 40% more likely to go solar too (Graziano & Gillingham, 2015).',
        th: 'การติดโซลาร์บนหลังคาของคุณช่วยสร้างแรงบันดาลใจให้คนในละแวกเดียวกัน ทำให้เพื่อนบ้านใกล้เคียงมีแนวโน้มติดโซลาร์เพิ่มขึ้นได้สูงสุด 40% (Graziano & Gillingham, 2015)',
      },
      alt: {
        en: 'Monochrome line drawing of two neighboring houses smiling and giving each other a high-five across their fences.',
        th: 'ภาพลายเส้นสีเดียวของบ้านเพื่อนบ้านสองหลังยิ้มและแตะมือกันเหนือรั้ว',
      },
      sketchSource: 'built-in', sketchId: 'neighbor-effect', mediaId: null,
      resourcesAnchor: 'neighbor-effect', enabled: true, weight: 1, reviewedOn: '2026-09-01',
      reference: {
        citation: 'Graziano & Gillingham (2015)',
        fullReference: 'Graziano, M., & Gillingham, K. (2015). Spatial patterns of solar photovoltaic system adoption: The influence of neighbors and the built environment. Journal of Economic Geography, 15(4), 815–839.',
        url: 'https://doi.org/10.1093/jeg/lbu036',
        context: {
          en: 'This research examined geographic patterns of residential solar adoption in Connecticut, United States. The loading statement is simplified homeowner-facing editorial copy and should not be interpreted as a guaranteed effect for every neighborhood or as a Thailand-specific measured result.',
          th: 'งานวิจัยนี้ศึกษารูปแบบการติดตั้งโซลาร์ตามพื้นที่ในรัฐคอนเนตทิคัต สหรัฐอเมริกา ข้อความบนหน้าจอโหลดเป็นการสรุปแบบเข้าใจง่ายสำหรับเจ้าของบ้าน ไม่ควรตีความว่าเป็นผลที่รับประกันสำหรับทุกชุมชนหรือเป็นตัวเลขที่วัดจากประเทศไทยโดยตรง',
        },
      },
    },
    {
      id: 'patio-gardens',
      title: { en: 'Happy Patio Gardens', th: 'สวนกระถางแสนสุข' },
      copy: {
        en: 'The gentle shade from residential panels helps potted herbs and greens thrive in the summer heat using less water (Barron-Gafford et al., 2019).',
        th: 'ร่มเงาอ่อน ๆ จากแผงโซลาร์สำหรับบ้านช่วยให้สมุนไพรและผักสวนครัวในกระถางเติบโตได้ดีท่ามกลางอากาศร้อนในฤดูร้อน โดยใช้น้ำน้อยลง (Barron-Gafford et al., 2019)',
      },
      alt: {
        en: 'Monochrome line drawing of a potted basil plant wearing sunglasses beneath a small parasol.',
        th: 'ภาพลายเส้นสีเดียวของต้นโหระพาในกระถางสวมแว่นกันแดดและพักอยู่ใต้ร่มคันเล็ก',
      },
      sketchSource: 'built-in', sketchId: 'patio-gardens', mediaId: null,
      resourcesAnchor: 'patio-gardens', enabled: true, weight: 1, reviewedOn: '2026-09-01',
      reference: {
        citation: 'Barron-Gafford et al. (2019)',
        fullReference: 'Barron-Gafford, G. A., Pavao-Zuckerman, M. A., Minor, R. L., Sutter, L. F., Barnett-Moreno, I., Blackett, D. T., Thompson, M., Dimond, K., Gerlak, A. K., Nabhan, G. P., & Macknick, J. E. (2019). Agrivoltaics provide mutual benefits across the food–energy–water nexus in drylands. Nature Sustainability, 2(9), 848–855.',
        url: 'https://doi.org/10.1038/s41893-019-0364-5',
        context: {
          en: 'The cited study examined dryland agrivoltaics, where crops were grown beneath raised photovoltaic panels. It did not directly test ordinary residential rooftop panels shading patio pots. The loading statement is simplified homeowner-facing editorial copy.',
          th: 'งานวิจัยที่อ้างถึงศึกษาระบบเกษตรร่วมกับโซลาร์ในพื้นที่แห้งแล้ง โดยปลูกพืชใต้แผงโซลาร์ที่ยกสูง ไม่ได้ทดสอบกระถางต้นไม้บนลานบ้านใต้แผงโซลาร์หลังคาทั่วไปโดยตรง ข้อความบนหน้าจอโหลดเป็นการสรุปแบบเข้าใจง่ายสำหรับเจ้าของบ้าน',
        },
      },
    },
    {
      id: 'water-use',
      title: { en: 'Saving River Water', th: 'ช่วยรักษาสายน้ำ' },
      copy: {
        en: 'Home solar makes clean electricity using almost no water, keeping local rivers and freshwater wildlife happy and thriving (Macknick et al., 2012).',
        th: 'โซลาร์สำหรับบ้านผลิตไฟฟ้าสะอาดโดยแทบไม่ใช้น้ำ ช่วยให้แม่น้ำในท้องถิ่นและสัตว์น้ำจืดยังคงดำรงชีวิตและเติบโตได้อย่างอุดมสมบูรณ์ (Macknick et al., 2012)',
      },
      alt: {
        en: 'Monochrome line drawing of a cheerful small fish jumping from a sparkling water ripple.',
        th: 'ภาพลายเส้นสีเดียวของปลาตัวเล็กแสนร่าเริงกระโดดขึ้นจากระลอกน้ำเป็นประกาย',
      },
      sketchSource: 'built-in', sketchId: 'water-use', mediaId: null,
      resourcesAnchor: 'water-use', enabled: true, weight: 1, reviewedOn: '2026-09-01',
      reference: {
        citation: 'Macknick et al. (2012)',
        fullReference: 'Macknick, J., Newmark, R., Heath, G., & Hallett, K. C. (2012). Operational water consumption and withdrawal factors for electricity generating technologies: A review of existing literature. Environmental Research Letters, 7(4), Article 045802.',
        url: 'https://doi.org/10.1088/1748-9326/7/4/045802',
        context: {
          en: 'The study compares operational water consumption and withdrawal across electricity-generation technologies. It does not directly measure the ecological effect of one residential installation on a particular local river or wildlife population.',
          th: 'งานวิจัยนี้เปรียบเทียบการใช้น้ำและการดึงน้ำระหว่างเทคโนโลยีผลิตไฟฟ้าหลายประเภท ไม่ได้วัดผลโดยตรงว่าการติดตั้งโซลาร์ที่บ้านหนึ่งหลังส่งผลต่อแม่น้ำหรือประชากรสัตว์น้ำในพื้นที่ใดพื้นที่หนึ่งอย่างไร',
        },
      },
    },
  ],
};

export const builtInLoadingSketchIds = new Set(initialLoadingFactSet.facts.map((fact) => fact.sketchId).filter(Boolean));
