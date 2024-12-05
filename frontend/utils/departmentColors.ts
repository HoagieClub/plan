export const departmentColors: Record<string, string[]> = {
  AAS: ['#ff5f6d', '#f0818b'],
  AFS: ['#ffd452', '#f9d423'],
  AMS: ['#00b4db', '#55cbe6'],
  ANT: ['#182848', '#4e6699'],
  AOS: ['#43cea2', '#6dd6b5'],
  APC: ['#ff0844', '#f53b64'],
  ARA: ['#240b36', '#391653'],
  ARC: ['#ff4e50', '#e87476'],
  ART: ['#db36a4', '#db76ba'],
  ASA: ['#ffb347', '#ffcc33'],
  AST: ['#2980b9', '#7cb2d6'],
  ATL: ['#dd2476', '#c9739a'],
  BCS: ['#614385', '#9978c2'],
  CBE: ['#3a7bd5', '#6c98d4'],
  CEE: ['#11998e', '#62bfb8'],
  CGS: ['#4776e6', '#7290d6'],
  CHI: ['#ff416c', '#fa6185'],
  CHM: ['#ee0979', '#de5798'],
  CHV: ['#1d2b64', '#80759a'],
  CLA: ['#e65c00', '#f29a5e'],
  CLG: ['#59c173', '#7ea3a6'],
  COM: ['#f46b45', '#f18c47'],
  COS: ['#4bb0e0', '#5b86e5'],
  CSE: ['#45b649', '#97cd52'],
  CTL: ['#0854a1', '#021b79'],
  CWR: ['#693fbf', '#4a00e0'],
  CZE: ['#a43f75', '#8e44ad'],
  DAN: ['#2c3e50', '#607a94'],
  EAS: ['#ff6e7f', '#deb4c7'],
  ECE: ['#12c2e9', '#859beb'],
  ECO: ['#f2994a', '#e0b531'],
  ECS: ['#1f4037', '#528A74'],
  EEB: ['#1abc9c', '#61c9aa'],
  EGR: ['#141e30', '#243b55'],
  ELE: ['#7f00ff', '#af00fe'],
  ENE: ['#16a085', '#7cb270'],
  ENG: ['#355c7d', '#555b7c'],
  ENT: ['#6a3093', '#a044ff'],
  ENV: ['#1e9600', '#8abd03'],
  EPS: ['#134e5e', '#407c6e'],
  FIN: ['#f12711', '#f46717'],
  FRE: ['#8a2387', '#b43073'],
  FRS: ['#9b59b6', '#8e44ad'],
  GEO: ['#c0392b', '#ab3f65'],
  GER: ['#ad5389', '#7e3773'],
  GHP: ['#ff0099', '#ab2770'],
  GLS: ['#3a6186', '#614967'],
  GSS: ['#ff512f', '#f77726'],
  HEB: ['#c33764', '#77316b'],
  HIN: ['#b92b27', '#7f476b'],
  HIS: ['#3494e6', '#9484cc'],
  HLS: ['#e44d26', '#f16529'],
  HOS: ['#16bffd', '#8584ba'],
  HPD: ['#1c92d2', '#92c8e8'],
  HUM: ['#2193b0', '#6dd5ed'],
  ISC: ['#4ca1af', '#8bc0c9'],
  ITA: ['#4ca2cd', '#59aaa0'],
  JDS: ['#5d4157', '#808084'],
  JPN: ['#ff5858', '#fa7543'],
  JRN: ['#ffb347', '#ffcc33'],
  KOR: ['#ff4b1f', '#d57765'],
  LAO: ['#f2709c', '#f88287'],
  LAS: ['#8a2387', '#b43073'],
  LAT: ['#7b4397', '#a7396c'],
  LCA: ['#a8ff78', '#8ce68a'],
  LIN: ['#3a1c71', '#804175'],
  MAE: ['#2ec5a6', '#6e89ab'],
  MAT: ['#ed213a', '#d92333'],
  MED: ['#314755', '#317397'],
  MOD: ['#17223b', '#263859'],
  MOG: ['#ee9ca7', '#facbd2'],
  MOL: ['#02aab0', '#00c0ae'],
  MPP: ['#42275a', '#593863'],
  MSE: ['#636363', '#727461'],
  MTD: ['#141e30', '#243b55'],
  MUS: ['#544a7d', '#816e76'],
  NES: ['#ddd6f3', '#e6cade'],
  NEU: ['#2980b9', '#4faddb'],
  ORF: ['#de6262', '#cf8686'],
  PAW: ['#ff5f6d', '#ff846f'],
  PER: ['#c31432', '#781236'],
  PHI: ['#7f7fd5', '#86a8e7'],
  PHY: ['#e52d27', '#b31217'],
  PLS: ['#c0392b', '#a83f6d'],
  POL: ['#2c3e50', '#3376a5'],
  POP: ['#ff512f', '#f13e52'],
  POR: ['#1d976c', '#68d09a'],
  PSY: ['#ff5f6d', '#ff9870'],
  QCB: ['#1f4037', '#518872'],
  REL: ['#00b4db', '#0083b0'],
  RES: ['#8e44ad', '#9b428e'],
  RUS: ['#c0392b', '#a73f6f'],
  SAN: ['#603813', '#826248'],
  SAS: ['#b92b27', '#923f56'],
  SLA: ['#c0392b', '#b43d4f'],
  SML: ['#20002c', '#74587e'],
  SOC: ['#3498db', '#2980b9'],
  SPA: ['#fc4a1a', '#fa7f26'],
  SPI: ['#667eea', '#764ba2'],
  STC: ['#f7971e', '#ffd200'],
  SWA: ['#e53935', '#e35d5b'],
  THR: ['#c2e59c', '#a8d7b7'],
  TPP: ['#f09819', '#efbd40'],
  TRA: ['#654ea3', '#ae83b7'],
  TUR: ['#009245', '#99c23b'],
  TWI: ['#45b649', '#76c34e'],
  URB: ['#0f2027', '#203a43'],
  URD: ['#0575e6', '#0346ad'],
  VIS: ['#005c97', '#2a4595'],
  WRI: ['#1e9600', '#80b903'],
  WWS: ['#667eea', '#7064c4'],
};

export const getDepartmentGradient = (departmentCode: string, angle: number) => {
  const colors = departmentColors[departmentCode];
  if (!colors) {
    return 'linear-gradient(135deg, #000000, #FFFFFF)';
  }
  return `linear-gradient(${angle}deg, ${colors[0]}, ${colors[1]})`;
};