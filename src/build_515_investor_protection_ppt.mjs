import fs from "node:fs";
import path from "node:path";

const {
  Presentation,
  PresentationFile,
  FileBlob,
  row,
  column,
  grid,
  layers,
  panel,
  text,
  image,
  rule,
  fill,
  hug,
  fixed,
  wrap,
  fr,
} = await import("@oai/artifact-tool");

const root = process.cwd();
const assetDir = path.join(root, "output", "ppt_template_analysis", "unzipped", "ppt", "media");
const outDir = path.join(root, "output", "515_investor_protection");
const previewDir = path.join(outDir, "previews");
fs.mkdirSync(previewDir, { recursive: true });

const deckPath = path.join(outDir, "明辨风险_理性投资_515投资者保护宣传日.pptx");

const W = 1920;
const H = 1080;
const FONT = "微软雅黑";
const RED = "#D90011";
const DEEP_RED = "#B40014";
const DARK = "#242424";
const GRAY = "#666666";
const LIGHT_GRAY = "#888888";
const GOLD = "#C98A45";
const PALE_GOLD = "#FFF1D8";
const LIGHT_RED = "#FFF0F0";
const WHITE = "#FFFFFF";

async function loadImage(name) {
  const file = await FileBlob.load(path.join(assetDir, name));
  return { blob: file.data, contentType: file.mime };
}

const assets = {
  cover: await loadImage("image2.png"),
  toc: await loadImage("image3.png"),
  body: await loadImage("image1.png"),
  section1: await loadImage("image5.png"),
  section2: await loadImage("image8.png"),
  city1: await loadImage("image9.png"),
  city2: await loadImage("image10.png"),
  city3: await loadImage("image11.png"),
  city4: await loadImage("image12.png"),
  city5: await loadImage("image13.png"),
  city6: await loadImage("image14.png"),
  thanks: await loadImage("image18.png"),
};

const presentation = Presentation.create({ slideSize: { width: W, height: H } });

function addSlide(node) {
  const slide = presentation.slides.add();
  slide.compose(node, { frame: { left: 0, top: 0, width: W, height: H }, baseUnit: 8 });
  return slide;
}

function bg(name, asset) {
  return image({ name, ...asset, width: fill, height: fill, fit: "cover", alt: "长江证券PPT模板背景" });
}

function numPill(value, name, width = fixed(76), size = 18) {
  return panel(
    { name, fill: RED, borderRadius: "rounded-full", padding: { x: 14, y: 6 }, width, height: hug, align: "center", justify: "center" },
    text(value, { name: `${name}-text`, width: fill, height: hug, style: { fontFamily: FONT, fontSize: size, bold: true, italic: true, color: WHITE, textAlign: "center" } }),
  );
}

function chapterMark(chapter, label, name) {
  return row(
    { name, width: fill, height: hug, gap: 14, align: "center" },
    [
      numPill(chapter, `${name}-pill`, fixed(76), 18),
      text(label, { name: `${name}-label`, width: fill, height: hug, style: { fontFamily: FONT, fontSize: 22, bold: true, color: RED } }),
    ],
  );
}

function bodyTitle(no, value, name) {
  return row(
    { name, width: fill, height: hug, gap: 14, align: "center" },
    [
      numPill(no, `${name}-num`, fixed(68), 17),
      text(value, { name: `${name}-text`, width: fill, height: hug, style: { fontFamily: FONT, fontSize: 32, bold: true, color: DEEP_RED, lineHeight: 1.05 } }),
    ],
  );
}

function bodySlide({ name, bgAsset, chapter, chapterLabel, pageNo, titleText, source, children, top = 126 }) {
  return layers(
    { name, width: fill, height: fill },
    [
      bg(`${name}-bg`, bgAsset),
      column(
        { name: `${name}-content`, width: fill, height: fill, padding: { left: 126, right: 126, top, bottom: 112 }, gap: 14 },
        [
          chapterMark(chapter, chapterLabel, `${name}-chapter`),
          bodyTitle(pageNo, titleText, `${name}-title`),
          ...children,
          text(`资料来源：${source}`, { name: `${name}-source`, width: fill, height: hug, style: { fontFamily: FONT, fontSize: 14, color: LIGHT_GRAY } }),
        ],
      ),
    ],
  );
}

