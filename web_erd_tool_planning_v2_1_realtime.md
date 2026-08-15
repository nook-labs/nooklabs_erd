# 🚀 차세대 웹 기반 ERD 설계 도구 기획서 v2.1 — 계정 기반 실시간 협업

**문서 기준일:** 2026년 8월 11일  
**프로젝트 성격:** 2~10인 소규모 팀 중심의 계정 기반 실시간 웹 ERD 설계 도구  
**프로젝트 방향:** ERDCloud의 사용 흐름을 벤치마킹하되, 코드·브랜드·디자인 자산을 복제하지 않고 독립적인 제품으로 개발

---

## 문서 보완 배경

기존 v2.0은 로그인 없이 사용하는 로컬 편집기를 먼저 완성한 뒤, 계정과 실시간 협업을 후속 단계로 추가하는 구조였습니다. 그러나 이 제품이 여러 사용자의 공동 설계를 핵심 사용 방식으로 삼는다면 다음 전제가 먼저 확정되어야 합니다.

- 편집 사용자는 계정으로 식별할 수 있어야 한다.
- 프로젝트마다 누가 Owner, Editor, Viewer인지 구분해야 한다.
- 초대받은 사용자가 같은 프로젝트 룸에 접속해 동시에 편집할 수 있어야 한다.
- 누가 온라인인지, 어떤 테이블·컬럼을 선택하거나 편집 중인지 보여야 한다.
- 동시 수정, 네트워크 단절, 재접속 상황에서도 작업이 유실되거나 조용히 덮어써지지 않아야 한다.
- 변경 이력과 스냅샷에는 실제 사용자 ID가 남아야 한다.

따라서 v2.1에서는 **로그인과 실시간 공동 편집을 P0**, 즉 MVP 필수 범위로 이동합니다. 비로그인 접근은 선택적인 읽기 전용 공개 링크에만 허용하고, 생성·편집·댓글·초대·DDL 내보내기 권한은 인증된 사용자에게 부여합니다.

제품의 차별화 축은 다음과 같이 재정의합니다.

- 계정 기반 실시간 공동 편집
- 누가 무엇을 편집 중인지 알 수 있는 Presence와 Awareness
- 키보드 중심 컬럼 편집
- 참고 이미지와 메모를 포함하는 설계 캔버스
- 정확하고 결정적인 SQL 생성
- 대형 모델에서도 유지되는 캔버스 성능
- 로컬 캐시와 서버 스냅샷을 함께 사용하는 복구 안정성

---

# 1. 프로젝트 정의

## 1.1 한 문장 정의

> 계정으로 식별된 여러 사용자가 하나의 프로젝트 룸에서 테이블·컬럼·관계를 동시에 편집하고, 참고 이미지와 설계 맥락을 공유하며, 검증된 DB별 DDL을 생성할 수 있는 실시간 웹 ERD 도구.

## 1.2 해결하려는 문제

기존 웹 ERD 도구를 사용할 때 다음과 같은 마찰이 발생하기 쉽습니다.

1. 컬럼을 여러 개 입력할 때 마우스 조작이 반복된다.
2. 설계 화면과 실제 서비스 화면·요구사항 이미지를 따로 관리해야 한다.
3. 테이블 수가 많아지면 이동, 선택, 관계선 표시가 무거워진다.
4. DDL 생성 결과에 DB별 문법 차이나 누락이 발생할 수 있다.
5. 자동 저장 여부와 장애 후 복구 가능성이 명확하지 않다.
6. 공동 작업 중 누가 어떤 테이블·컬럼을 보고 있거나 수정 중인지 알기 어렵다.
7. 두 사용자가 같은 항목을 동시에 수정하면 마지막 저장이 상대방 변경을 덮어쓸 수 있다.
8. 파일 전달 방식의 협업은 버전 분기와 병합 문제를 만든다.

## 1.3 주요 사용자

| 사용자 | 주요 목적 |
|---|---|
| 2~10인 개발팀 | ERD를 동시에 편집하고 API·DB 구조를 함께 리뷰 |
| 백엔드 개발자 | 기능 개발 전 테이블 구조를 빠르게 설계하고 팀에 공유 |
| DBA·데이터 담당자 | PK, FK, 인덱스, 제약조건과 DDL을 공동 검토 |
| 레거시 시스템 분석자 | 기존 DB 구조와 화면 캡처를 한 프로젝트에서 정리 |
| 기술 리더·리뷰어 | 읽기 또는 편집 권한으로 설계 변경을 확인하고 스냅샷 생성 |

## 1.4 제품 핵심 원칙

### 1. Identity First

프로젝트를 생성하거나 편집하는 사용자는 반드시 인증되어야 하며, 모든 중요한 변경에는 `userId`, `clientId`, 시각, 작업 출처가 연결되어야 한다.

### 2. Realtime by Default

공유 프로젝트는 열리는 즉시 실시간 룸에 연결된다. 공동 편집은 부가 기능이 아니라 기본 편집 방식이다.

### 3. Keyboard First

컬럼 입력·이동·복제·삭제·순서 변경 대부분을 키보드로 처리한다.

### 4. Schema First

캔버스 그림보다 실제 테이블, 컬럼, 키, 제약조건의 정합성이 우선이다.

### 5. Conflict-safe & Non-destructive

동시 편집, 관계 자동 생성, DDL Import가 다른 사용자의 변경을 조용히 덮어쓰지 않아야 한다. 같은 필드 편집에는 소프트 잠금과 명확한 충돌 표시를 적용한다.

### 6. Deterministic & Recoverable

동일한 모델에서는 동일한 DDL이 생성되어야 하며, 네트워크 단절·브라우저 종료·서버 재시작 이후에도 마지막 동기화 상태와 로컬 미전송 변경을 복구할 수 있어야 한다.

---

# 2. 제품 목표와 비목표

## 2.1 목표

- 이메일 인증, Magic Link 또는 OAuth로 사용자를 식별
- 프로젝트 Owner가 다른 사용자를 이메일로 초대
- Owner, Editor, Viewer 권한 구분
- 2~10명이 같은 프로젝트를 동시에 열고 편집
- 온라인 사용자, 커서, 선택 테이블, 편집 중인 셀 표시
- 같은 필드 동시 편집을 줄이는 소프트 잠금과 만료 처리
- 사용자별 Undo/Redo: 내 작업 취소가 다른 사용자의 변경을 되돌리지 않음
- 네트워크 단절 후 자동 재접속 및 미전송 변경 병합
- 20개 이상의 컬럼을 마우스 없이 연속 입력
- 논리명과 물리명을 동시에 관리
- PK, FK, 복합키, Unique, Index를 시각적으로 설계
- 관계 생성 시 FK 컬럼 자동 생성 또는 기존 컬럼 연결
- 참고 이미지와 메모를 ERD 주변에 배치하고 팀과 공유
- 사용자 정보가 포함된 스냅샷과 변경 이벤트 저장
- 프로젝트 파일로 전체 백업 및 복원
- MS SQL 기준으로 실행 가능한 DDL 생성
- 오류가 있는 경우 DDL 생성 전에 원인을 표시
- 100개 이상 테이블과 동시 접속자가 있는 환경에서도 편집 가능한 캔버스 제공

## 2.2 최초 출시에서 제외할 기능

다음 기능은 중요하지만 MVP에는 포함하지 않는다.

- 인증되지 않은 사용자의 프로젝트 생성 또는 편집
- 공개 링크를 통한 익명 공동 편집
- 운영 DB에 직접 접속하는 Reverse Engineering
- 음성·영상 통화와 일반 메신저 기능
- AI 기반 테이블 자동 생성
- DB 마이그레이션 스크립트 자동 생성
- 데이터 조회 및 SQL 실행
- ORM Entity 코드 생성
- 모든 DB의 DDL Import 동시 지원
- 트리거, 프로시저, 함수, 파티션의 완전한 모델링
- 대규모 조직용 SSO, SCIM, 감사 승인 흐름

특히 **SQL을 입력받더라도 DB에서 실행하지 않고 문자열로만 분석**해야 한다.

비로그인 사용자는 P1의 선택 기능인 **읽기 전용 공개 링크**로만 프로젝트를 열 수 있으며, 이 경우 커서 전송, 편집, 댓글, 내보내기 권한은 정책에 따라 제한한다.

---

# 3. 범위 및 우선순위

## 3.1 우선순위 정의

- **P0:** 최초 협업 MVP에 반드시 필요
- **P1:** MVP 안정화 후 추가
- **P2:** 장기 확장 기능

| 영역 | P0 | P1 | P2 |
|---|---|---|---|
| 계정 | 이메일·Magic Link 또는 OAuth 로그인, 프로필 | 다중 인증 수단, 계정 연결 | SSO·SCIM |
| 프로젝트 권한 | Owner·Editor·Viewer, 이메일 초대 | 프로젝트 그룹·템플릿 | 조직별 세부 정책 |
| 프로젝트 | 클라우드 생성, 복제, 삭제, 최근 목록 | 팀 워크스페이스, 보관 | 조직 간 이전 |
| 실시간 협업 | Yjs 동기화, Presence, 커서, 선택, 편집 표시, 사용자별 Undo | 댓글, 멘션, 버전 Diff | 승인 흐름, 브랜치·병합 |
| 캔버스 | Pan, Zoom, 선택, 미니맵, 검색 | 자동 정렬, 영역 노드 | 다중 다이어그램 뷰 |
| 테이블 | 논리·물리명, 컬럼, PK, FK, Unique, Index | Domain, Check, 고급 Index | 파티션, Tablespace |
| 관계 | 1:1, 1:N, 식별·비식별, FK 자동 생성 | 관계선 수동 경로 | 논리 모델 전용 관계 |
| 이미지 | 업로드·붙여넣기, 이동, 투명도, 잠금, 공동 표시 | 자르기, 주석, 댓글 | 이미지 버전 관리 |
| 저장·복구 | 서버 Yjs 저장, 주기적 스냅샷, IndexedDB 캐시, 파일 백업 | 오프라인 장기 편집·재동기화 | 다중 리전 복제 |
| SQL | MS SQL Export | PostgreSQL·MySQL Export, MS SQL Import | Oracle, 기타 DB |
| 공유 | 인증된 프로젝트 초대 | 비로그인 읽기 전용 링크 | 외부 검토 승인 링크 |
| 출력 | SQL, 프로젝트 파일 | PNG, PDF | 문서 템플릿 Export |

