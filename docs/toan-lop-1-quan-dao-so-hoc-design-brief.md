TASK: REDESIGN TRANG TOÁN LỚP 1 THÀNH "QUẦN ĐẢO SỐ HỌC"

Route hiện tại:
- /game/lop-1/toan

Mục tiêu:
- Thay giao diện card "Bài 1, Bài 2..." hiện tại.
- Chuyển thành bản đồ game dạng quần đảo trên biển.
- Tổng cộng 41 bài.
- PC: 4 bài / hàng.
- Tablet: 2 bài / hàng.
- Mobile: 1 bài / hàng.
- Các bài nối với nhau thành một hành trình liên tục từ 1 → 41.
- Style vui nhộn, game, không giống sách giáo khoa.
- Đây chỉ là redesign trang danh sách bài học.
- KHÔNG sửa logic các game bên trong.
- KHÔNG làm ảnh hưởng header, auth, dashboard, tracking hiện tại.

==================================================
1. CONCEPT CHUNG
==================================================

Tên concept:

"TOÁN LỚP 1 – QUẦN ĐẢO SỐ HỌC"

Background:
- Biển xanh dương pastel rất nhẹ.
- Không dùng background xanh quá đậm.
- Có thể dùng gradient:

top:
#EAF8FF

middle:
#DDF5FF

bottom:
#CDEEFF

Có thể thêm:
- sóng nhỏ
- mây
- chim biển
- cá
- đá
- bong bóng nước
- san hô
- hải đăng
- thuyền nhỏ

Nhưng decoration phải nhẹ, không che các bài học.

Không dùng từng card hình chữ nhật nữa.

Mỗi bài học là một "island node".

==================================================
2. HEADER / PHẦN ĐẦU TRANG
==================================================

GIỮ NGUYÊN HEADER GLOBAL HIỆN TẠI.

Bên dưới header vẫn giữ breadcrumb:

Game > Lớp 1 > Toán

Sau breadcrumb thêm hero nhỏ.

Desktop:

-----------------------------------------

Toán lớp 1
Quần đảo số học

"Cùng Cappy khám phá 41 bài học nhé!"

                         Tiến độ lớp 1
                         8 / 41 bài
                         [======-----] 20%

-----------------------------------------

Không làm hero quá cao.

Khoảng:
desktop: 140–180px
mobile: 180–220px

Có thể có Cappy nhỏ ở bên trái hoặc góc hero.

Nếu chưa có asset Cappy phù hợp:
- tạo placeholder component
- không làm lỗi layout nếu thiếu asset.

==================================================
3. LESSON DATA
==================================================

Tạo data riêng cho 41 bài.

Ví dụ:

type LessonMapItem = {
  id: number;
  lessonId: string;
  title: string;
  shortTitle?: string;
  href: string;
  status: "completed" | "current" | "available" | "locked";
  stars?: number;
};

Tạo array:

const lessons = [
 {
   id: 1,
   lessonId: "...",
   title: "Các số 0–5",
   href: "/game/lop-1/toan/bai-1",
 },
 {
   id: 2,
   title: "Các số 6–10",
   href: "/game/lop-1/toan/bai-2",
 },
 ...
];

Hiện tại nếu chưa có đủ tên thật 41 bài:
- Bài 1 và Bài 2 dùng tên thật hiện có.
- Bài 3 → 41 có thể tạm:
  "Bài 3"
  "Bài 4"
  ...
- Sau này tôi sẽ update title từ dữ liệu SGK.

QUAN TRỌNG:
Không hardcode UI 41 lần.

Phải render:

lessons.map(...)

==================================================
4. LOGIC STATUS
==================================================

UI phải hỗ trợ sẵn 4 trạng thái.

-----------------------------------
A. COMPLETED
-----------------------------------

Bài đã hoàn thành.

Island:
- màu xanh lá / nhiệt đới tươi.
- badge số màu xanh.
- hiển thị ✓ nhỏ.
- hiển thị số sao nếu có.

Ví dụ:

    ✓
   [01]
    🏝
  ★★★

Vẫn click được để bé chơi lại.

KHÔNG disable completed.

-----------------------------------
B. CURRENT
-----------------------------------

Bài hiện tại / bài nên chơi tiếp.

Đây là trạng thái nổi bật nhất.