function sectionDivider(num, titleText, subText, bgAsset, name) {
  return layers(
    { name, width: fill, height: fill },
    [
      bg(`${name}-bg`, bgAsset),
      column(
        { name: `${name}-copy`, width: fill, height: fill, padding: { left: 150, right: 150, top: 265, bottom: 150 }, gap: 24 },
        [
          text(num, { name: `${name}-num`, width: wrap(300), height: hug, style: { fontFamily: FONT, fontSize: 116, bold: true, italic: true, color: RED } }),
          text(titleText, { name: `${name}-title`, width: wrap(820), height: hug, style: { fontFamily: FONT, fontSize: 38, bold: true, color: GRAY } }),
          rule({ name: `${name}-rule`, width: fixed(220), stroke: GOLD, weight: 5 }),
          text(subText, { name: `${name}-sub`, width: wrap(850), height: hug, style: { fontFamily: FONT, fontSize: 24, color: LIGHT_GRAY, lineHeight: 1.15 } }),
        ],
      ),
    ],
  );
}

function paraBox(name, titleText, lines, fillColor = WHITE, width = fill) {
  return panel(
    { name, fill: fillColor, border: { color: "#E8D8BF", weight: 1 }, borderRadius: 0, padding: { x: 24, y: 18 }, width, height: hug },
    column(
      { name: `${name}-stack`, width: fill, height: hug, gap: 8 },
      [
        text(titleText, { name: `${name}-title`, width: fill, height: hug, style: { fontFamily: FONT, fontSize: 22, bold: true, color: DEEP_RED } }),
        ...lines.map((line, idx) =>
          text(line, { name: `${name}-line-${idx + 1}`, width: fill, height: hug, style: { fontFamily: FONT, fontSize: 17, color: idx === 0 ? DARK : GRAY, bold: idx === 0, lineHeight: 1.18 } }),
        ),
      ],
    ),
  );
}

function bulletBlock(name, titleText, items) {
  return column(
    { name, width: fill, height: hug, gap: 8 },
    [
      text(titleText, { name: `${name}-title`, width: fill, height: hug, style: { fontFamily: FONT, fontSize: 21, bold: true, color: DEEP_RED } }),
      ...items.map((item, idx) =>
        text(`➢ ${item}`, { name: `${name}-item-${idx + 1}`, width: fill, height: hug, style: { fontFamily: FONT, fontSize: 16, color: DARK, lineHeight: 1.16 } }),
      ),
    ],
  );
}

function smallCard(name, titleText, bodyText, fillColor = PALE_GOLD) {
  return panel(
    { name, fill: fillColor, border: { color: "#E4CFAC", weight: 1 }, borderRadius: 0, padding: { x: 18, y: 16 }, width: fill, height: fixed(145) },
    column(
      { name: `${name}-stack`, width: fill, height: fill, gap: 7 },
      [
        text(titleText, { name: `${name}-title`, width: fill, height: hug, style: { fontFamily: FONT, fontSize: 20, bold: true, color: DEEP_RED } }),
        text(bodyText, { name: `${name}-body`, width: fill, height: hug, style: { fontFamily: FONT, fontSize: 16, color: GRAY, lineHeight: 1.14 } }),
      ],
    ),
  );
}

function axisItem(titleText, lines, name) {
  return column(
    { name, width: fill, height: hug, gap: 7 },
    [
      text(titleText, { name: `${name}-title`, width: fill, height: hug, style: { fontFamily: FONT, fontSize: 22, bold: true, color: DEEP_RED } }),
      ...lines.map((line, idx) =>
        text(`➢ ${line}`, { name: `${name}-line-${idx + 1}`, width: fill, height: hug, style: { fontFamily: FONT, fontSize: 16, color: DARK, lineHeight: 1.2 } }),
      ),
    ],
  );
}

