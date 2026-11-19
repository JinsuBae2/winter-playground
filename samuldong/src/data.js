// 수치와 문구. 밸런스를 바꿀 때는 여기만 고치고 npm test 로 대기 시간·완주 여부를 다시 본다.
export const AISLE_Y = 347, WASH_Y = 352, SEAT_Y = 152, DOOR_X = 762, HALL_X = 860;
export const BASINS = [399, 537, 675], STALLS = [335, 685]; // 가운데 칸(510)은 내 자리
export const NAMES = ['김 과장', '이 대리', '박 차장', '최 부장'];

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