- badge màu xanh dương.
- island sáng hơn.
- glow nhẹ.
- animation float rất nhẹ.
- có label:

"Tiếp theo"

hoặc

"Đang học"

Có thể có Cappy nhỏ đứng cạnh.

-----------------------------------
C. AVAILABLE
-----------------------------------

Bài đã mở nhưng chưa hoàn thành.

- island bình thường.
- click được.
- không glow.

-----------------------------------
D. LOCKED
-----------------------------------

Bài chưa mở.

- grayscale / desaturate.
- opacity khoảng 0.65–0.8.
- đá / cây có màu xám.
- badge số xám.
- icon ổ khóa.

Không click vào route.

Có thể click node để hiện toast:

"Hoàn thành bài trước để mở bài này nhé!"

==================================================
5. QUY TẮC DEMO TRƯỚC KHI LOAD DATABASE
==================================================

Trong giai đoạn chưa nối progress thật:

Dùng mock:

Bài 1:
completed
stars = 3

Bài 2:
completed
stars = 3

Bài 3:
current
stars = 2

Bài 4:
locked

Bài 5 trở đi:
locked

Nhưng viết code sao cho sau này chỉ cần thay:

getLessonStatus()

không cần sửa component.

Ví dụ:

function getLessonStatus(lesson, progressData) {}

Hoặc tạo adapter:

const lessonMapData = buildLessonMapData(
    lessons,
    userLessonProgress
);

==================================================
6. DESKTOP LAYOUT
==================================================

Breakpoint desktop:

>= 1024px

Dùng:

grid-template-columns: repeat(4, minmax(0, 1fr));

Mỗi hàng có 4 đảo.

Đường đi theo kiểu con rắn.

Hàng 1:

1 → 2 → 3 → 4

Hàng 2:

8 ← 7 ← 6 ← 5

Hàng 3:

9 → 10 → 11 → 12

Hàng 4:

16 ← 15 ← 14 ← 13

...

Cho tới bài 41.

TỨC LÀ:

row index chẵn:
left → right

row index lẻ:
right → left

Nhưng thứ tự dữ liệu/SEO vẫn phải là:

1,2,3,4,5,6,...

Không đảo array data.

Chỉ thay visual position bằng CSS / layout function.

Ví dụ concept:

01 ------ 02 ------ 03 ------ 04
                              |
                              |
08 ------ 07 ------ 06 ------ 05
|
|
09 ------ 10 ------ 11 ------ 12
                              |
                              |
16 ------ 15 ------ 14 ------ 13

Không cần đường thẳng cứng.

Đường nối nên dạng:
- chấm trắng
- bo cong
- như dấu chân / hải trình trên biển.

==================================================
7. DESKTOP ISLAND SIZE
==================================================

Mỗi grid cell:

height khoảng:
230–280px

Island visual:
width khoảng:
150–190px

Không cần mỗi đảo quá to.

Node gồm:

        badge số
          01

       island asset

      title bài học

        ★★★

Ví dụ:

       [ 01 ]
      🏝🏝🏝
     Các số 0–5
       ★★★

Title:
- max 2 dòng
- text-align center
- khoảng 14–17px tùy màn hình.

Badge số:
- tròn.
- rõ.
- khoảng 42–52px desktop.

==================================================
8. MOBILE LAYOUT
==================================================

Breakpoint:

<= 640px

Không dùng 4 cột.

Chuyển thành 1 island / hàng.

Nhưng KHÔNG xếp chính giữa thành một đường thẳng nhàm chán.

Cho node đi ziczac:

Bài 1:
left 25%

Bài 2:
left 65%

Bài 3:
left 30%

Bài 4:
left 68%

Bài 5:
left 25%

...

Ví dụ:

      🏝 01
          \
           ·
            \
             🏝 02
              /
             ·
            /
      🏝 03
          \
           ·
            \
             🏝 04

Mỗi bài khoảng:
190–230px chiều cao.

Island:
140–170px.

Không cho text quá dài.

Mobile vẫn phải scroll dọc tự nhiên.

KHÔNG scroll ngang.

==================================================
9. TABLET
==================================================

641–1023px:

2 island / hàng.

Có thể đi zigzag:

1 → 2
    |
4 ← 3
|
5 → 6

Tương tự desktop.

==================================================
10. PATH / ĐƯỜNG NỐI
==================================================

Đường đi nằm SAU các island.