function stepRow(step, leftTitle, leftBody, rightBody, name) {
  return row(
    { name, width: fixed(1395), height: fixed(142), gap: 0, align: "center" },
    [
      panel(
        { name: `${name}-left`, fill: WHITE, border: { color: RED, weight: 1.2 }, borderRadius: 12, padding: { x: 22, y: 16 }, width: fixed(520), height: fill },
        column(
          { name: `${name}-left-stack`, width: fill, height: fill, gap: 8 },
          [
            text(leftTitle, { name: `${name}-left-title`, width: fill, height: hug, style: { fontFamily: FONT, fontSize: 21, bold: true, color: RED } }),
            text(leftBody, { name: `${name}-left-body`, width: fill, height: hug, style: { fontFamily: FONT, fontSize: 16, color: GRAY, lineHeight: 1.16 } }),
          ],
        ),
      ),
      panel(
        { name: `${name}-center`, fill: RED, borderRadius: 0, padding: { x: 18, y: 20 }, width: fixed(250), height: fixed(142), align: "center", justify: "center" },
        column(
          { name: `${name}-center-stack`, width: fill, height: hug, gap: 8 },
          [
            text(`Step.${step}`, { name: `${name}-step`, width: fill, height: hug, style: { fontFamily: FONT, fontSize: 25, bold: true, color: WHITE, textAlign: "center" } }),
            text("合规查验\n理性决策", { name: `${name}-center-text`, width: fill, height: hug, style: { fontFamily: FONT, fontSize: 15, bold: true, color: WHITE, lineHeight: 1.15, textAlign: "center" } }),
          ],
        ),
      ),
      panel(
        { name: `${name}-right`, fill: WHITE, border: { color: RED, weight: 1.2 }, borderRadius: 12, padding: { x: 22, y: 16 }, width: fixed(625), height: fill },
        text(rightBody, { name: `${name}-right-body`, width: fill, height: hug, style: { fontFamily: FONT, fontSize: 16, color: GRAY, lineHeight: 1.18 } }),
      ),
    ],
  );
}

function channelCard(name, titleText, lines, fillColor = PALE_GOLD) {
  return panel(
    { name, fill: fillColor, border: { color: "#E5C897", weight: 1 }, borderRadius: 0, padding: { x: 20, y: 18 }, width: fill, height: fixed(178) },
    column(
      { name: `${name}-stack`, width: fill, height: fill, gap: 8 },
      [
        text(titleText, { name: `${name}-title`, width: fill, height: hug, style: { fontFamily: FONT, fontSize: 22, bold: true, color: DEEP_RED } }),
        ...lines.map((line, idx) =>
          text(line, { name: `${name}-line-${idx + 1}`, width: fill, height: hug, style: { fontFamily: FONT, fontSize: 16, color: GRAY, lineHeight: 1.14 } }),
        ),
      ],
    ),
  );
}

// 1 Cover
addSlide(
  layers(
    { name: "cover", width: fill, height: fill },
    [
      bg("cover-bg", assets.cover),
      column(
        { name: "cover-copy", width: fill, height: fill, padding: { left: 165, right: 660, top: 235, bottom: 150 }, gap: 22 },
        [
          text("明辨风险，理性投资", { name: "cover-title", width: fill, height: hug, style: { fontFamily: FONT, fontSize: 64, bold: true, color: WHITE, lineHeight: 1.02 } }),
          rule({ name: "cover-rule", width: fixed(275), stroke: GOLD, weight: 6 }),
          text("2026年第八个“5·15”全国投资者保护宣传日", { name: "cover-sub", width: wrap(1060), height: hug, style: { fontFamily: FONT, fontSize: 32, bold: true, color: "#FFE2BF", lineHeight: 1.15 } }),
          text("拒绝非法荐股诱惑，筑牢理性投资防线", { name: "cover-guide", width: wrap(980), height: hug, style: { fontFamily: FONT, fontSize: 28, color: WHITE, lineHeight: 1.15 } }),
          text("2026年05月15日", { name: "cover-date", width: fixed(420), height: hug, style: { fontFamily: FONT, fontSize: 26, color: "#F4C58A" } }),
        ],
      ),
    ],
  ),
);