실시간 공동 편집은 P0이므로, 캔버스와 스키마 기능을 구현할 때부터 단일 사용자 상태가 아니라 **공유 문서 상태**를 기준으로 설계해야 한다.

---

# 4. 주요 사용자 흐름

## 4.1 로그인 및 프로젝트 생성

1. 사용자가 이메일 Magic Link, 비밀번호 또는 OAuth로 로그인한다.
2. 신규 사용자는 표시 이름과 프로필 이미지를 설정한다.
3. 새 프로젝트를 선택하고 프로젝트명, 대상 DB, 기본 스키마를 지정한다.
4. 프로젝트 생성자는 자동으로 Owner가 된다.
5. 프로젝트 룸과 서버 저장 문서가 생성된다.
6. 브라우저는 Yjs 문서와 IndexedDB 캐시를 초기화하고 WebSocket 룸에 접속한다.
7. 상단에 연결 상태와 현재 접속 사용자가 표시된다.

## 4.2 사용자 초대 및 참여

1. Owner가 이메일과 역할을 지정해 초대한다.
2. 초대 대상자는 초대 링크를 열고 로그인한다.
3. 서버는 초대 토큰, 이메일, 만료 시각을 검증한다.
4. 초대가 수락되면 `project_members`에 사용자와 역할이 등록된다.
5. 사용자가 프로젝트를 열면 권한 확인 후 실시간 룸 입장 토큰이 발급된다.
6. Editor는 편집할 수 있고 Viewer는 조회만 할 수 있다.

## 4.3 테이블과 컬럼 공동 작성

1. 사용자가 캔버스에서 `T`를 누르거나 테이블 도구를 선택한다.
2. 생성 작업은 하나의 Yjs 트랜잭션으로 처리되고 다른 사용자 화면에 즉시 반영된다.
3. 논리명과 물리명을 입력한다.
4. `Enter`와 `Tab`으로 컬럼을 연속 작성한다.
5. 현재 편집 셀에는 사용자 이름과 색상 테두리가 표시된다.
6. 다른 사용자가 같은 셀을 선택하면 읽기 상태 또는 충돌 경고를 보여준다.
7. 입력이 끝나면 소프트 잠금이 해제되고 서버에 업데이트가 저장된다.

## 4.4 관계 생성

1. 부모 테이블의 키 또는 관계 핸들을 선택한다.
2. 자식 테이블에 연결한다.
3. 연결할 부모 키를 선택한다.
4. 자식 테이블에 호환 컬럼이 있으면 기존 컬럼 연결을 제안한다.
5. 없으면 FK 컬럼 자동 생성을 제안한다.
6. 식별·비식별, Null 허용, 삭제 규칙을 선택한다.
7. 관계와 FK 컬럼·제약조건을 하나의 공유 트랜잭션으로 생성한다.

## 4.5 DDL 생성

1. 사용자가 DDL 미리보기를 연다.
2. 현재 동기화된 공유 모델을 기준으로 전체 검증이 실행된다.
3. 오류와 경고를 구분해 표시한다.
4. 오류가 있으면 해당 테이블·컬럼으로 이동할 수 있다.
5. 오류가 없으면 대상 DB의 SQL을 생성한다.
6. 사용자는 복사하거나 `.sql` 파일로 저장한다.
7. 선택적으로 DDL 생성 이벤트와 생성자를 활동 기록에 남긴다.

## 4.6 참고 이미지 사용

1. 이미지 파일을 업로드하거나 클립보드에서 붙여넣는다.
2. 파일은 권한이 적용된 Private Storage에 저장된다.
3. 이미지 메타데이터와 캔버스 위치가 공유 문서에 추가된다.
4. 다른 사용자는 같은 이미지를 즉시 확인한다.
5. 크기, 투명도, 잠금, 앞뒤 순서를 조정한다.
6. 이미지 노드는 스키마 모델과 분리되며 DDL과 검증 대상에서 제외된다.

---

# 5. 화면 및 정보 구조

## 5.1 로그인·초대 화면

- 이메일 로그인 또는 Magic Link 요청
- OAuth 로그인
- 초대 프로젝트명, 초대한 사용자, 부여 역할 표시
- 초대 만료 또는 이미 사용된 토큰 오류 안내
- 인증 완료 후 원래 프로젝트로 복귀

## 5.2 프로젝트 목록 화면

### 표시 항목

- 프로젝트명
- 대상 DB
- 내 역할: Owner, Editor, Viewer
- 멤버 수와 현재 접속자 수
- 테이블 수
- 마지막 수정 시각
- 마지막 수정 사용자
- 연결·동기화 상태
- 즐겨찾기 여부
- 썸네일

### 제공 기능

- 새 프로젝트
- 프로젝트 복제
- 멤버 초대와 역할 변경
- 프로젝트 파일 가져오기·내보내기
- 삭제 또는 보관
- 최근 프로젝트 정렬
- 이름 검색
- 내가 Owner인 프로젝트만 보기

## 5.3 ERD 편집 화면

### 상단 바

- 프로젝트명과 내 역할
- 연결 상태: 연결 중, 동기화 완료, 재연결 중, 오프라인, 권한 오류
- 현재 접속자 Avatar Stack
- 초대·공유 버튼
- Undo / Redo
- 논리명·물리명 보기 전환
- 확대 비율
- 검증 결과
- DDL 미리보기
- 내보내기
- 프로젝트 설정

### 왼쪽 도구 영역

- 테이블 추가
- 관계 추가
- 이미지 추가
- 메모 추가
- 영역 추가
- 검색
- 미니맵 표시 전환

### 중앙 캔버스

- 테이블 노드
- 관계선
- 이미지 노드
- 메모 노드
- 영역 노드
- 다른 사용자의 커서와 이름
- 다른 사용자가 선택한 테이블의 외곽선
- 현재 편집 중인 셀과 소프트 잠금 표시
- 선택 및 이동
- 다중 선택
- 복사·붙여넣기
- 정렬 보조선

### 오른쪽 Inspector

선택 항목에 따라 내용이 달라진다.

- 테이블 선택: 테이블 속성, 컬럼, 인덱스
- 컬럼 선택: 타입, 키, 기본값, 설명
- 관계 선택: 카디널리티, FK, 삭제 규칙
- 이미지 선택: 크기, 투명도, 잠금
- 다중 선택: 정렬, 간격 맞춤, 삭제
- 공동 편집 중인 항목: 편집 사용자, 잠금 만료 상태, 최신 변경 시각

### 하단 패널

- 모델 검증 결과
- DDL 미리보기
- 프로젝트 활동 기록
- Import 결과 및 경고
- 연결·재접속 이벤트

---

# 6. UI 디자인 원칙

- 무채색과 흰색·검은색을 기본으로 사용
- 그라데이션과 과한 그림자 사용 금지
- PK, FK, 오류, 경고와 사용자별 실시간 커서처럼 의미가 있는 상태에만 색상 사용
- 테이블 제목과 컬럼 본문 간 대비 명확화
- 선택되지 않은 영역을 완전히 흐리게 만들지 않음
- 폰트 크기보다 굵기와 여백으로 계층 표현
- 테이블 노드 안에서는 장식보다 정보 밀도 우선
- 관계선 애니메이션 사용 금지
- 사용자별 색상은 이름·Avatar·테두리와 함께 표시해 색상만으로 식별하지 않음
- 원격 커서와 선택 강조는 작업을 방해하지 않도록 일정 시간 비활성 시 축소
- 확대 수준에 따라 표시 정보를 줄이는 LOD 적용

권장 상태 색상은 다음 정도로 제한한다.

- PK: 강조색 1개
- FK: 보조색 1개
- 오류: 빨간색
- 경고: 주황색
- 선택: 테두리 강조
- 나머지: 흑백 및 회색

---

# 7. 상세 기능 요구사항

## 7.1 계정·프로젝트·권한 관리

### 사용자 기본 속성

- 사용자 ID
- 이메일
- 표시 이름
- 프로필 이미지
- 계정 상태
- 마지막 로그인 시각
- 생성 시각

### 프로젝트 기본 속성

- 프로젝트 ID
- Owner ID
- 프로젝트명
- 설명
- 대상 DB
- 기본 스키마
- 대소문자 규칙
- 식별자 따옴표 정책
- 문서 버전
- 실시간 룸 ID
- 생성자와 생성 시각
- 마지막 수정 사용자와 수정 시각
- 보관 여부

### 프로젝트 멤버