Có thể implement:

OPTION A:
SVG absolute overlay.

OPTION B:
CSS pseudo element.

Ưu tiên SVG vì:
- dễ tạo curve.
- responsive.
- dashed line đẹp hơn.

Style:

stroke:
rgba(255,255,255,0.9)

stroke-width:
5–7px

stroke-dasharray:
8 12

stroke-linecap:
round

Có shadow/glow xanh rất nhẹ.

Không để path chạm vào text.

Path phải nằm:

z-index thấp hơn islands.

==================================================
11. ISLAND COMPONENT
==================================================

Tạo component reusable:

<LessonIsland />

Props:

lesson
status
stars
onClick

Ví dụ:

<LessonIsland
  lesson={lesson}
  status="completed"
  stars={3}
/>

Component phải tự xử lý visual theo status.

Structure gợi ý:

<div className="lesson-island">
    <div className="lesson-number">
        01
    </div>

    <div className="island-image">
        ...
    </div>

    <div className="lesson-title">
        Các số 0–5
    </div>

    <LessonStars />

    <LessonStatusBadge />
</div>

==================================================
12. ISLAND VISUAL
==================================================

Không cần tạo 41 ảnh đảo khác nhau.

Chỉ cần khoảng 3–5 variation.

Ví dụ:

island-01
island-02
island-03
island-04

Mapping:

const islandVariant = lesson.id % 4;

Như vậy đảo 1,5,9...
có thể reuse asset nhưng decoration vẫn tạo cảm giác khác.

Nếu hiện chưa có asset:
tạo temporary CSS island:

- oval green grass
- sand
- vài palm trees / rock using existing assets nếu có.

Sau này thay image PNG/WebP mà không sửa layout.

Tách:

<IslandArtwork variant={...} status={...} />

==================================================
13. CHECKPOINT ĐẶC BIỆT
==================================================

Để 41 bài không nhàm chán:

Mỗi khoảng 5 bài tạo checkpoint nhẹ.

Ví dụ:

5
10
15
20
25
30
35
41

Không thay logic bài học.

Chỉ decoration khác.

Có thể thêm:
- rương kho báu
- thuyền
- hải đăng
- cờ
- vương miện
- cá voi
- Cappy

Ví dụ bài 10:

   🎁
  🏝 10

Bài 20:

   🗼
  🏝 20

Bài 41:

   👑
  🏰 41

Đừng làm quá phức tạp ở version đầu.

==================================================
14. CHIA THÀNH CÁC VÙNG BIỂN
==================================================

Chuẩn bị code support region.

Ví dụ:

1–8:
tropical

9–16:
coral

17–24:
deepSea

25–32:
treasure

33–41:
finalIsland

Có helper:

getMapRegion(lessonId)

Version đầu chỉ cần background decoration khác nhẹ.

Không tạo section/card rõ ràng.

Map phải nhìn như một biển liên tục.

==================================================
15. PROGRESS BOX
==================================================

Ở đầu map có Progress component:

Tiến độ lớp 1

8 / 41 bài

progress bar

20%

Desktop:
đặt góc phải hero.

Mobile:
đặt dưới title / Cappy.

Component:

<ClassProgress
 completed={8}
 total={41}
/>

Sau này completed lấy DB.

Hiện mock được.

==================================================
16. CLICK BÀI HỌC
==================================================

Nếu:

completed/current/available:

click → route lesson hiện tại.

Ví dụ:

/game/lop-1/toan/bai-1

Không đổi route game hiện có.

Nếu locked:

prevent navigation.

Có feedback:
- shake nhẹ
- lock bounce
- toast:

"Bài này chưa mở nhé!"

==================================================
17. AUTO SCROLL
==================================================

Chuẩn bị function:

scrollToCurrentLesson()

Khi user đã có progress thật:

- vào trang
- tìm lesson có status current
- scroll gần tới node đó.

NHƯNG:

Không auto scroll nếu current lesson đang ở bài 1–3 vì đã nằm đầu màn hình.

Mobile:
dùng smooth scroll.

Desktop:
chỉ scroll nếu current lesson nằm ngoài viewport.

Nếu chưa nối DB:
không cần auto-scroll ngay.

Nhưng structure/ref phải support.

==================================================
18. ANIMATION
==================================================

Animation rất nhẹ.