// 2 TOC
addSlide(
  layers(
    { name: "toc", width: fill, height: fill },
    [
      bg("toc-bg", assets.toc),
      column(
        { name: "toc-content", width: fill, height: fill, padding: { left: 180, right: 180, top: 205, bottom: 160 }, gap: 44 },
        [
          text("目录", { name: "toc-title", width: wrap(360), height: hug, style: { fontFamily: FONT, fontSize: 64, bold: true, color: RED } }),
          column(
            { name: "toc-list", width: fill, height: hug, gap: 36, padding: { left: 355 } },
            [
              row({ name: "toc-1", width: fill, height: hug, gap: 34, align: "center" }, [numPill("01", "toc-pill-1", fixed(92)), text("认清风险（认知篇）", { name: "toc-text-1", width: fill, height: hug, style: { fontFamily: FONT, fontSize: 34, bold: true, color: RED } })]),
              row({ name: "toc-2", width: fill, height: hug, gap: 34, align: "center" }, [numPill("02", "toc-pill-2", fixed(92)), text("理性防御（实操篇）", { name: "toc-text-2", width: fill, height: hug, style: { fontFamily: FONT, fontSize: 34, bold: true, color: RED } })]),
              row({ name: "toc-3", width: fill, height: hug, gap: 34, align: "center" }, [numPill("03", "toc-pill-3", fixed(92)), text("共筑防线（责任篇）", { name: "toc-text-3", width: fill, height: hug, style: { fontFamily: FONT, fontSize: 34, bold: true, color: RED } })]),
            ],
          ),
        ],
      ),
    ],
  ),
);

// 3 Section 01
addSlide(sectionDivider("01", "认清风险（认知篇）", "阐述监管态势，揭露当前非法金融活动的新变种与严重危害。", assets.section1, "section-01"));

// 4 P1
addSlide(
  bodySlide({
    name: "slide4",
    bgAsset: assets.city1,
    chapter: "01",
    chapterLabel: "认清风险（认知篇）",
    pageNo: "P1",
    titleText: "强化投资者保护 · 构建资本市场新格局",
    source: "中国政府网、证监会公开信息、中国投资者网公开投教材料",
    top: 178,
    children: [
      row(
        { name: "slide4-main", width: fixed(1250), height: hug, gap: 26, align: "start" },
        [
          column(
            { name: "slide4-left", width: fixed(760), height: hug, gap: 14 },
            [
              paraBox("slide4-1", "制度沿革", [
                "自2019年起，中国证监会将每年5月15日设立为“全国投资者保护宣传日”。",
                "这一举措的核心宗旨，在于积极倡导理性投资文化，强化投资者保护意识，并构建资本市场投资者保护新格局。",
              ]),
              paraBox("slide4-2", "2026新节点", [
                "2026年5月15日，我们迎来第八个“5·15全国投资者保护宣传日”。",
                "全国防范非法证券期货基金宣传月活动同步开展，投教宣传与防非风险提示形成联动。",
              ], LIGHT_RED),
              paraBox("slide4-3", "核心攻坚", [
                "聚焦非法荐股、非法跨境展业、假借“RWA”等名义的非法金融活动，提示其隐蔽性、迷惑性持续增强。",
                "通过普及合规知识，引导投资者拒绝非法荐股诱惑，携手共建健康清朗的资本市场生态。",
              ]),
            ],
          ),
          column(
            { name: "slide4-right", width: fixed(455), height: hug, gap: 15 },
            [
              channelCard("slide4-key", "关键词", ["第八个5·15", "理性投资文化", "投资者保护意识", "防范非法证券期货基金活动"], PALE_GOLD),
              panel(
                { name: "slide4-red", fill: RED, borderRadius: 0, padding: { x: 24, y: 20 }, width: fill, height: hug },
                text("宣讲导语：拒绝非法荐股诱惑，筑牢理性投资防线。", { name: "slide4-red-text", width: fill, height: hug, style: { fontFamily: FONT, fontSize: 22, bold: true, color: WHITE, lineHeight: 1.18 } }),
              ),
            ],
          ),
        ],
      ),
    ],
  }),
);

