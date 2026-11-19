// 수치와 문구. 밸런스를 바꿀 때는 여기만 고치고 npm test 로 대기 시간·완주 여부를 다시 본다.
export const AISLE_Y = 347, WASH_Y = 352, SEAT_Y = 152, DOOR_X = 762, HALL_X = 860;
export const BASINS = [399, 537, 675], STALLS = [335, 685]; // 가운데 칸(510)은 내 자리
// 사람마다 버릇이 다르다. 누가 들어왔는지 보면 다음 행동이 짐작된다.
export const PEOPLE = [
  { name: '김 과장', wash: 1.7 },   // 손을 오래 씻는다
  { name: '이 대리', fake: .4 },    // 숨만 들이쉬고 안 주는 일이 잦다
  { name: '박 차장', speed: 1.3 },  // 걸음이 빠르다
  { name: '최 부장', phone: true }, // 통화하며 들어온다. 통화 중에는 못 듣는다
];
export const NAMES = PEOPLE.map(p => p.name);

// 장소마다 사람이 몰리는 모양이 다르다. rush: full(버스가 서면 한꺼번에) · one(한 명씩 드문드문),
// lull·gap: 난이도 값에 곱한다, stall: 칸으로 갈 확률, tint: 화면 색감
export const PLACES = {
  office: { name: '회사' },
  rest: { name: '휴게소', rush: 'full', lull: 1.7, gap: .7, stall: .4, tint: '#ffb84d1c' },
  cinema: { name: '영화관', rush: 'one', lull: 1.2, stall: .8, tint: '#141a4055' },
};

export const DRYER = { x: 285, chance: .35, seconds: 1.8 }; // 왼쪽 벽 핸드드라이어. 도는 동안은 아무도 못 듣는다
export const KNOCK = { chance: .15, y: 268, seconds: .9 };   // 내 칸 문을 두드려 보고 옆 칸으로 간다
export const CLOSE_CALL = { window: .45, bonus: 60 };        // 위험해지기 직전에 뗐을 때 주는 가산점
export const LAP_BONUS = 300;                                // 무한 모드에서 한 바퀴 채울 때마다

// max: 나를 뺀 동시 인원, gap: 한 무리 안의 입장 간격, lull: 무리 사이 쉬는 틈, warning: 복도에서 보이는 예고 시간,
// patience: 아무것도 못 하는 시간이 이보다 길어질 입장은 미룬다, fake: 숨만 들이쉬고 안 주는 확률
export const LEVELS = {
  EASY: { max: 1, gap: 1, warning: 2, lull: 4.5, patience: 6, fake: 0 },
  NORMAL: { max: 2, gap: 1, warning: 1.5, lull: 3.8, patience: 6.5, fake: 0 },
  HARD: { max: 3, gap: .8, warning: 1.25, lull: 3, patience: 7, fake: .2 },
  'EXTRA HARD': { max: 4, gap: .7, warning: 1.1, lull: 2.4, patience: 7.5, fake: .2 },
};

export const FILL_SECONDS = 8;   // 혼자 힘줘서 한 바퀴 채우는 시간
export const HOLD_LIMIT = 13;    // 이만큼 참으면 새어 나온다
export const LEAK_SECONDS = .7;  // 새어 나오는 동안은 손을 떼도 힘이 들어간다
export const PAR_SECONDS = 60, SPEED_BONUS = 15; // 60초보다 빨리 끝낸 1초마다 가산점
export const INTRO_SECONDS = 2.8;  // 걸어 들어와 앉기까지
export const STARE_SECONDS = 2.6;  // 들킨 뒤 정적 → 고개 돌리기를 보여 주는 시간