CURRENT:
float:
translateY khoảng 4–6px.

Duration:
2–3s.

Completed:
không animation liên tục.

LOCK:
không animation.

Hover desktop:
scale 1.04
translateY -4px

Transition:
180–250ms.

Click:
scale 0.96.

Không sử dụng animation nặng ảnh hưởng performance.

==================================================
19. RESPONSIVE BREAKPOINT
==================================================

Desktop:

>= 1024px
4 columns

Tablet:

641px → 1023px
2 columns

Mobile:

<= 640px
1 column zigzag

Map container:

desktop:
max-width khoảng 1200–1400px.

width:
100%

margin:
auto.

Padding:
desktop 24px
mobile 12–16px.

==================================================
20. BACKGROUND FULL WIDTH
==================================================

Điểm quan trọng:

Biển phải phủ toàn bộ area bên dưới header.

Không tạo:

[ card ][ card ][ card ][ card ]

Mà phải nhìn như:

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~ OCEAN BACKGROUND ~~~~~~~~~~~
~~~~ 🏝 01 ~~~~ 🏝 02 ~~~~ 🏝 03 ~~~~~~~
~~~~~~~~~~ ................. ~~~~~~~~~~~~
~~~~ 🏝 08 ~~~~ 🏝 07 ~~~~ 🏝 06 ~~~~~~~
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Các grid cell phải transparent.

==================================================
21. PERFORMANCE
==================================================

Có 41 lesson nodes nên:

- không render animation canvas.
- không dùng Phaser cho trang này.
- dùng React + CSS + SVG.
- image dùng WebP nếu có.
- dùng next/image nếu phù hợp.
- decoration không quá nhiều DOM node.

Không load tất cả asset dung lượng lớn.

==================================================
22. ACCESSIBILITY
==================================================

Mỗi island clickable cần:

aria-label:

"Bài 1: Các số 0 đến 5"

Locked:

aria-disabled="true"

Keyboard:
Enter/Space vẫn mở lesson nếu available.

==================================================
23. COMPONENT STRUCTURE GỢI Ý
==================================================

Có thể tạo:

components/game/lesson-map/

LessonMap.tsx
LessonIsland.tsx
LessonPath.tsx
LessonStars.tsx
ClassProgress.tsx
MapDecoration.tsx

Hoặc nếu project hiện có convention khác:
follow convention hiện tại.

Không tạo architecture quá phức tạp.

==================================================
24. DATA STRUCTURE TÁCH UI
==================================================

Rất quan trọng:

LESSON CONTENT
và
LESSON PROGRESS

phải tách nhau.

Ví dụ:

const lessonDefinitions = [...]

progress lấy riêng:

userLessonProgress = [...]

Sau đó merge:

const lessonMapItems =
    mergeLessonProgress(
        lessonDefinitions,
        userLessonProgress
    );

Không lưu:

status: "completed"

cứng vĩnh viễn trong lesson definitions.

Mock status chỉ dùng temporary.

==================================================
25. LOGIC SAU NÀY
==================================================

Chuẩn bị để sau này có thể đưa dữ liệu:

lessonProgress = {
 lessonId,
 completed,
 bestScore,
 stars,
 gamesCompleted,
 gamesTotal,
 lastPlayedAt
}

Ví dụ:

Bài hoàn thành:
completed === true

Stars:
0–3

Current lesson:
lesson đầu tiên chưa completed nhưng đã unlock.

Locked:
phụ thuộc rule unlock.

Không implement DB mới trong task này nếu hệ thống hiện tại chưa có API tương ứng.

Chỉ chuẩn bị component nhận data.

==================================================
26. KHÔNG LÀM TRONG TASK NÀY
==================================================

Không sửa:

- game Bubble
- Gold Miner
- Racing
- DragDrop
- login
- register
- user DB
- dashboard
- adaptive learning
- tracking game
- API unrelated
- header global

Không thêm dependency lớn nếu không cần thiết.

Không dùng Phaser cho lesson map.

==================================================
27. DESIGN CHI TIẾT
==================================================

Typography phải follow website hiện tại.

Title:

Toán lớp 1

font-weight:
700–800

Không dùng font quá trẻ con nếu project chưa có.

Island number:
rất rõ vì đây là thứ bé nhìn đầu tiên.

Ưu tiên hierarchy:

1. Số bài
2. Island
3. Title
4. Stars/status