- `owner`: 프로젝트 삭제, 멤버·권한 관리, 편집, 스냅샷, 내보내기
- `editor`: 모델과 캔버스 편집, 이미지 업로드, DDL 생성
- `viewer`: 조회, 검색, 선택적 내보내기

### 필수 기능

- 로그인·로그아웃·세션 갱신
- 프로젝트 생성, 이름 변경, 복제, 삭제
- 이메일 초대 발송, 재발송, 취소
- 초대 수락과 만료 처리
- 멤버 목록과 온라인 상태
- 역할 변경과 멤버 제거
- 최근 작업 자동 복구
- 프로젝트 파일 내보내기·가져오기
- 문서 포맷 Migration

프로젝트 이름이나 테이블 이름을 ID로 사용하지 않고, 내부적으로는 변경되지 않는 UUID를 사용해야 한다. 이름을 변경해도 관계, 권한, 실시간 룸, 파일 Asset 참조가 깨지지 않아야 한다.

## 7.2 캔버스 엔진

### 기본 조작

- 마우스 드래그 또는 `Space + 드래그`로 이동
- 휠 또는 트랙패드로 확대·축소
- 전체 맞춤
- 선택 항목 맞춤
- 미니맵
- 박스 선택
- `Shift` 다중 선택
- 노드 복사·붙여넣기
- 노드 복제
- 삭제
- 정렬 및 간격 맞춤
- 스냅 그리드
- 캔버스 검색

### 검색

`Ctrl/Cmd + K`로 검색창을 열어 다음을 검색한다.

- 논리 테이블명
- 물리 테이블명
- 논리 컬럼명
- 물리 컬럼명
- 테이블 설명

결과를 선택하면 해당 테이블로 이동하고 잠시 강조한다.

### Focus Mode

테이블을 선택하면 다음만 강하게 표시한다.

- 선택 테이블
- 직접 연결된 테이블
- 직접 연결된 관계선

나머지는 완전히 숨기지 않고 약하게 표시한다.

### 대형 모델용 LOD

확대 수준에 따라 노드 표시를 변경한다.

| 확대 수준 | 표시 내용 |
|---|---|
| 낮음 | 테이블명만 표시 |
| 중간 | 테이블명, PK, FK만 표시 |
| 높음 | 전체 컬럼 표시 |
| 매우 높음 | 타입, 기본값, 설명 표시 |

### 추가 최적화

- 화면 밖 노드 렌더링 최소화
- 화면 축소 시 관계선 라벨 숨김
- 선택되지 않은 복잡한 스타일 제거
- 노드와 이벤트 핸들러 메모이제이션
- 전체 노드 배열을 불필요하게 구독하지 않도록 Store Selector 분리
- 연속 드래그 중에는 저장과 검증을 지연
- 대량 Import와 자동 정렬은 Web Worker 사용

React Flow는 노드·엣지 상호작용과 화면에 보이는 요소만 렌더링하는 옵션을 제공하지만, 라이브러리를 선택하는 것만으로 대형 모델 성능이 보장되지는 않는다. 따라서 콜백과 노드 컴포넌트 메모이제이션, 전체 노드 배열 구독 회피, 복잡한 스타일 축소 등을 설계 단계부터 반영해야 한다.

---

## 7.3 테이블 편집

### 테이블 속성

- 논리명
- 물리명
- 스키마명
- 설명
- 표시 색상 또는 태그
- 컬럼 목록
- PK
- Unique 제약조건
- Index
- Check 제약조건
- 테이블 옵션

### 컬럼 속성

| 속성 | 설명 |
|---|---|
| 논리명 | 사용자에게 표시할 업무상 명칭 |
| 물리명 | 실제 DB 컬럼명 |
| 데이터 타입 | 대상 DB 타입 |
| 길이 | VARCHAR, NVARCHAR 등의 길이 |
| 정밀도 | DECIMAL Precision |
| 스케일 | DECIMAL Scale |
| PK | 기본키 포함 여부와 순서 |
| FK | 외래키 여부 |
| Nullable | NULL 허용 여부 |
| Unique | 유일성 제약 |
| Identity | 자동 증가 여부 |
| Default | 기본값 또는 기본 표현식 |
| Comment | 컬럼 설명 |
| 정렬 순서 | 테이블 안에서의 표시 순서 |

### 키보드 편집 규칙

| 키 | 동작 |
|---|---|
| `Enter` | 현재 셀 확정 후 다음 행 또는 새 컬럼 |
| `Tab` | 다음 필드 |
| `Shift + Tab` | 이전 필드 |
| `Esc` | 현재 편집 취소 |
| `Ctrl/Cmd + D` | 컬럼 복제 |
| `Ctrl/Cmd + Enter` | 현재 컬럼 확정 후 새 컬럼 |
| `Alt + ↑/↓` | 컬럼 순서 이동 |
| `Delete` | 선택 컬럼 삭제 |
| `Ctrl/Cmd + Z` | 실행 취소 |
| `Ctrl/Cmd + Shift + Z` | 다시 실행 |

텍스트 입력 중에는 캔버스 단축키가 실행되지 않아야 한다.

### 대량 입력

다음 형식의 클립보드 붙여넣기를 지원한다.

```text
회원번호    user_id     BIGINT      PK      NOT NULL
회원명      user_name   NVARCHAR    100     NOT NULL
이메일      email       NVARCHAR    200     NULL
```

붙여넣기 전에 컬럼 해석 결과를 미리 보여주고, 매핑이 애매한 항목만 사용자에게 선택하도록 한다.

### 컬럼 삭제 규칙

컬럼이 관계에 사용 중이면 즉시 삭제하지 않는다.

1. 사용 중인 관계를 표시
2. 관계까지 삭제할지 질문
3. 취소 가능
4. 삭제 전체를 하나의 Undo 단위로 기록

---

## 7.4 키와 인덱스

기존 초안에는 PK와 FK만 있어 실제 DDL 도구로는 부족하다.

### P0 지원

- 단일 PK
- 복합 PK 및 컬럼 순서
- FK
- 복합 FK
- Unique 제약조건
- 단일·복합 Index
- Index 컬럼 순서
- Identity
- Default Constraint

### P1 지원

- Check Constraint
- MS SQL Included Column
- Filtered Index
- PostgreSQL Partial Index
- Computed·Generated Column
- 사용자 지정 제약조건명
- Domain 또는 사용자 정의 타입

### P2 지원

- 파티션
- Tablespace·Filegroup
- Clustered·Nonclustered 세부 옵션
- Sequence
- 함수 기반 Index

---

## 7.5 관계 정의

### 지원 관계

- 1:1
- 1:N
- 식별 관계
- 비식별 관계
- 필수 관계
- 선택 관계

### 식별 관계

부모 PK가 자식 테이블의 다음 역할을 동시에 수행한다.

- FK
- 자식 PK의 일부

### 비식별 관계

부모 PK를 자식의 FK로 사용하지만 자식 PK에는 포함하지 않는다.

### FK 생성 흐름

관계를 연결하면 다음 순서로 처리한다.

1. 참조할 부모 Unique Key 선택
2. 자식 컬럼 자동 탐색
3. 타입과 컬럼 개수가 일치하면 기존 컬럼 연결 제안
4. 일치 컬럼이 없으면 신규 컬럼 생성 제안
5. 신규 컬럼 이름 미리보기
6. Nullable 및 삭제 규칙 선택
7. 관계 생성

자동 생성된 컬럼에는 다음 메타데이터를 보관한다.

```text
origin: relationship-generated
relationshipId: 관계 ID
sourceColumnId: 원본 부모 컬럼 ID
```

사용자가 컬럼을 직접 수정하면 `detached` 상태로 전환해 이후 부모 컬럼명 변경이 자식 컬럼을 임의로 덮어쓰지 않도록 한다.

### 관계 삭제

관계를 삭제할 때 선택지를 제공한다.

- 관계와 자동 생성 FK 컬럼 모두 삭제
- 관계만 삭제하고 컬럼 유지
- 취소

### 1:1 관계

물리적으로 1:1을 보장하려면 자식 FK에 Unique 제약조건이 필요하다. 따라서 1:1 생성 시 Unique 제약조건을 자동 생성하거나 경고해야 한다.

### N:M 관계

관계형 DB의 물리 모델에는 직접적인 N:M FK가 존재하지 않으므로, MVP에서는 N:M 선만 생성하지 않는다.

사용자가 N:M을 선택하면 다음 마법사를 제공한다.

1. 중간 테이블명 제안
2. 양쪽 PK를 FK로 추가
3. 복합 PK 또는 별도 ID PK 선택
4. Unique 제약조건 선택
5. 중간 테이블 생성

논리 모델 전용 N:M 표시는 P2로 분리한다.

### 순환 관계

순환 FK 자체는 오류가 아니다. DDL 생성 시 다음 순서를 사용한다.

1. FK를 제외한 테이블 생성
2. PK와 Unique 생성
3. 모든 테이블 생성 완료
4. `ALTER TABLE`로 FK 추가

이 방식으로 순환 참조와 상호 참조를 처리한다.

---

## 7.6 이미지 노드

### 지원 입력

- 파일 드래그 앤 드롭
- 클립보드 이미지 붙여넣기
- 파일 선택
- PNG
- JPEG
- WebP

MVP에서는 SVG 업로드를 제외하는 것이 안전하다. SVG는 스크립트나 외부 참조가 포함될 수 있어 별도의 정화 처리가 필요하다.

### 이미지 속성

- X, Y 위치
- 너비, 높이
- 비율 잠금
- 투명도
- 잠금
- 맨 앞으로
- 맨 뒤로
- 이름
- 설명
- 원본 파일 정보

