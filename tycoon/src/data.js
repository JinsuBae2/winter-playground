// 콘텐츠 표. 새 콘텐츠는 여기에 행을 추가한다.
export const DAY_LEN = 90, RUN_DAYS = 20, RENT = 2000, STOCK_COST = 300, BURN_AT = 1.3, OVER_AT = 1.15;

export const FILLINGS = {
  pat: { name: '팥', icon: '🫘', price: 1000 },
  cream: { name: '슈크림', icon: '🍮', price: 1200 },
  goguma: { name: '고구마', icon: '🍠', price: 1300 },
  matcha: { name: '말차', icon: '🍵', price: 1400 },
  pizza: { name: '피자', icon: '🍕', price: 1500 },
  dubai: { name: '두바이 초콜릿', icon: '🍫', price: 2500 },
  mint: { name: '민트초코', icon: '🌿', price: 1600 },
};
export const DEV_ORDER = ['goguma', 'matcha', 'pizza', 'dubai', 'mint'];
export const DEV_COST = [10000, 20000, 30000, 45000, 60000];

export const HOODS = {
  school: { name: '학교 앞', desc: '싸게, 많이 팔린다', price: 0.85, spawn: 1.5, patience: 1, regular: 0.2, maxOrder: 2, x: 22, y: 19, icon: '🏫' },
  station: { name: '역 앞', desc: '손님이 많지만 급하다', price: 1, spawn: 1.2, patience: 0.7, regular: 0.15, maxOrder: 2, x: 77, y: 19, icon: '🚉' },
  market: { name: '시장', desc: '단골이 많고 느긋하다', price: 1, spawn: 0.9, patience: 1.2, regular: 0.4, maxOrder: 3, x: 26, y: 54, icon: '🧺' },
  office: { name: '오피스가', desc: '비싸게, 한 번에 많이', price: 1.3, spawn: 0.6, patience: 0.9, regular: 0.15, maxOrder: 4, x: 75, y: 54, icon: '🏢', unlock: 'office', hint: '"동네 맛집" 엔딩' },
  truck: { name: '전국일주 트럭', desc: '매일 동네가 바뀐다', x: 50, y: 80, icon: '🚚', unlock: 'truck', hint: '"전국일주 트럭" 엔딩' },
};

export const WEATHER = [
  { name: '맑음 ☀️', spawn: 1, bake: 1, w: 5 },
  { name: '눈 ❄️', spawn: 1.3, bake: 1, w: 3 },
  { name: '한파 🥶', spawn: 1.1, bake: 1.25, w: 2 },
];

export const UPGRADES = {
  mold: { icon: '🐟', name: '붕어빵 틀', desc: '굽는 칸 4 → 6 → 9', cost: [15000, 45000] },
  fire: { icon: '🔥', name: '가스 버너', desc: '더 빨리 익는다', cost: [10000, 30000] },
  warmer: { icon: '♨️', name: '보온 진열장', desc: '더 많이, 더 오래 보관', cost: [8000, 24000] },
  sign: { icon: '🏮', name: '네온 간판', desc: '손님이 더 온다', cost: [12000, 36000] },
  auto: { icon: '🤖', name: '자동 뒤집개', desc: '알맞게 익으면 알아서 뒤집는다', cost: [30000] },
  price: { icon: '🏷️', name: '새 가격표', desc: '값 +15%, 인내심 -10%', cost: [15000, 40000] },
};

export const PERMS = {
  money: { name: '시작 자금 +5,000원', cost: [500, 1000, 2000] },
  stock: { name: '시작 재료 +10개', cost: [300, 600, 1200] },
  patience: { name: '손님 인내심 +5%', cost: [800, 1600, 3200] },
};

// 누적 호감이 이 값에 닿으면 대사가 열린다
export const AFF_STEPS = [1, 10, 25];
export const REGULARS = {
  minji: { name: '고딩 민지', icon: '🎒', lines: { 1: '"시험 망쳤는데 이거 먹으니까 좀 낫네요."', 10: '"저 제빵 학원 등록했어요. 사장님 때문이에요."', 25: '"대학 붙었어요! 첫 알바비 타면 제가 쏠게요."' } },
  park: { name: '박 과장', icon: '💼', lines: { 1: '"퇴근길에 이 냄새를 어떻게 지나쳐요."', 10: '"사실 사표 쓸까 고민 중이에요. 여기 서 있으면 마음이 편해서."', 25: '"저 회사 나왔습니다. 옆 골목에 호떡집 차려요. 선배님."' } },
  halmae: { name: '시장 할머니', icon: '🧣', lines: { 1: '"옛날엔 이게 다섯 개에 천 원이었어."', 10: '"손주 놈이 여기 것만 먹어. 덤은 됐고 많이 팔아."', 25: '"내 가게 자리, 봄 되면 자네가 써. 진심이야."' } },
  junho: { name: '택배 기사 준호', icon: '📦', lines: { 1: '"차에서 먹기 딱 좋아요. 두 개만 빨리요."', 10: '"이 동네 배송은 일부러 마지막에 돌아요."', 25: '"대리점 차렸어요. 직원들 간식은 무조건 여기입니다."' } },
  sua: { name: '고양이 집사 수아', icon: '🐈', lines: { 1: '"저희 집 고양이 이름이 붕어예요."', 10: '"붕어빵 캐릭터 그려 봤는데, 간판에 쓰실래요?"', 25: '"이모티콘 승인 났어요! 모델료는 평생 단골로 낼게요."' } },
};