// 5 P2: central axis template
addSlide(
  bodySlide({
    name: "slide5",
    bgAsset: assets.body,
    chapter: "01",
    chapterLabel: "认清风险（认知篇）",
    pageNo: "P2",
    titleText: "认清非法证券活动，远离投资陷阱",
    source: "浙江证监局、厦门证监局关于防范非法证券期货活动及RWA风险提示",
    children: [
      row(
        { name: "slide5-axis-layout", width: fixed(1450), height: hug, gap: 30, align: "center" },
        [
          column(
            { name: "slide5-left", width: fixed(560), height: hug, gap: 34 },
            [
              axisItem("非法荐股骗局", [
                "以“内幕消息”“专家带单”“稳赚不赔”为诱饵，在微信群、直播间、朋友圈等渠道荐股",
                "通过收取高额服务费、诱导高位接盘或卷款跑路，侵害投资者合法权益",
              ], "slide5-left-1"),
              axisItem("无资质机构展业", [
                "未取得证券期货基金经营资质，却擅自开展私募基金募集、投资咨询等业务",
                "甚至伪造备案信息、包装虚假产品，投资者资金安全缺乏保障",
              ], "slide5-left-2"),
            ],
          ),
          column(
            { name: "slide5-axis", width: fixed(150), height: hug, gap: 0, align: "center" },
            [
              panel({ name: "slide5-dot-top", fill: RED, borderRadius: "rounded-full", width: fixed(82), height: fixed(82) }),
              panel({ name: "slide5-line-1", fill: "#E6E6E6", width: fixed(16), height: fixed(110) }),
              panel(
                { name: "slide5-dot-mid", fill: "#888888", borderRadius: "rounded-full", width: fixed(108), height: fixed(108), align: "center", justify: "center" },
                text("风险", { name: "slide5-dot-mid-text", width: fill, height: hug, style: { fontFamily: FONT, fontSize: 24, bold: true, color: WHITE, textAlign: "center" } }),
              ),
              panel({ name: "slide5-line-2", fill: "#E6E6E6", width: fixed(16), height: fixed(110) }),
              panel(
                { name: "slide5-dot-bottom", fill: RED, borderRadius: "rounded-full", width: fixed(108), height: fixed(108), align: "center", justify: "center" },
                text("防线", { name: "slide5-dot-bottom-text", width: fill, height: hug, style: { fontFamily: FONT, fontSize: 24, bold: true, color: WHITE, textAlign: "center" } }),
              ),
            ],
          ),
          column(
            { name: "slide5-right", width: fixed(620), height: hug, gap: 34 },
            [
              axisItem("非法跨境金融活动", [
                "部分涉外券商未经我国监管批准，向境内投资者提供跨境证券交易服务",
                "资金划转不受境内监管保护，投资者面临本金损失、信息泄露等风险",
              ], "slide5-right-1"),
              axisItem("伪创新金融骗局", [
                "假借“RWA”“稳定币”“区块链”等热点概念，虚构投资项目并承诺高额回报",
                "相关活动可能涉嫌非法发售代币票券、非法经营证券期货业务、非法集资等",
              ], "slide5-right-2"),
            ],
          ),
        ],
      ),
    ],
  }),
);

// 6 Section 02
addSlide(sectionDivider("02", "理性防御（实操篇）", "提供具体避险指南，纠正错误投资观念，明确合规操作路径。", assets.section2, "section-02"));