### 기본 제한

- 개별 이미지 최대 10MB
- 긴 변 기준 최대 4096px로 축소 가능
- 캔버스에는 미리보기 이미지 사용
- 원본 또는 최적화 버전 별도 저장
- 프로젝트별 총 이미지 용량 제한

### 중요 설계 원칙

이미지는 테이블 모델 내부에 포함하지 않는다.

```text
모델 데이터
 ├─ 테이블
 ├─ 컬럼
 ├─ 인덱스
 └─ 관계

뷰 데이터
 ├─ 테이블 위치
 ├─ 확대 비율
 ├─ 메모
 └─ 이미지
```

DDL 생성기는 `model`만 입력으로 받도록 하여 이미지가 SQL에 포함될 가능성을 구조적으로 차단한다.

---

## 7.7 메모 및 영역

### 메모 노드

- 제목
- 본문
- 배경 타입
- 링크
- 잠금
- 작성자
- 수정일

### 영역 노드

업무 도메인을 시각적으로 묶는 용도이다.

예시:

- 회원
- 예약
- 결제
- 재고
- 시스템 공통

영역 안에 들어간 테이블을 실제 부모·자식 DOM 구조로 중첩하기보다는, 좌표 기준으로 포함 관계를 계산하는 것이 이동과 성능 관리에 유리하다.

---

## 7.8 사용자별 Undo / Redo

### 기록 대상

- 테이블 생성·삭제
- 컬럼 생성·수정·삭제
- 관계 생성·수정·삭제
- 노드 위치 변경
- 이미지 속성 변경
- Import
- 자동 정렬
- 대량 붙여넣기

### 기록하지 않는 항목

- 다른 사용자가 수행한 원격 변경
- 원격 커서와 Presence
- Pan
- Zoom
- 미니맵 표시 여부
- 패널 열림 상태
- 마우스 Hover
- 검색어

### 작업 단위

- 셀에 글자를 한 글자씩 입력한 기록은 하나의 편집 단위로 합침
- 노드 드래그는 마우스를 놓았을 때 한 번 기록
- 관계 생성과 FK 컬럼 생성은 하나의 Yjs 트랜잭션
- DDL Import 전체는 하나의 트랜잭션
- 자동 정렬 전체는 하나의 트랜잭션

Undo Manager는 로컬 사용자 또는 로컬 클라이언트의 `transaction origin`만 추적해야 한다. 사용자 A가 Undo를 실행해도 사용자 B의 원격 변경이 취소되어서는 안 된다.

## 7.9 실시간 저장·재접속·복구

### 저장 흐름

1. 사용자 동작을 도메인 명령으로 만들고 하나의 Yjs 트랜잭션으로 적용한다.
2. 변경은 WebSocket을 통해 같은 프로젝트 룸의 다른 사용자에게 전파된다.
3. Collaboration Server는 Yjs Update를 순서대로 저장한다.
4. 일정 Update 수 또는 시간마다 압축된 문서 스냅샷을 생성한다.
5. 브라우저는 IndexedDB에 로컬 Yjs 캐시와 미전송 Update를 보관한다.
6. 네트워크가 끊기면 로컬 편집을 임시로 계속하고 `오프라인 변경 있음` 상태를 표시한다.
7. 재접속하면 State Vector를 비교해 누락 Update만 교환하고 병합한다.
8. 장시간 오프라인 또는 권한 변경으로 재동기화가 불가능하면 복사본 저장 또는 `.erdx` 내보내기를 안내한다.

### 연결·저장 상태

- 연결 중
- 동기화 중
- 동기화 완료
- 오프라인 변경 있음
- 재연결 중
- 서버 저장 지연
- 권한 만료
- 동기화 실패
- 스냅샷 생성 완료

### 다중 탭 처리

동일 사용자가 여러 탭에서 같은 프로젝트를 열 수는 있지만 각 탭에는 별도 `clientId`와 `deviceId`를 부여한다. 같은 사용자가 동일 필드를 여러 탭에서 편집하려 할 때는 중복 세션 경고를 표시한다. 다중 탭을 조용한 마지막 저장 우선 방식으로 처리하지 않는다.

## 7.10 실시간 공동 편집

### 실시간 룸

- 프로젝트 하나를 하나의 협업 룸으로 취급한다.
- 룸 이름은 프로젝트 UUID를 기반으로 만들되, UUID만 알면 접속할 수 있어서는 안 된다.
- WebSocket 연결 전에 Access Token과 프로젝트 멤버십을 검증한다.
- Viewer는 룸을 구독할 수 있지만 문서 Update 전송 권한은 없다.

### Presence와 Awareness

지속 저장하지 않는 일시 상태는 Awareness 채널로 전송한다.

- 사용자 ID
- 표시 이름
- 프로필 이미지
- 사용자 색상
- 커서 좌표
- 선택한 테이블·컬럼·관계
- 편집 중인 셀
- 현재 화면 또는 패널
- 연결 상태

커서 좌표는 프레임마다 보내지 않고 Throttle 하며, 일정 시간 움직임이 없으면 숨기거나 축소한다.

### 공유 상태와 개인 상태 분리

| 구분 | 공유 여부 | 예시 |
|---|---|---|
| 스키마 모델 | 공유·지속 저장 | 테이블, 컬럼, 키, 관계, 인덱스 |
| 캔버스 배치 | 공유·지속 저장 | 노드 위치, 크기, 관계선 경로 |
| 이미지·메모 | 공유·지속 저장 | Asset 메타데이터, 위치, 투명도 |
| 사용자 선택 | 공유·비지속 | 선택 테이블, 편집 셀 |
| 사용자 커서 | 공유·비지속 | 캔버스 좌표 |
| 개인 UI | 비공유 | 확대 비율, 열린 패널, 개인 검색어 |

### 같은 필드 동시 편집

- 테이블명, 컬럼명, 데이터 타입 등 셀 편집 시작 시 소프트 잠금을 등록한다.
- 잠금에는 `userId`, `clientId`, `fieldPath`, `expiresAt`을 포함한다.
- 잠금은 편집 중 주기적으로 갱신하고 연결 종료 후 자동 만료한다.
- 다른 사용자는 해당 셀을 읽을 수 있지만 편집 시도 시 현재 편집자를 확인한다.
- 소프트 잠금은 UX 보호 장치이며 최종 데이터 일관성은 Yjs 문서가 보장한다.
- 관계 생성과 FK 자동 생성처럼 여러 객체가 바뀌는 작업은 반드시 하나의 트랜잭션으로 처리한다.

### 사용자별 Undo

- 로컬 사용자의 변경만 Undo Stack에 쌓는다.
- 원격 변경은 화면에는 반영하지만 내 Undo 대상에는 넣지 않는다.
- 관계와 자동 FK 생성은 함께 취소된다.
- 삭제 이후 원격 사용자가 같은 객체를 수정한 경우 복원 결과를 미리 보여주거나 충돌 경고를 표시한다.

### 연결 끊김

- 짧은 연결 끊김에는 자동 재접속한다.
- 재접속 동안 상단 연결 상태를 명확히 표시한다.
- 로컬 변경은 IndexedDB에 보관한다.
- 권한이 제거된 상태에서 재접속하면 미전송 변경을 서버에 적용하지 않고 복사본으로 내보낼 수 있게 한다.

## 7.11 프로젝트 파일 형식

### 파일 확장자 예시

```text
프로젝트명.erdx
```

실제 내부 형식은 ZIP 컨테이너로 구성한다.

```text
project.erdx
├─ manifest.json
├─ document.json
├─ assets/
│  ├─ image-001.webp
│  └─ image-002.png
└─ preview.png
```

### `manifest.json`

- 파일 포맷 버전
- 앱 버전
- 프로젝트 ID
- 프로젝트명
- 생성 시각
- 대상 DB
- 체크섬

### `document.json`

- 모델 데이터
- 캔버스 배치
- 프로젝트 설정
- 이미지 메타데이터

### 파일 호환성

문서에 반드시 `schemaVersion`을 저장한다.

```json
{
  "format": "erdx",
  "schemaVersion": 1
}
```

앱 업데이트 후 구버전 파일을 열면 다음 순서로 처리한다.

1. 원본 파일 백업
2. 버전별 Migration 수행
3. 검증
4. 새 버전 문서 생성
5. 실패 시 원본 유지

---

---

# 8. 모델 검증

## 8.1 오류

오류가 있으면 DDL 생성을 차단한다.

- 같은 스키마 안의 중복 테이블 물리명
- 한 테이블 안의 중복 컬럼 물리명
- 참조 대상이 없는 관계
- FK 컬럼 수와 참조 키 컬럼 수 불일치
- PK 컬럼이 Nullable
- 길이 또는 Precision·Scale 값이 잘못됨
- 대상 DB에서 사용할 수 없는 데이터 타입
- 직접 N:M 관계가 해결되지 않음
- 깨진 컬럼 ID 참조
- 1:1 관계인데 Unique 보장이 없음
- 이미지 Asset 누락으로 프로젝트 파일이 불완전함

## 8.2 경고

경고가 있어도 사용자가 확인 후 DDL을 생성할 수 있다.

- PK가 없는 테이블
- 예약어 사용
- 식별자 길이 초과 가능성
- FK 데이터 타입이 정확히 일치하지 않음
- Comment 누락
- 논리명 누락
- 자동 생성 FK 컬럼을 사용자가 변경함
- 대상 DB에서 일부 속성이 무시됨
- Cascade 설정으로 순환 또는 다중 경로 가능성
- 지원하지 않는 사용자 정의 타입