// 손님 말풍선. 유행 타는 요소라 주기적으로 갈아 끼운다. (2026-11 기준)
export const CHATTER = [
  '여기가 그 붕세권 맞죠?', '가슴속 3천원, 드디어 씁니다', '계좌이체 되나요?',
  '팥붕이 근본이죠', '슈붕 안 먹는 사람이랑은 겸상 안 해요', '머리부터 먹어요, 꼬리부터 먹어요?',
  '릴스에 올리게 예쁜 걸로요', '퇴근하고 이것만 기다렸어요', '오픈런 했는데 벌써 줄이…',
  '두바이 초콜릿 붕어빵은 없어요?', '다이어트는 내일부터', 'AI한테 물어봤더니 여기 가래요',
  '이게 갓생이지', '세 개 사서 집 가기 전에 두 개 먹을 거예요', '붕어빵 지도 보고 왔어요',
];

const newest = r => r.fillings[r.fillings.length - 1];

// 저녁 이벤트. when이 있으면 조건부(스토리) 이벤트. do는 run을 바꾸고 결과 문장을 돌려준다.
export const EVENTS = [
  { id: 'crackdown', title: '🚨 노점 단속', text: '구청 단속반이 떴다.', choices: [
    { label: '과태료 5,000원을 낸다', do: r => { r.money -= 5000; return '속은 쓰리지만 자리는 지켰다.'; } },
    { label: '골목 안쪽으로 옮긴다', do: r => { r.mods.spawn *= 0.7; return '내일은 손님이 줄어든다.'; } } ] },
  { id: 'tv', title: '📺 방송 촬영 제안', text: '동네 맛집 프로그램에서 연락이 왔다.', choices: [
    { label: '출연한다', do: r => { r.mods.spawn *= 1.5; return '내일 손님이 몰려온다!'; } },
    { label: '조용히 장사한다', do: r => { r.aff += 8; return '단골들이 고마워한다.'; } } ] },
  { id: 'rival', title: '🥞 경쟁 포장마차', text: '옆자리에 호떡집이 들어왔다.', choices: [
    { label: '가격을 내려 맞불', do: r => { r.mods.price *= 0.8; r.mods.spawn *= 1.3; return '내일은 싸게, 많이 판다.'; } },
    { label: '맛으로 승부', do: r => { r.mods.price *= 1.1; r.mods.spawn *= 0.9; return '내일은 손님이 조금 줄지만 값을 더 받는다.'; } } ] },
  { id: 'costs', title: '📈 재료값 폭등', text: '팥값이 미쳤다. 도매상이 오늘만 묶음 할인을 해 준단다.', choices: [
    { label: '30개 묶음을 7,000원에 산다', can: r => r.money >= 7000, do: r => { r.money -= 7000; r.stock += 30; return '재료 30개를 쟁였다.'; } },
    { label: '안 산다', do: r => { r.mods.stockCost = 1.5; return '오늘 밤 발주 단가가 1.5배다.'; } } ] },
  { id: 'group', title: '🙏 단골의 부탁', text: '단골이 내일 아침 회사에 돌릴 10개를 부탁한다.', choices: [
    { label: '재료 10개로 미리 굽는다 (+15,000원)', can: r => r.stock >= 10, do: r => { r.stock -= 10; r.money += 15000; r.earned += 15000; r.aff += 8; return '단골이 활짝 웃었다.'; } },
    { label: '정중히 거절한다', do: () => '다음을 기약했다.' } ] },
  // 유행 요소
  { id: 'map', title: '🗺️ 붕세권 지도', text: '손님이 붕어빵 지도 앱에 가게를 등록해도 되냐고 묻는다.', choices: [
    { label: '등록한다', do: r => { r.mods.spawn *= 1.4; return '"붕세권 입성" 후기가 올라왔다. 내일 손님이 는다.'; } },
    { label: '아는 사람만 오는 가게로', do: r => { r.aff += 8; return '단골들이 은근히 좋아한다.'; } } ] },
  { id: 'debate', title: '⚔️ 팥붕 vs 슈붕', text: '커뮤니티에서 근본 논쟁이 터졌다. 사장님 입장을 묻는 댓글이 달린다.', choices: [
    { label: '"팥붕이 근본입니다"', do: r => { r.mods.trend = 'pat'; return '팥붕파가 결집했다. 내일 팥이 잘 팔리고 값도 더 받는다.'; } },
    { label: '"슈붕이 진리입니다"', do: r => { r.mods.trend = 'cream'; return '슈붕파가 결집했다. 내일 슈크림이 잘 팔리고 값도 더 받는다.'; } } ] },
  { id: 'viral', title: '📱 릴스 떡상', text: '누가 찍어 올린 우리 가게 영상 조회수가 터졌다.', choices: [
    { label: '유행에 올라탄다', do: r => { r.mods.trend = newest(r); r.mods.spawn *= 1.2; return `내일은 다들 ${FILLINGS[newest(r)].name} 붕어빵을 찾는다.`; } },
    { label: '하던 대로 한다', do: r => { r.aff += 6; return '유행은 지나가도 단골은 남는다.'; } } ] },
  // 스토리
  { id: 'truck', when: r => r.day > 5 && !r.flags.truck, title: '🚚 중고 트럭 매물', text: '은퇴하는 붕어빵 사장님이 트럭을 내놨다.', choices: [
    { label: '20,000원에 산다', can: r => r.money >= 20000, do: r => { r.money -= 20000; r.flags.truck = 1; return '낡았지만 시동은 걸린다.'; } },
    { label: '지나친다', do: () => '트럭은 다른 주인을 찾아갔다.' } ] },
  { id: 'festival', when: r => r.flags.truck === 1, title: '🎪 전국 축제 초대', text: '겨울 축제 운영진이 트럭째 와 달라고 한다.', choices: [
    { label: '간다', do: r => { r.flags.truck = 2; r.mods.spawn *= 1.5; return '바퀴 달린 가게의 맛을 알아 버렸다.'; } },
    { label: '동네를 지킨다', do: () => '초대장을 서랍에 넣었다.' } ] },
  { id: 'franchise', when: r => r.day > 10 && r.earned >= 150000 && !r.flags.expand, title: '🤝 프랜차이즈 제안', text: '투자자가 명함을 내민다. "이 맛, 전국에 깔아 봅시다."', choices: [
    { label: '손을 잡는다', do: r => { r.flags.expand = true; return '계약서에 도장을 찍었다.'; } },
    { label: '내 가게로 남는다', do: r => { r.aff += 8; return '단골들이 안도했다.'; } } ] },
];