// 7 P3: three-step process template
addSlide(
  bodySlide({
    name: "slide7",
    bgAsset: assets.body,
    chapter: "02",
    chapterLabel: "理性防御（实操篇）",
    pageNo: "P3",
    titleText: "坚持理性投资，恪守合规底线",
    source: "基金业协会、证监会私募基金投资者手册及公开投教材料",
    children: [
      column(
        { name: "slide7-steps", width: fixed(1410), height: hug, gap: 24, padding: { left: 52, top: 8 } },
        [
          stepRow("1", "严选持牌机构", "投资理财应选择具备合法资质的证券期货基金经营机构。", "投资者可通过中国证券投资基金业协会官网查询私募基金管理人及产品备案信息，核实机构合法性与产品合规性，拒绝“无牌机构”和“失联机构”。", "slide7-step-1"),
          stepRow("2", "拒绝高收益诱惑", "牢记“高收益必然伴随高风险”，摒弃一夜暴富侥幸心理。", "任何承诺“保本保息”“固定收益”“零风险”的投资，均不符合市场规律，应高度警惕其可能涉及非法金融活动。", "slide7-step-2"),
          stepRow("3", "远离内幕消息", "股市无捷径，所谓“内幕信息”多为虚假诱导。", "不盲目跟风炒作，不依赖陌生人荐股和群内收益截图，坚持价值投资、长期投资、理性投资。", "slide7-step-3"),
        ],
      ),
    ],
  }),
);

// 8 P4: ring / keyword layout
addSlide(
  bodySlide({
    name: "slide8",
    bgAsset: assets.body,
    chapter: "02",
    chapterLabel: "理性防御（实操篇）",
    pageNo: "P4",
    titleText: "警惕违规私募，匹配风险承受力",
    source: "中国证监会投资者保护局、基金业协会《私募基金投资者手册》",
    children: [
      row(
        { name: "slide8-main", width: fixed(1440), height: hug, gap: 34, align: "center" },
        [
          column(
            { name: "slide8-left", width: fixed(390), height: hug, gap: 30 },
            [
              bulletBlock("slide8-left-1", "私募的特定性", [
                "私募基金仅面向合格投资者募集",
                "不得向不特定对象公开宣传推介",
                "不得承诺保本保收益",
              ]),
              bulletBlock("slide8-left-2", "理性配置", [
                "结合财务状况与投资目标配置资产",
                "避免集中投资，更不要借债投资",
              ]),
            ],
          ),
          panel(
            { name: "slide8-ring", fill: "#F4F4F4", borderRadius: "rounded-full", width: fixed(530), height: fixed(530), padding: { x: 58, y: 58 }, align: "center", justify: "center" },
            grid(
              { name: "slide8-ring-grid", width: fill, height: fill, columns: [fr(1), fr(1)], columnGap: 14, rowGap: 14 },
              [
                panel({ name: "slide8-ring-1", fill: GOLD, borderRadius: "rounded-full", padding: { x: 16, y: 34 }, width: fill, height: fill }, text("合格投资者\n身份核验", { name: "slide8-ring-1-text", width: fill, height: hug, style: { fontFamily: FONT, fontSize: 21, bold: true, color: WHITE, textAlign: "center", lineHeight: 1.2 } })),
                panel({ name: "slide8-ring-2", fill: "#DCA354", borderRadius: "rounded-full", padding: { x: 16, y: 34 }, width: fill, height: fill }, text("风险测评\n能力匹配", { name: "slide8-ring-2-text", width: fill, height: hug, style: { fontFamily: FONT, fontSize: 21, bold: true, color: WHITE, textAlign: "center", lineHeight: 1.2 } })),
                panel({ name: "slide8-ring-3", fill: RED, borderRadius: "rounded-full", padding: { x: 16, y: 34 }, width: fill, height: fill }, text("不公开宣传\n不保本收益", { name: "slide8-ring-3-text", width: fill, height: hug, style: { fontFamily: FONT, fontSize: 21, bold: true, color: WHITE, textAlign: "center", lineHeight: 1.2 } })),
                panel({ name: "slide8-ring-4", fill: "#A9A9A9", borderRadius: "rounded-full", padding: { x: 16, y: 34 }, width: fill, height: fill }, text("分散配置\n审慎决策", { name: "slide8-ring-4-text", width: fill, height: hug, style: { fontFamily: FONT, fontSize: 21, bold: true, color: WHITE, textAlign: "center", lineHeight: 1.2 } })),
              ],
            ),
          ),
          column(
            { name: "slide8-right", width: fixed(440), height: hug, gap: 24 },
            [
              paraBox("slide8-right-1", "风险匹配原则", [
                "私募基金属于风险等级较高的投资品种。",
                "投资者参与前应充分评估自身风险识别能力与风险承担能力。",
              ], PALE_GOLD),
              panel(
                { name: "slide8-red", fill: RED, borderRadius: 0, padding: { x: 20, y: 18 }, width: fill, height: hug },
                text("任何公开宣传、承诺保本保收益的“私募产品”，均应高度警惕。", { name: "slide8-red-text", width: fill, height: hug, style: { fontFamily: FONT, fontSize: 21, bold: true, color: WHITE, lineHeight: 1.18 } }),
              ),
            ],
          ),
        ],
      ),
    ],
  }),
);