## 8.3 검증 UI

각 문제에는 다음 정보를 표시한다.

- 심각도
- 테이블명
- 컬럼명
- 문제 설명
- 수정 방법
- 해당 위치로 이동 버튼

실시간 검증은 가벼운 규칙만 수행하고, 전체 Export 검증은 별도 작업으로 실행한다.

---

# 9. DDL Export

## 9.1 DB 지원 순서

현재 사용 맥락을 고려하면 다음 순서가 현실적이다.

1. **MS SQL**
2. PostgreSQL
3. MySQL 또는 MariaDB
4. Oracle

4개 DB를 동시에 구현하면 각 DB의 세부 문법이 얕게 지원될 가능성이 높다. 최초에는 MS SQL Export를 완성하고, 동일한 테스트 구조로 DB Adapter를 확장하는 것이 좋다.

## 9.2 Adapter 구조

```ts
interface DialectAdapter {
  validate(document: ModelDocument): ValidationIssue[];
  normalizeType(column: Column): NormalizedType;
  quoteIdentifier(name: string): string;
  generateCreateTable(table: Table): string;
  generatePrimaryKeys(table: Table): string[];
  generateIndexes(table: Table): string[];
  generateForeignKeys(model: ModelDocument): string[];
  generateComments(model: ModelDocument): string[];
}
```

각 DB별 구현을 분리한다.

```text
ddl/
├─ core/
├─ mssql/
├─ postgres/
├─ mysql/
└─ oracle/
```

UI 코드 안에서 문자열을 직접 조합하지 않아야 한다.

## 9.3 MS SQL P0 범위

- `CREATE SCHEMA`
- `CREATE TABLE`
- 기본 데이터 타입
- `NULL` / `NOT NULL`
- `IDENTITY`
- `DEFAULT`
- PK
- 복합 PK
- Unique
- Index
- FK
- 복합 FK
- `ON DELETE`
- `ON UPDATE`
- 스키마명
- `[식별자]` 인용
- 순환 관계용 후행 `ALTER TABLE`

### Comment 처리

SQL Server에는 PostgreSQL의 `COMMENT ON`과 같은 단순한 테이블·컬럼 Comment 문법이 없으므로 선택지가 필요하다.

- SQL 주석으로만 출력
- `MS_Description` Extended Property로 출력
- 출력하지 않음

Extended Property 출력은 P1로 분리해도 된다.

## 9.4 출력 옵션

- 전체 테이블
- 선택 테이블만
- FK 포함
- Index 포함
- Comment 포함
- 스키마 생성 포함
- 식별자 인용
- 제약조건명 자동 생성
- `DROP` 문 포함
- 파일 인코딩 UTF-8
- 줄바꿈 형식 선택
- SQL 정렬 방식

## 9.5 결정적 출력

다음 조건을 보장해야 한다.

- 같은 문서에서 항상 같은 SQL 순서
- ID가 아니라 스키마명·테이블명·컬럼 순서 기준 정렬
- 임의의 현재 시각이나 랜덤 문자열을 DDL에 포함하지 않음
- 자동 제약조건 이름도 동일한 입력이면 동일하게 생성
- 포맷팅 옵션이 같으면 Git Diff가 최소화됨

---

# 10. DDL Import

DDL Import는 기능명은 간단하지만 실제 구현 난도가 높으므로 P1로 분리한다.

## 10.1 지원 단계

### MS SQL Import 1단계

- `CREATE TABLE`
- Inline PK
- Table-level PK
- Unique
- Inline Default
- `ALTER TABLE ... ADD CONSTRAINT`
- FK
- 복합키
- `IDENTITY`
- `[대괄호 식별자]`
- `GO` 배치 구분자
- 기본적인 SQL 주석

### 후순위

- Extended Property
- Computed Column
- 사용자 정의 타입
- Sequence
- Trigger
- Partition
- Filegroup
- 복잡한 Default Expression

## 10.2 Import 흐름

1. SQL 붙여넣기 또는 파일 선택
2. 대상 DB 선택
3. SQL 파싱
4. 발견한 객체 요약
5. 지원하지 않는 구문 표시
6. 생성 예정 테이블·관계 미리보기
7. 새 프로젝트 또는 현재 프로젝트 병합 선택
8. 이름 충돌 해결
9. Import
10. 자동 배치
11. 전체 검증

기본값은 **새 프로젝트로 가져오기**로 설정해 기존 작업을 보호한다.

## 10.3 보안 원칙

- 입력 SQL 실행 금지
- DB 연결 금지
- 외부 파일 참조 금지
- 프로시저·스크립트 실행 금지
- 파싱 시간 제한
- 파일 크기 제한
- 과도하게 중첩된 입력 방어
- Import 작업을 Web Worker에서 실행

---

# 11. 데이터 구조

## 11.1 최상위 문서

```ts
interface ProjectDocument {
  schemaVersion: number;
  project: ProjectMetadata;
  model: SchemaModel;
  view: DiagramView;
  assets: AssetManifest;
}
```

## 11.2 모델과 뷰 분리

```ts
interface SchemaModel {
  tablesById: Record<string, TableModel>;
  relationshipsById: Record<string, RelationshipModel>;
  indexesById: Record<string, IndexModel>;
  constraintsById: Record<string, ConstraintModel>;
}

interface DiagramView {
  nodesById: Record<string, NodeView>;
  viewport: Viewport;
  displayMode: "logical" | "physical" | "both";
  relationDisplayMode: "all" | "focused" | "hidden";
}
```

### 중요한 규칙

- 테이블 위치는 `TableModel`에 저장하지 않는다.
- 관계선 경로는 `RelationshipModel`이 아니라 View에 저장한다.
- 이미지와 메모는 DDL 모델에 포함하지 않는다.
- 이름 대신 UUID로 참조한다.
- 컬럼 순서는 별도 ID 배열로 관리한다.
- 계산 가능한 값은 저장하지 않고 Selector로 계산한다.
- DDL 생성기는 `SchemaModel`만 입력받는다.

## 11.3 테이블

```ts
interface TableModel {
  id: string;
  schemaName: string;
  logicalName: string;
  physicalName: string;
  comment: string;
  columnOrder: string[];
  columnsById: Record<string, ColumnModel>;
  primaryKeyId?: string;
  indexIds: string[];
  constraintIds: string[];
}
```

## 11.4 컬럼

```ts
interface ColumnModel {
  id: string;
  logicalName: string;
  physicalName: string;
  type: DataTypeSpec;
  nullable: boolean;
  defaultExpression?: string;
  identity?: IdentitySpec;
  comment?: string;
  origin?: ColumnOrigin;
}
```

## 11.5 관계

```ts
interface RelationshipModel {
  id: string;
  parentTableId: string;
  childTableId: string;
  columnMappings: Array<{
    parentColumnId: string;
    childColumnId: string;
  }>;
  relationshipType: "identifying" | "non-identifying";
  cardinality: "one-to-one" | "one-to-many";
  onDelete: ReferentialAction;
  onUpdate: ReferentialAction;
  constraintName?: string;
}
```

---

# 12. 권장 아키텍처

```text
브라우저
 ├─ Next.js UI
 ├─ React Flow Canvas
 ├─ Yjs Shared Document
 ├─ Hocuspocus Provider
 ├─ Zustand: 개인 UI 상태
 ├─ IndexedDB: 로컬 캐시·미전송 Update
 ├─ Validation / DDL Engine
 └─ Web Worker
       │ HTTPS: 인증·메타데이터·Asset
       │ WSS: Yjs Update·Awareness
       ▼
Collaboration Server
 ├─ Hocuspocus WebSocket Server
 ├─ Supabase JWT 검증
 ├─ 프로젝트 멤버십·역할 검사
 ├─ Yjs Update 동기화
 ├─ Awareness 전달
 ├─ Rate Limit / Payload Limit
 └─ Update 저장·Snapshot Compact
       │
       ▼
Supabase
 ├─ Auth: 사용자 ID·세션
 ├─ PostgreSQL
 │   ├─ projects
 │   ├─ project_members
 │   ├─ project_invitations
 │   ├─ project_documents
 │   ├─ project_snapshots
 │   └─ project_activity
 └─ Private Storage: 이미지·파일
```

## 12.1 인증과 프로젝트 권한

- 프로젝트 생성·편집은 로그인 사용자만 가능하다.
- 브라우저는 Supabase Auth Access Token으로 API와 WebSocket 입장 토큰을 요청한다.
- Collaboration Server는 토큰 서명, 만료, 사용자 ID, 프로젝트 멤버십, 역할을 검증한다.
- `projectId`나 룸 이름만으로 접근을 허용하지 않는다.
- Owner, Editor, Viewer 권한은 HTTP API와 WebSocket 양쪽에서 동일하게 적용한다.
- P1의 읽기 전용 공개 링크는 별도 토큰과 별도 권한 경로로 처리한다.

## 12.2 공유 문서 구조

실시간 문서의 원본은 Yjs `Y.Doc`이다.

```text
Y.Doc
├─ model
│  ├─ tablesById
│  ├─ relationshipsById
│  ├─ indexesById
│  └─ constraintsById
├─ view
│  ├─ nodesById
│  ├─ edgeRoutes
│  └─ sharedDisplaySettings
└─ assets
   ├─ imageMetadata
   └─ notes
```