const rate = r => (r.baked ? r.perfect / r.baked : 0);

// 위에서부터 검사해 처음 맞는 엔딩. unlock은 계승 해금 키.
export const ENDINGS = [
  { id: 'bankrupt', name: '폐업', icon: '🥀', text: '자릿세를 못 냈다. 틀을 닦아 창고에 넣는다. 다음 겨울엔 다를 것이다.', legacy: '위로금 500코인', test: r => r.money < 0 },
  { id: 'gold', name: '황금 붕어', icon: '🏆', hidden: true, unlock: 'gold', text: '모든 길을 걸어 본 사람만 굽는다는 전설의 한 마리. 틀에서 금빛이 났다.', legacy: '황금 틀 — 완벽한 붕어빵 값이 더 오른다', test: (r, m) => Object.keys(m.endings).filter(k => k !== 'gold').length >= 8 && rate(r) >= 0.85 && r.earned >= 900000 },
  { id: 'truck', name: '전국일주 트럭', icon: '🚚', unlock: 'truck', text: '겨울이 끝나도 트럭은 멈추지 않는다. 다음 축제는 남쪽 바다다.', legacy: '새 동네: 전국일주 트럭', test: r => r.flags.truck === 2 },
  { id: 'landlord', name: '건물주', icon: '🏢', unlock: 'money', text: '노점 뒤 건물을 샀다. 이제 자릿세는 내가 받는다.', legacy: '시작 자금 +10,000원', test: r => r.earned >= 1200000 },
  { id: 'franchise', name: '프랜차이즈 대표', icon: '🏪', unlock: 'branch', text: '2호점 간판에 불이 들어왔다. 굽는 손보다 결재하는 손이 바빠졌다.', legacy: '2호점 — 본점 수익 1.5배', test: r => r.flags.expand && r.earned >= 700000 },
  { id: 'salon', name: '단골들의 사랑방', icon: '🫶', unlock: 'friend', text: '붕어빵은 핑계다. 사람들은 이야기하러 온다.', legacy: '입소문 — 단골이 더 자주 온다', test: r => r.aff >= 150 },
  { id: 'fusion', name: '퓨전 혁신가', icon: '🧪', unlock: 'mint', text: '"이걸 붕어빵에?" 소리를 세 번 들었고, 세 번 다 줄이 생겼다.', legacy: '민트초코를 처음부터 판다', test: r => r.developed >= 3 },
  { id: 'master', name: '붕어빵 장인', icon: '🔥', unlock: 'wide', text: '눈 감고도 뒤집는다. 사람들은 이제 "그 집"이라고만 부른다.', legacy: '장인의 감 — 완벽 구간이 넓어진다', test: r => r.baked >= 100 && rate(r) >= 0.9 },
  { id: 'local', name: '동네 맛집', icon: '🐟', unlock: 'office', text: '겨울 한 철 무사히 났다. 내년에도 이 자리에서 보자는 인사를 여러 번 들었다.', legacy: '새 동네: 오피스가', test: () => true },
];