// 9 Section 03
addSlide(sectionDivider("03", "共筑防线（责任篇）", "告知维权途径，展示机构责任，重申理性投资与风险提示。", assets.city5, "section-03"));

// 10 P5
addSlide(
  bodySlide({
    name: "slide10",
    bgAsset: assets.city4,
    chapter: "03",
    chapterLabel: "共筑防线（责任篇）",
    pageNo: "P5",
    titleText: "畅通维权渠道，依法维护权益",
    source: "12386服务平台、中国投资者网、中国证券投资基金业协会公开信息",
    top: 178,
    children: [
      row(
        { name: "slide10-main", width: fixed(1250), height: hug, gap: 28, align: "start" },
        [
          column(
            { name: "slide10-left", width: fixed(675), height: hug, gap: 15 },
            [
              paraBox("slide10-intro", "理性维权", [
                "当投资者合法权益受到侵害时，切勿采取非理性维权方式，应保持冷静，通过官方正规渠道依法维权。",
                "第一时间保存合同、转账记录、聊天记录、平台页面、APP下载链接等关键证据，避免被“代理追损”“收费维权”等话术二次诱导。",
              ]),
              panel(
                { name: "slide10-red", fill: RED, borderRadius: 0, padding: { x: 22, y: 16 }, width: fill, height: hug },
                text("依法、理性、留痕，是维护自身合法权益的重要前提。", { name: "slide10-red-text", width: fill, height: hug, style: { fontFamily: FONT, fontSize: 22, bold: true, color: WHITE } }),
              ),
            ],
          ),
          column(
            { name: "slide10-right", width: fixed(540), height: hug, gap: 14 },
            [
              channelCard("slide10-card-1", "渠道一：12386服务平台", ["证监会投资者服务渠道，可提交投诉、咨询或建议。"], PALE_GOLD),
              channelCard("slide10-card-2", "渠道二：中国证券投资基金业协会", ["涉及私募基金问题，可通过协会官网投诉通道反映违规情况。"], LIGHT_RED),
              channelCard("slide10-card-3", "渠道三：司法途径", ["涉嫌诈骗、非法集资等违法犯罪行为，应及时向公安机关报案。"], PALE_GOLD),
            ],
          ),
        ],
      ),
    ],
  }),
);