커서, 선택, 편집 중인 셀은 문서에 저장하지 않고 Awareness로 전달한다. 개인 확대 비율과 패널 상태는 Zustand 또는 브라우저 설정에만 둔다.

Zustand와 Yjs가 같은 스키마 데이터를 각각 보관하면 동기화 루프와 불일치가 생긴다. 따라서 다음 원칙을 적용한다.

- 공유 스키마·뷰 데이터의 Source of Truth: Yjs
- 개인 UI 상태의 Source of Truth: Zustand
- React Flow 노드·엣지: Yjs 상태에서 파생
- IndexedDB: Yjs 로컬 캐시와 재접속 지원

## 12.3 서버 저장 구조

```text
profiles
- id (auth.users FK)
- display_name
- avatar_path
- created_at

projects
- id
- owner_id
- name
- target_dialect
- room_id
- status
- created_at
- updated_at

project_members
- project_id
- user_id
- role
- invited_by
- joined_at

project_invitations
- id
- project_id
- email
- role
- token_hash
- expires_at
- accepted_at

project_documents
- project_id
- ydoc_state BYTEA
- state_vector BYTEA
- update_seq
- schema_version
- updated_at

project_snapshots
- id
- project_id
- ydoc_state BYTEA
- document_json JSONB
- name
- created_by
- created_at

project_assets
- id
- project_id
- storage_path
- mime_type
- size
- checksum
- created_by
- created_at

project_activity
- id
- project_id
- actor_user_id
- event_type
- target_id
- summary
- created_at
```

실시간 편집의 1차 저장 형식은 Yjs Update 또는 압축된 Yjs State이다. 검색, DDL 검토, 버전 Diff, 외부 Export를 위해 결정적인 JSON Snapshot을 함께 만들 수 있다. JSONB `revision` 하나만으로 동시 편집을 처리하는 마지막 저장 우선 구조는 사용하지 않는다.

## 12.4 Collaboration Server 배포 원칙

- WebSocket 연결을 지속할 수 있는 Long-running Runtime에 배포한다.
- Next.js HTTP 서버리스 함수 안에 장시간 WebSocket 세션을 억지로 포함하지 않는다.
- 초기에는 단일 Collaboration Server로 시작한다.
- 서버가 여러 대가 되면 문서 라우팅, Redis Pub/Sub 또는 Sticky Session을 검토한다.
- Collaboration Server 재시작 전 최신 Yjs State가 저장되어야 한다.
- 개발 환경에서는 Auth·DB·Storage·Collaboration Server를 로컬로 실행할 수 있다.

운영 환경에서 실시간 협업은 항상 켜진 WebSocket 서버, DB, Storage를 사용하므로 **운영 비용 0원을 제품 요구사항으로 보장할 수는 없다**. 무료 구간은 초기 검증에 활용하되, 동시 접속과 Asset 사용량에 따른 비용을 별도로 산정한다.

---

# 13. 기술 스택 최종안

| 구분 | 권장 기술 | 역할 |
|---|---|---|
| 언어 | TypeScript | 모델, 권한, DDL 타입 안정성 |
| Frontend | Next.js App Router | 화면, 인증 흐름, HTTP API |
| Canvas | `@xyflow/react` | 노드·엣지·뷰포트 처리 |
| Shared Document | Yjs | 스키마·캔버스 공유 상태와 CRDT 동기화 |
| Collaboration Server | Hocuspocus | Yjs WebSocket 동기화, Awareness, 인증 Hook, 저장 Hook |
| Personal UI State | Zustand | 선택 패널, 개인 Viewport, 모달, 로컬 UI 상태 |
| Form | React Hook Form + Zod | 입력 및 검증 |
| Styling | Tailwind CSS + Radix/shadcn | UI 구성 |
| Local Cache | IndexedDB | 로컬 Yjs 캐시, 미전송 변경, 빠른 재접속 |
| Auth | Supabase Auth | 사용자 ID, 세션, Magic Link·OAuth |
| Cloud DB | Supabase PostgreSQL | 프로젝트, 멤버, 초대, Snapshot, 활동 기록 |
| Cloud Storage | Supabase Storage | 이미지 Asset과 프로젝트 파일 |
| Auto Layout | ELK.js | 후속 자동 배치 |
| Unit Test | Vitest | 모델·권한·DDL·동기화 유틸 테스트 |
| Component Test | React Testing Library | 에디터 컴포넌트 테스트 |
| E2E | Playwright | 두 브라우저 컨텍스트 기반 협업 테스트 |

Supabase Realtime Presence나 Broadcast만으로 전체 문서의 충돌 없는 병합을 구현하지 않는다. 이 프로젝트에서는 Yjs를 공유 문서 계층으로 사용하고, Hocuspocus를 WebSocket Provider와 Server로 사용한다. Supabase는 인증, 권한 데이터, 프로젝트 메타데이터, 스냅샷, 파일 저장을 담당한다.

---

# 14. 상태 관리 구조

공유 문서와 개인 UI 상태를 분리한다.

```text
collaboration/
├─ ydoc.ts
├─ schemaBinding.ts
├─ viewBinding.ts
├─ awareness.ts
├─ undoManager.ts
├─ connection.ts
└─ persistence.ts

store/
├─ authSlice
├─ projectAccessSlice
├─ selectionSlice
├─ viewportSlice
├─ panelSlice
├─ validationSlice
├─ assetUploadSlice
└─ connectionUiSlice
```

### Yjs가 관리하는 공유 상태

- 테이블, 컬럼, 키, 인덱스, 관계
- 공유 노드 위치와 크기
- 관계선 수동 경로
- 이미지·메모 메타데이터
- 공유 프로젝트 설정

### Awareness가 관리하는 비지속 상태

- 온라인 사용자
- 커서
- 선택 항목
- 편집 중인 셀
- 소프트 잠금

### Zustand가 관리하는 개인 상태

- 개인 Viewport
- 열린 Inspector와 하단 패널
- 검색어
- 모달
- 로컬 알림
- 연결 상태의 UI 표현

### 원칙

- 공유 스키마를 Zustand에 복제해 두지 않음
- Yjs 변경을 React Flow 노드·엣지로 필요한 범위만 파생
- 컬럼 하나 변경 시 관계없는 테이블이 다시 렌더링되지 않음
- Awareness 변경이 스키마 전체 렌더링을 유발하지 않음
- 사용자의 Undo는 로컬 Origin만 추적
- 관계 생성, FK 생성, 컬럼 순서 변경은 Transaction으로 묶음
- 드래그 중에는 위치 Update를 Throttle하고 종료 시 최종 좌표를 확정

---

# 15. API 및 실시간 연결 초안

Supabase Auth는 로그인 세션을 담당하고, 애플리케이션 API는 프로젝트 권한과 초대·Asset·Snapshot을 담당한다.

| Method | Endpoint | 용도 |
|---|---|---|
| `POST` | `/api/projects` | 프로젝트 생성 |
| `GET` | `/api/projects/:id/bootstrap` | 프로젝트 메타데이터, 내 역할, 최신 Snapshot 정보 |
| `PATCH` | `/api/projects/:id` | 프로젝트 설정 변경 |
| `DELETE` | `/api/projects/:id` | 프로젝트 삭제 |
| `GET` | `/api/projects/:id/members` | 멤버와 역할 조회 |
| `POST` | `/api/projects/:id/invitations` | 이메일 초대 발송 |
| `DELETE` | `/api/projects/:id/invitations/:inviteId` | 초대 취소 |
| `POST` | `/api/invitations/:token/accept` | 초대 수락 |
| `PATCH` | `/api/projects/:id/members/:userId` | 역할 변경 |
| `DELETE` | `/api/projects/:id/members/:userId` | 멤버 제거 |
| `POST` | `/api/projects/:id/collaboration-token` | 짧은 만료의 WebSocket 입장 토큰 발급 |
| `POST` | `/api/projects/:id/snapshots` | 이름 있는 Snapshot 생성 |
| `GET` | `/api/projects/:id/snapshots` | Snapshot 목록 |
| `POST` | `/api/projects/:id/assets` | 이미지 업로드 |
| `DELETE` | `/api/projects/:id/assets/:assetId` | 이미지 삭제 |
| `POST` | `/api/projects/:id/public-links` | P1 읽기 전용 링크 생성 |
| `DELETE` | `/api/projects/:id/public-links/:linkId` | 공개 링크 폐기 |

### WebSocket 연결

```text
wss://collab.example.com/projects/{projectId}
Authorization: Bearer <short-lived collaboration token>
```

Collaboration Server는 연결 시 다음을 검사한다.

1. 토큰 서명과 만료
2. 토큰의 사용자 ID
3. 프로젝트 존재 여부
4. 프로젝트 멤버십
5. Owner, Editor, Viewer 역할
6. 문서 `schemaVersion` 호환성

### 역할

- **Owner:** 프로젝트 삭제, 초대, 역할 관리, 편집, Snapshot, 내보내기
- **Editor:** 편집, 이미지 추가, DDL 생성, Snapshot 생성
- **Viewer:** 조회, 검색, Presence 표시, 정책에 따른 내보내기

---

# 16. 보안 요구사항

## 16.1 인증·권한