Không để title lấn át số bài.

==================================================
28. DESKTOP MOCK STRUCTURE
==================================================

PC phải gần concept này:

------------------------------------------------------

Game > Lớp 1 > Toán

TOÁN LỚP 1                         Tiến độ lớp 1
Quần đảo số học                    8 / 41
Cùng Cappy khám phá nhé!           ======= 20%


       01          02          03          04
       🏝 -------- 🏝 -------- 🏝 -------- 🪨
                                             |
                                             |
       08          07          06          05
       🪨 -------- 🪨 -------- 🏝 -------- 🏝
       |
       |
       09          10          11          12
       🪨 -------- 🪨 -------- 🪨 -------- 🪨
                                             |
                                             |

                     ...

------------------------------------------------------

Không cần exact thẳng như ASCII.
Đường phải mềm và game hơn.

==================================================
29. MOBILE MOCK STRUCTURE
==================================================

Mobile:

--------------------------------

Game > Lớp 1 > Toán

TOÁN LỚP 1
Quần đảo số học

[Cappy]

Tiến độ
8 / 41
=========


         01
        🏝
    Các số 0–5
       ★★★
          \
           ·
            \
               02
               🏝
          Các số 6–10
              ★★★
             /
            ·
           /
        03
        🏝
     So sánh số
       ★★☆

           \
            🔒
             04
             🪨

          ...

--------------------------------

Mỗi node cách nhau vừa phải.
Không để trang có khoảng trắng quá lớn.

==================================================
30. STYLE LOCKED
==================================================

Locked phải giống đảo "chưa khám phá".

Không chỉ opacity toàn component.

Có thể:

filter:
grayscale(0.8)
saturate(0.4)

Badge:
background #7E8998

Island:
hơi xám xanh.

Lock:
white / gray.

Title vẫn đọc được.

==================================================
31. STYLE CURRENT
==================================================

Current phải nổi bật.

Ví dụ:

badge:
#2F80ED

ring:
4px solid white

outer glow:
rgba(47,128,237,.35)

Có thể thêm:

✨

hoặc small label:

"Tiếp theo"

Không làm animation nhấp nháy mạnh.

==================================================
32. STYLE COMPLETED
==================================================

Completed:

badge:
#34B84A

check:
✓

Stars:
gold/yellow.

Không grayscale completed.

==================================================
33. BOTTOM CTA
==================================================

Cuối bài 41 có thể có một khu nhỏ:

"Hoàn thành hành trình Toán lớp 1"

Nhưng chỉ hiển thị khi scroll tới cuối.

Không cần button lớn trong version đầu.

Nếu bài 41 locked:
hiển thị castle/final island xám.

==================================================
34. IMPORTANT – KHÔNG PHẢI CLONE HÌNH MẪU 100%
==================================================

Hình mẫu chỉ để lấy concept:

- biển
- đảo
- đường hành trình
- locked island
- stars
- Cappy

UI cuối phải phù hợp website hiện tại.

Header web vẫn như hiện tại.

Desktop tận dụng chiều ngang với 4 island / row.

Mobile mới dùng kiểu journey 1 island / row.

==================================================
35. SAU KHI CODE XONG
==================================================

Kiểm tra ít nhất:

Desktop:
1920
1440
1280

Tablet:
768

Mobile:
390
375

Đảm bảo:

- không horizontal scrollbar
- path không lệch quá xa island
- text không overlap
- 41 bài render đầy đủ
- lesson 1 → 41 đúng thứ tự hành trình
- desktop 4 bài/hàng
- tablet 2 bài/hàng
- mobile 1 bài/hàng
- responsive khi resize trực tiếp
- locked không navigate
- completed vẫn navigate
- current nổi bật
- breadcrumb/header không bị thay đổi
- existing lesson routes vẫn hoạt động

==================================================
36. VERSION 1 ƯU TIÊN
==================================================

Ưu tiên code V1 trước:

1. Ocean background
2. 41 lesson nodes
3. 4/2/1 responsive grid
4. Snake ordering
5. Island visual
6. Completed/current/locked states
7. Stars
8. Responsive path
9. Progress bar
10. Basic decoration

Không cần làm quá nhiều animation/decoration trước.

Code sao cho sau này chỉ cần thay asset đảo và progress data
mà không phải viết lại LessonMap.