// 11 P6
addSlide(
  bodySlide({
    name: "slide11",
    bgAsset: assets.city6,
    chapter: "03",
    chapterLabel: "共筑防线（责任篇）",
    pageNo: "P6",
    titleText: "践行投保责任，守护投资者信任",
    source: "监管公开投教材料及风险提示口径整理",
    top: 178,
    children: [
      row(
        { name: "slide11-main", width: fixed(1240), height: hug, gap: 28, align: "start" },
        [
          column(
            { name: "slide11-left", width: fixed(660), height: hug, gap: 14 },
            [
              paraBox("slide11-commit", "我司合规承诺", [
                "投资者保护是私募基金行业的生命线。我司始终坚守“以投资者为本”的初心，严格遵循监管要求。",
                "将合规运营、风险防控与投资者保护贯穿业务全流程，持续强化合规运营，深化投资者教育，压实防非责任，坚守诚信底线。",
              ]),
              paraBox("slide11-investor", "致广大投资者", [
                "理性投资行稳致远，非法陷阱寸步难行。",
                "坚持理性与价值投资，不盲目跟风炒作；不轻信“内幕消息”，远离非法证券期货活动；拒绝非法荐股诱惑，增强风险防范意识。",
              ], LIGHT_RED),
            ],
          ),
          column(
            { name: "slide11-right", width: fixed(550), height: hug, gap: 14 },
            [
              panel(
                { name: "slide11-risk", fill: RED, borderRadius: 0, padding: { x: 26, y: 24 }, width: fill, height: hug },
                column(
                  { name: "slide11-risk-stack", width: fill, height: hug, gap: 12 },
                  [
                    text("风险提示", { name: "slide11-risk-title", width: fill, height: hug, style: { fontFamily: FONT, fontSize: 28, bold: true, color: WHITE } }),
                    rule({ name: "slide11-risk-rule", width: fixed(150), stroke: "#FFD69A", weight: 4 }),
                    text("本文仅为投资者教育与风险提示内容，不构成任何投资建议、产品推介或收益承诺。私募基金投资风险较高，投资者应充分了解产品风险收益特征，审慎决策。", { name: "slide11-risk-text", width: fill, height: hug, style: { fontFamily: FONT, fontSize: 20, bold: true, color: WHITE, lineHeight: 1.2 } }),
                    text("市场有风险，投资需谨慎。", { name: "slide11-risk-end", width: fill, height: hug, style: { fontFamily: FONT, fontSize: 25, bold: true, color: "#FFE2BF" } }),
                  ],
                ),
              ),
              channelCard("slide11-key", "终极警示", ["不盲目跟风炒作", "不轻信内幕消息", "不参与非法荐股", "合规维权护权益"], PALE_GOLD),
            ],
          ),
        ],
      ),
    ],
  }),
);

// 12 Thanks
addSlide(
  layers(
    { name: "thanks", width: fill, height: fill },
    [
      bg("thanks-bg", assets.thanks),
      column(
        { name: "thanks-copy", width: fill, height: fill, padding: { left: 165, right: 850, top: 350, bottom: 150 }, gap: 18 },
        [
          text("THANKS  感谢阅读", { name: "thanks-title", width: fill, height: hug, style: { fontFamily: FONT, fontSize: 50, bold: true, italic: true, color: WHITE } }),
          text("明辨风险，理性投资", { name: "thanks-date", width: fill, height: hug, style: { fontFamily: FONT, fontSize: 24, color: "#FFE2BF" } }),
          text("拒绝非法荐股诱惑，筑牢理性投资防线", { name: "thanks-org", width: fill, height: hug, style: { fontFamily: FONT, fontSize: 22, color: WHITE } }),
        ],
      ),
    ],
  ),
);

const pptxBlob = await PresentationFile.exportPptx(presentation);
await pptxBlob.save(deckPath);

for (let i = 0; i < presentation.slides.count; i += 1) {
  const preview = await presentation.slides.getItem(i).export({ format: "png" });
  fs.writeFileSync(path.join(previewDir, `slide-${String(i + 1).padStart(2, "0")}.png`), Buffer.from(await preview.arrayBuffer()));
}

console.log(JSON.stringify({ deckPath, previewDir, slideCount: presentation.slides.count }, null, 2));