- 프로젝트 생성·편집은 인증 사용자만 허용
- 모든 프로젝트·멤버·초대·Asset 테이블에 RLS 적용
- 사용자가 소유하거나 초대된 프로젝트만 조회
- Viewer는 HTTP Update와 WebSocket Update 전송 모두 거부
- Collaboration Server에서 Supabase JWT와 프로젝트 멤버십 재검증
- 룸 ID 또는 프로젝트 UUID만으로 입장 금지
- 서비스용 Secret Key를 브라우저에 노출하지 않음
- 초대 토큰과 공개 링크 토큰은 원문 대신 Hash 저장
- 초대와 공개 링크에 만료·폐기 기능 제공
- 역할 변경·멤버 제거 시 기존 WebSocket 세션을 재검증하거나 종료

## 16.2 실시간 채널

- 프로젝트별 채널 분리
- 최대 메시지 크기 제한
- 사용자별 연결 수와 Update 전송량 Rate Limit
- Awareness Payload의 필드와 크기 검증
- 표시 이름, Comment, 메모를 Escape
- 커서·Presence 데이터에 이메일이나 민감정보를 불필요하게 포함하지 않음
- 서버가 신뢰하는 `userId`는 클라이언트 Payload가 아니라 검증된 토큰에서 가져옴
- 비정상 Update 또는 문서 크기 급증을 감지하고 연결 차단

## 16.3 이미지

- Private Bucket 사용
- 사용자 ID와 프로젝트 ID 기준 경로 분리
- 업로드 전 프로젝트 Editor 이상 권한 확인
- 허용 MIME 타입 검사
- 파일 확장자만 신뢰하지 않음
- 최대 크기 제한
- SVG 기본 차단
- 다운로드 시 권한 확인 또는 짧은 만료 Signed URL 사용
- Asset 삭제 시 현재 공유 문서에서 사용 중인지 검사

## 16.4 SQL

- Import SQL을 절대로 실행하지 않음
- HTML로 직접 출력하지 않고 Escape
- Comment와 논리명도 XSS 정화
- 파일 크기 및 파싱 시간 제한
- 비정상 입력 시 Worker 종료
- DDL 미리보기는 Plain Text 또는 안전한 Syntax Highlighter 사용

---

# 17. 성능 목표

아래 수치는 기능 완료 여부를 판단하기 위한 제품 목표치다.

## 17.1 기준 데이터셋

### 일반 모델

- 테이블 100개
- 컬럼 1,500개
- 관계 150개
- 이미지 5개
- 동시 접속 Editor 3명

### 스트레스 모델

- 테이블 500개
- 컬럼 7,500개
- 관계 800개
- 이미지 20개
- 동시 접속 Editor 10명

## 17.2 목표

| 항목 | 일반 모델 | 스트레스 모델 |
|---|---:|---:|
| 인증 후 프로젝트 진입 | 3초 이내 | 6초 이내 |
| 최초 문서 동기화 | 2초 이내 | 5초 이내 |
| 셀 입력 반응 | 100ms 이내 | 150ms 이내 |
| 원격 변경 표시 지연 | 중앙값 300ms 이내 | 중앙값 700ms 이내 |
| Pan·Zoom | 중앙값 55 FPS 이상 | LOD 기준 30 FPS 이상 |
| DDL 생성 | 1초 이내 | 3초 이내 |
| 검색 결과 표시 | 150ms 이내 | 500ms 이내 |
| 짧은 단절 후 재접속 | 3초 이내 | 5초 이내 |
| 동시 Editor | 3명 | 10명 |
| 로컬 변경 유실 | 0건 | 0건 |

원격 변경 지연은 같은 지역의 Collaboration Server에 연결된 유선 또는 안정적인 Wi-Fi 환경에서 측정한다. 네트워크 품질과 서버 위치를 테스트 기록에 함께 남긴다.

### 성능 테스트 환경

팀에서 기준 PC와 Collaboration Server 지역을 정해야 한다.

예:

- 일반 사무용 Windows PC
- 메모리 16GB
- 최신 Chrome 또는 Edge
- 1920×1080
- 개발자 도구를 닫은 상태
- 서버와 같은 지역의 안정적인 네트워크

“빠르다”는 표현 대신 이 기준으로 측정한다.

---

# 18. 브라우저 및 접근성

## 18.1 P0 브라우저

- 최신 Chrome
- 최신 Edge

## 18.2 P1 브라우저

- Firefox
- Safari

## 18.3 접근성

- 키보드만으로 테이블과 컬럼 편집 가능
- Focus 표시 제거 금지
- PK와 FK를 색상만으로 구분하지 않음
- 오류에 아이콘과 텍스트 함께 표시
- 버튼에 접근 가능한 이름 제공
- 관계선 선택을 위한 키보드 탐색 지원
- 명도 대비 기준 준수
- 확대 200%에서도 핵심 기능 사용 가능

---

# 19. 테스트 전략

## 19.1 Unit Test

- 이름 중복 검증
- 예약어 검증
- PK Nullable 검증
- 복합 FK Mapping
- 관계 삭제 정책
- 자동 생성 FK 컬럼명
- 데이터 타입 변환
- MS SQL 식별자 인용
- DDL 출력 순서
- 문서 버전 Migration
- 역할별 권한 판정
- 초대 만료와 수락 조건
- 소프트 잠금 만료
- Yjs Transaction Origin 분류
- 사용자별 Undo 대상 필터

## 19.2 Golden File Test

입력 모델과 예상 SQL을 함께 저장한다.

```text
fixtures/
├─ simple-table/
│  ├─ model.json
│  └─ expected.mssql.sql
├─ composite-key/
├─ circular-fk/
├─ identity-default/
└─ reserved-identifiers/
```

DDL Generator 변경 시 예상 SQL과 Diff를 확인한다.

## 19.3 협업 E2E Test

Playwright의 서로 다른 Browser Context를 각각 다른 사용자로 사용한다.

- 사용자 A가 프로젝트 생성
- 사용자 B를 Editor로 초대하고 수락
- 사용자 C를 Viewer로 초대
- A와 B가 같은 프로젝트에 동시 접속
- 서로의 Presence와 선택 테이블 확인
- A가 테이블 생성하면 B에게 반영
- B가 컬럼 수정하면 A에게 반영
- 같은 셀 편집 시 소프트 잠금 표시
- A의 Undo가 B의 변경을 취소하지 않음
- B 네트워크 단절 후 로컬 변경 생성
- 재접속 후 변경 병합과 중복 없음 확인
- Viewer의 HTTP·WebSocket 편집 차단
- Owner가 B 역할을 Viewer로 바꾸면 편집 권한 회수
- 서버 재시작 후 최신 Snapshot 복원
- 두 사용자가 동시에 관계와 FK를 생성해도 문서 참조가 깨지지 않음

## 19.4 일반 E2E Test

- 로그인과 세션 복구
- 새 프로젝트 생성
- 테이블 생성
- 컬럼 20개 연속 입력
- 관계 생성 및 FK 자동 추가
- 이미지 업로드와 공동 표시
- DDL 생성
- 프로젝트 파일 내보내기
- 다른 프로젝트로 다시 가져오기

## 19.5 Import·보안 Test

- 정상 SQL
- 일부 지원되지 않는 SQL
- 깨진 SQL
- 매우 긴 식별자
- 중첩 괄호
- 대량 주석
- 비정상 인코딩
- 과도하게 큰 파일
- 만료된 JWT의 WebSocket 접속
- 멤버가 아닌 사용자의 룸 접속
- Viewer의 Update 전송
- 과도한 Awareness Payload
- 초대 토큰 재사용

---

# 20. MVP 완료 기준

다음 조건을 모두 만족해야 협업 MVP 완료로 판단한다.

1. 사용자가 로그인하고 재접속 시 같은 사용자 ID로 복귀한다.
2. Owner가 프로젝트를 생성하고 다른 사용자를 이메일로 초대할 수 있다.
3. Owner, Editor, Viewer 권한이 HTTP와 WebSocket 양쪽에서 적용된다.
4. 서로 다른 두 사용자가 같은 프로젝트를 동시에 열 수 있다.
5. 온라인 사용자, 커서, 선택 테이블, 편집 중인 셀이 표시된다.
6. 한 사용자의 테이블·컬럼 변경이 다른 사용자에게 실시간 반영된다.
7. 같은 필드 편집 시 소프트 잠금과 편집자 정보가 표시된다.
8. 사용자 A의 Undo가 사용자 B의 변경을 되돌리지 않는다.
9. 네트워크 단절 중 변경이 IndexedDB에 남고 재접속 후 병합된다.
10. Collaboration Server 재시작 후 최신 저장 상태가 복원된다.
11. 역할이 Viewer로 변경된 사용자는 즉시 또는 재연결 시 편집할 수 없다.
12. 테이블과 20개 컬럼을 키보드 중심으로 입력할 수 있다.
13. 복합 PK·FK·Unique·Index를 정의할 수 있다.
14. 관계 생성 시 FK 컬럼을 자동 생성하거나 기존 컬럼에 연결할 수 있다.
15. 1:1 관계 생성 시 Unique 제약을 보장한다.
16. N:M 관계는 중간 테이블로 변환된다.
17. 이미지 업로드·붙여넣기와 투명도·잠금이 동작하고 다른 사용자에게 표시된다.
18. 이미지가 DDL과 검증 모델에서 제외된다.
19. 오류가 있는 경우 DDL 생성 전에 해당 위치를 안내한다.
20. 동일한 공유 모델에서 동일한 MS SQL DDL이 생성된다.
21. 이름 있는 Snapshot을 생성하고 복원할 수 있다.
22. 프로젝트 파일 Export·Import 후 위치와 이미지까지 복원된다.
23. 일반 모델과 3명 동시 편집 성능 기준을 통과한다.
24. 핵심 Unit, Golden, 협업 E2E, 권한 테스트가 자동화되어 있다.

