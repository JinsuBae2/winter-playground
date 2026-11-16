# 이미지 에셋 목록

지금 게임의 그림은 전부 코드로 그린 SVG다. 아래 이미지를 만들어 `assets/` 폴더에 **파일 이름 그대로** 넣으면 교체한다.
전부 한꺼번에 만들 필요 없다. 1순위만 있어도 영업 화면의 인상이 바뀐다.

## 공통 규칙

- **형식**: PNG 또는 WebP. 배경은 **투명**(배경·지도 제외). 투명이 안 되면 순백(#FFFFFF) 단색 배경으로 만든다.
- **화풍을 하나로 고정**한다. 첫 이미지(붕어빵)가 마음에 들면 그것을 스타일 참조로 넣어 나머지를 만든다. 화풍이 섞이면 지금보다 더 어색해진다.
- **글자를 넣지 않는다**(간판 글씨 포함). 글자는 게임이 그린다.
- 실존 브랜드·캐릭터·인물을 닮게 만들지 않는다.

모든 프롬프트 앞에 붙이는 **공통 스타일 문구**:

```
cozy hand-painted 2D game art, soft cel shading, warm lantern lighting, Korean winter night street food stall mood,
clean shapes, thick soft outlines, slightly chunky proportions, no text, no watermark
```

## 1순위 — 영업 화면 (13장)

### 붕어빵 3장
세 장이 **같은 구도·같은 크기**여야 한다(게임이 겹쳐 놓고 익은 정도에 따라 서서히 바꾼다). 한 장을 만든 뒤 색만 바꾸는 방식을 권한다.

| 파일 | 크기 | 내용 |
|---|---|---|
| `fish_raw.png` | 512×320 | 덜 익은 붕어빵. 옅은 크림색 반죽 |
| `fish_golden.png` | 512×320 | 잘 익은 붕어빵. 황금 갈색, 윤기 |
| `fish_burnt.png` | 512×320 | 탄 붕어빵. 검갈색, 그을음 |

```
[공통 스타일], a single bungeoppang (Korean fish-shaped pastry) seen directly from above, head pointing LEFT, tail right,
embossed scales, eye and fins, GOLDEN BROWN crispy surface with slight gloss, centered, fills the frame, transparent background
```
색 부분만 교체: `PALE CREAM uncooked batter surface` / `BURNT dark brown-black charred surface`

### 틀 2장

| 파일 | 크기 | 내용 |
|---|---|---|
| `plate.png` | 1024×1024 | 위에서 본 원형 주물 불판. 칸 없이 판만, 가운데 버너 구멍 |
| `mold.png` | 512×512 | 위에서 본 원형 주물 틀 한 칸. 붕어 모양으로 파인 홈(머리 왼쪽), 비어 있음 |

```
[공통 스타일], top-down view of a round black cast-iron griddle plate for a street food stall, concentric grooves,
riveted rim, round burner opening in the exact center, empty, perfectly circular, centered, transparent background
```
```
[공통 스타일], top-down view of one round cast-iron bungeoppang mold, a fish-shaped recessed cavity with scale texture,
head pointing LEFT, empty and oiled, perfectly circular, centered, transparent background
```

### 손님 7장 + 배경 1장
손님은 허리 위, 정면, 겨울옷. 표정은 게임에서 흔들림·색으로 표현하므로 **웃는 얼굴 한 장씩**이면 된다.

| 파일 | 크기 | 내용 |
|---|---|---|
| `cust_1.png` `cust_2.png` | 384×384 | 일반 손님 2명(목도리 두른 20대, 패딩 입은 30대) |
| `reg_minji.png` | 384×384 | 고딩 민지 — 교복 위 패딩, 백팩 |
| `reg_park.png` | 384×384 | 박 과장 — 코트, 서류 가방, 피곤한 미소 |
| `reg_halmae.png` | 384×384 | 시장 할머니 — 털목도리, 장바구니 |
| `reg_junho.png` | 384×384 | 택배 기사 준호 — 작업 조끼, 모자 |
| `reg_sua.png` | 384×384 | 고양이 집사 수아 — 고양이 무늬 목도리 |
| `scene_bg.png` | 1200×640 | 밤 골목 배경. 아래 1/4은 나무 매대 상판. 사람 없음, 불투명 |

```
[공통 스타일], character portrait, waist-up, facing the viewer, a Korean high school girl in a puffer jacket over
a school uniform with a backpack, gentle smile, standing in front of a food stall, centered, transparent background
```
```
[공통 스타일], a snowy Korean alley at night seen from inside a street food stall, string lights and warm lanterns,
blurred shop fronts, empty street with no people, the bottom quarter is a wooden counter top, wide 15:8 image
```

## 2순위 — 지도와 가게 (12장)

| 파일 | 크기 | 내용 |
|---|---|---|
| `map_town.png` | 1000×1200 | 눈 덮인 작은 마을을 위에서 본 지도. 길과 강, 나무만. **건물 없음**, 불투명 |
| `map_city.png` | 1000×1200 | 같은 화풍의 더 넓은 도시 지도. 건물 없음, 불투명 |
| `b_cart.png` | 512×512 | 내 붕어빵 포장마차(빨강·흰 줄무늬 천막) |
| `b_grocer.png` | 384×384 | 재료상점(곡물 자루, 초록 지붕) |
| `b_furniture.png` | 384×384 | 가구·주방기구 상점(보라 지붕) |
| `b_hq.png` | 384×384 | 본점 건물(붕어빵 가게, 빨간 지붕) |
| `b_school.png` `b_station.png` `b_market.png` `b_office.png` `b_truck.png` | 384×384 | 학교, 기차역, 전통시장 입구, 사무용 빌딩, 붕어빵 푸드트럭 |
| `icon.png` | 1024×1024 | 앱 아이콘. 남색 바탕에 황금 붕어빵 하나. 불투명, 모서리는 게임이 둥글린다 |

```
[공통 스타일], small isometric building icon, a cozy Korean grain and ingredient shop with a snowy green roof,
sacks of red beans by the door, warm window light, three-quarter view, centered, transparent background
```
```
[공통 스타일], top-down illustrated map of a small snowy Korean town, winding roads, a frozen river along the bottom,
snow-covered trees, NO buildings, empty lots where buildings will be placed, portrait 5:6 image
```

## 3순위 — 수집·꾸미기 (21장, 없어도 됨)

| 파일 | 크기 | 내용 |
|---|---|---|
| `end_bankrupt.png` `end_gold.png` `end_truck.png` `end_landlord.png` `end_franchise.png` `end_master.png` `end_salon.png` `end_fusion.png` `end_local.png` | 800×600 | 엔딩 삽화 9장. 도감과 결과 공유에 쓴다. 불투명 |
| `fill_pat.png` `fill_cream.png` `fill_goguma.png` `fill_matcha.png` `fill_pizza.png` `fill_dubai.png` `fill_mint.png` | 128×128 | 소 아이콘 7개(지금은 이모지) |
| `up_mold.png` `up_fire.png` `up_warmer.png` `up_sign.png` `up_price.png` | 128×128 | 가구상점 물건 5개(지금은 이모지) |

엔딩 삽화의 장면은 `src/data.js`의 `ENDINGS` 각 줄 `text`에 적힌 문장을 그대로 묘사하면 된다.

## 넣은 뒤

`assets/`에 PNG를 넣고 `npm run assets`를 돌리면 `assets/web/`에 압축본이 생기고 게임에 반영된다.

`assets/`에 파일을 넣고 알려 주면, 있는 파일만 그림으로 바꾸고 없는 것은 지금의 SVG를 그대로 쓴다.
크기는 권장값이다. 가로세로 비율만 맞으면 더 커도 된다.