---

# 21. 개발 단계

# 21. 개발 단계

## Phase 0. 실시간 기술 검증 (✅ 완료)

### 구현 항목

- [x] React Flow Custom Table Node (프리미엄 다크테크, LOD 줌 타이틀, 7종 마커)
- [x] Yjs 스키마 모델 Prototype (CRDT Map/Array 기반 완전 동기화)
- [x] Hocuspocus WebSocket 룸 (Port 1234 실시간 멀티플레이어 협업 서버)
- [x] 두 브라우저 간 테이블·컬럼 실시간 동기화
- [x] Awareness 기반 Cursor·Selection (멀티플레이어 마우스 커서 및 아바타)
- [x] 사용자별 Undo Manager (Transaction Origin 기반 독립 롤백)
- [x] 소프트 잠금 Prototype
- [x] IndexedDB Cache와 재접속 오프라인 지속성

### 종료 기준

- [x] 두 사용자 동시 편집에서 문서 참조가 깨지지 않음
- [x] 사용자 A의 Undo가 B의 변경을 취소하지 않음
- [x] 서버 재시작 후 문서 복원
- [x] 스트레스 모델에서 앱이 멈추지 않음
- [x] 테이블 하나 수정할 때 전체 노드가 다시 렌더링되지 않음

## Phase 1. 계정·초대·권한 (📌 대기 중)

- [ ] Supabase Auth (로그인 / 회원가입 / 소셜 로그인)
- [ ] 사용자 Profile 및 설정 관리
- [ ] 프로젝트 생성·목록·삭제 대시보드
- [ ] Project Member (멤버 관리 및 워크스페이스 목록)
- [ ] 이메일 초대·수락·만료 링크
- [ ] Owner·Editor·Viewer 역할별 읽기/쓰기 권한 제어
- [ ] Supabase Row Level Security (RLS)
- [ ] WebSocket 입장 JWT 토큰 검증
- [ ] Private Asset Storage (프로젝트 전용 이미지 스토리지)

## Phase 2. 실시간 ERD 편집 (✅ 핵심 구현 완료)

- [x] 테이블·컬럼 CRUD 및 실시간 바인딩
- [x] 키보드 중심 컬럼 편집 (Enter 컬럼 추가 등)
- [x] PK, FK, Unique, Not Null 제약조건 관리
- [x] ERD-Cloud 7종 까마귀발 표기법 & 식별/비식별 선택 모달
- [x] 다중 관계 생성 및 28px 평행 오프셋 자동 분산 라우팅
- [x] 이미지·메모 노드 CRUD 및 색상 테마
- [x] Presence·Cursor·Selection 실시간 협업 UI
- [x] 편집 중 셀 표시와 소프트 잠금
- [x] 사용자별 Undo·Redo
- [x] 서버 저장·Snapshot·IndexedDB Cache

## Phase 3. 검증 및 MS SQL (✅ 핵심 구현 완료)

- [x] 스키마 실시간 유효성 검증 엔진 (순환 참조, 미참조 컬럼, 중복 물리명 검사)
- [x] MS SQL Type Catalog 지원 (BIGINT, VARCHAR, DATETIME2 등)
- [x] MS SQL DDL 자동 생성 Adapter
- [x] DDL 실시간 Preview 및 원클릭 복사/다운로드 모달
- [x] JSON 스키마 Export & Import
- [ ] Golden File Test 자동화
- [ ] 협업 E2E와 권한 E2E 테스트 자동화

**Phase 0~3 핵심 캔버스 및 협업 엔진 구현 완료**

## Phase 4. 검토·공유 확장 (📌 대기 중)

- [ ] 비로그인 읽기 전용 공유 링크
- [ ] 댓글(Comment)과 멘션 기능
- [ ] 이름 있는 Named Snapshot UI 및 히스토리 타임라인
- [ ] 버전 간 시각적 Diff 비교
- [ ] 캔버스 자동 정렬 (Auto-Layout / Dagre 알고리즘)
- [ ] PNG·PDF 이미지 내보내기 (Export Canvas to Image)
- [ ] MS SQL DDL Import (기존 SQL DDL 파싱하여 ERD 역설계)

## Phase 5. DB·운영 확장 (📌 대기 중)

- [ ] PostgreSQL DDL Export 지원
- [ ] MySQL DDL Export 지원
- [ ] Oracle DDL Export 지원
- [ ] 프로젝트 템플릿 프리셋
- [ ] 팀 워크스페이스 고도화
- [ ] 감사 로그(Audit Log) 고도화
- [ ] 다중 Collaboration Server Scale-out
- [ ] 변경 승인·브랜치 검토 워크플로우

---

# 22. 주요 위험과 대응

| 위험 | 문제 | 대응 |
|---|---|---|
| 범위 과대 | ERD 기능과 실시간 협업을 동시에 구현 | Phase 0에서 Yjs·React Flow 결합을 먼저 검증하고 MS SQL 하나만 지원 |
| 이중 상태 | Zustand와 Yjs가 같은 모델을 각각 보관 | 공유 모델은 Yjs, 개인 UI는 Zustand로 Source of Truth 분리 |
| 같은 필드 충돌 | 두 사용자가 동일 셀을 동시에 수정 | Awareness 소프트 잠금, 편집자 표시, 짧은 TTL, Transaction 단위 처리 |
| Undo 오염 | 내 Undo가 다른 사용자의 변경을 취소 | Transaction Origin 기반 사용자별 Undo Manager |
| 권한 우회 | 프로젝트 UUID만 알아도 WebSocket 접속 | JWT와 프로젝트 멤버십을 연결 시 서버에서 검증 |
| 연결 단절 | 미전송 변경 유실 | IndexedDB 캐시, State Vector 재동기화, 복사본 Export |
| 서버 장애 | 메모리 문서 유실 | Yjs Update 저장, 주기적 Compact Snapshot, 재시작 복원 테스트 |
| 캔버스 성능 | 컬럼 DOM, 커서, 관계선 증가 | LOD, 가시 영역 렌더링, Awareness 분리, Selector 최적화 |
| DDL 신뢰성 | DB별 문법 누락 | Adapter와 Golden Test |
| FK 자동화 | 사용자 컬럼을 임의 수정 | 생성 출처 기록, Detached 상태, 단일 Transaction |
| 이미지 용량 | 공유 문서와 로딩이 무거워짐 | 바이너리는 Storage, 문서에는 메타데이터만 저장 |
| 운영 비용 | 실시간 WebSocket과 Storage 비용 발생 | 동시 접속 목표를 10명으로 제한하고 사용량 측정 후 Scale-out |
| 문서 호환성 | 앱 업데이트 후 Yjs 문서 열기 실패 | `schemaVersion`, Migration, Snapshot 백업 |
| 제품 모방 | 브랜드·UI 자산 복제 위험 | 기능 벤치마킹만 하고 독립 디자인 |

---

# 23. 최종 권장안

## 23.1 최초 제품

- 계정 로그인 필수
- 프로젝트 단위 초대와 Owner·Editor·Viewer
- Next.js + TypeScript
- React Flow
- Yjs Shared Document
- Hocuspocus WebSocket Collaboration Server
- Zustand 개인 UI 상태
- IndexedDB 로컬 캐시
- Supabase Auth·PostgreSQL·Private Storage
- 실시간 Presence·Cursor·Selection·편집 표시
- 사용자별 Undo·Redo
- 참고 이미지 노드
- 서버 Snapshot과 프로젝트 파일 백업
- 검증 엔진
- MS SQL Export

## 23.2 다음 단계

- 비로그인 읽기 전용 공유 링크
- 댓글과 멘션
- Snapshot Diff
- PNG·PDF
- MS SQL DDL Import
- PostgreSQL·MySQL Export
- 팀 워크스페이스

## 23.3 장기 단계

- 승인 흐름과 브랜치형 설계 검토
- DB 직접 연결
- Schema Diff
- Migration SQL
- AI 지원
- Oracle 및 고급 DB 객체
- Collaboration Server Scale-out
- SSO·SCIM

가장 중요한 설계 원칙은 다음 세 가지다.

1. **편집자는 계정으로 식별한다.**
2. **실시간 공동 편집을 나중에 덧붙이지 않고 공유 문서를 중심으로 처음부터 구현한다.**
3. **Yjs 공유 상태, Zustand 개인 UI 상태, Storage Asset을 분리한다.**

이 기준을 지키면 실시간 공유, 권한, 파일 백업, DDL Export, 버전 복원이 서로 충돌하지 않는다.

---

# 참고 자료

- Supabase Auth: <https://supabase.com/docs/guides/auth>
- Supabase Users and Invitations: <https://supabase.com/docs/guides/auth/users>
- Supabase Row Level Security: <https://supabase.com/docs/guides/database/postgres/row-level-security>
- Supabase Storage Fundamentals: <https://supabase.com/docs/guides/storage/buckets/fundamentals>
- Yjs Shared Types: <https://docs.yjs.dev/getting-started/working-with-shared-types>
- Yjs Awareness: <https://docs.yjs.dev/getting-started/adding-awareness>
- Hocuspocus Collaborative Editing: <https://tiptap.dev/docs/hocuspocus/guides/collaborative-editing>
- Hocuspocus React Provider: <https://tiptap.dev/docs/hocuspocus/provider/react>
- React Flow Performance: <https://reactflow.dev/learn/advanced-use/performance>
- ERDCloud: <https://www.erdcloud.com/>
