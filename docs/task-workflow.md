# Quy trình hoàn thành task

Quy trình này giúp mỗi task có phạm vi rõ, dễ review và bàn giao cho người tiếp theo.
Trong quy ước này, `T` luôn có nghĩa là `Task`.

## 0. Prompt và skill khi bắt đầu

Trong Copilot Chat, gọi skill trước khi yêu cầu code:

```text
/feature-start-workflow
```

Sau đó dùng prompt chuẩn:

```text
Task: T<number>
Owner: TV<number>
Goal: <một câu mô tả kết quả cần đạt>
Scope: <file/module/page được phép thay đổi>
Dependency: <None hoặc task/API đã merge>
Acceptance criteria:
- <kết quả quan sát được 1>
- <kết quả quan sát được 2>

Trước khi code:
1. Đọc contract, ownership và implementation liên quan.
2. Đề xuất file plan, API, test case, branch name và PR title.
3. Nếu scope hoặc contract mơ hồ thì hỏi lại, không tự đoán.
Sau khi xác nhận, implement và verify task.
```

Ví dụ:

```text
/feature-start-workflow

Task: T1
Owner: TV3
Goal: Lưu trạng thái bộ lọc Explore trên URL.
Scope: site/js/pages/explore-state.js, tools/explore-state.test.mjs,
docs/contracts.md
Dependency: None
Acceptance criteria:
- Hỗ trợ repeated URL parameters cho multi-select.
- Parser và serializer không phụ thuộc DOM.
- Có test default, invalid input và round trip.
```

Skill sẽ lập kế hoạch trước. Chỉ bắt đầu code sau khi scope, file và API đã rõ.

## 1. Nhận task

Ghi `Task ID`, mục tiêu, owner, dependency và điều kiện nghiệm thu. Đọc
`docs/contracts.md`, `docs/ownership.md` và code liên quan.

## 2. Tạo branch

Luôn cập nhật `main` trước khi tách nhánh:

```powershell
git switch main
git pull --ff-only origin main
git switch -c feat/task-1-tv3-filter-state
```

Quy ước:

```text
feat/task-<number>-<scope>-<short-name>   # tính năng
fix/task-<number>-<scope>-<short-name>    # sửa lỗi
test/task-<number>-<scope>-<short-name>   # test
docs/task-<number>-<scope>-<short-name>   # tài liệu
```

Tên branch dùng lowercase kebab-case, không dấu, không tên cá nhân. Ví dụ:
`feat/task-1-tv3-filter-state`, trong đó `task-1` là Task 1 và `tv3` là owner/module.

## 3. Chốt thiết kế trước khi code

Ghi ngắn:

```md
Goal: ...
Input: ...
Output: ...
Done when: ...
```

Xác định file cần thêm/sửa, API, output shape, lỗi, side effect và test case.
Nếu đổi contract, cập nhật `docs/contracts.md` và báo owner module.

## 4. Code và test

Làm theo thứ tự:

1. Contract/fixture.
2. Pure logic và unit test.
3. Tích hợp page/module.
4. Loading, error, empty, accessibility và responsive state nếu có UI.
5. Cập nhật docs final, không ghi nhật ký triển khai dài.

Không sửa file ngoài scope nếu không cần. Không commit secret, `node_modules`,
file build, file cá nhân hoặc snapshot sinh tạm.

## 5. Kiểm tra trước commit

Chạy các lệnh nhỏ nhất phù hợp với task:

```powershell
git diff --check
node --test tools/<module>.test.mjs
```

Với UI, kiểm thêm Console/Network, đường dẫn tương đối, keyboard và viewport
360/768/1366 px. Ghi chính xác lệnh đã chạy và kết quả; không ghi "đã test"
nếu chưa thực sự test.

## 6. Commit và push

Commit dùng Conventional Commit, dạng mệnh lệnh:

```text
feat(tv3): implement explore filter state
fix(data): reject invalid deadline input
test(tv3): cover repeated URL parameters
docs(workflow): define task handoff
```

Sau đó push branch:

```powershell
git add <files>
git commit -m "feat(tv3): implement explore filter state"
git push -u origin feat/task-1-tv3-filter-state
```

Mỗi commit nên hoàn chỉnh và liên quan một mục tiêu. Không dùng message mơ hồ như
`update`, `fix stuff` hoặc `done`.

## 7. Tạo PR

Tiêu đề phải ghi rõ chữ `Task`:

```text
[Task T1][TV3] Implement explore filter state
```

Nội dung PR tối thiểu:

```md
## Task
- ID: T1
- Owner: TV3
- Goal: ...

## Changed
- ...

## API / Contract
- None / mô tả thay đổi và file liên quan

## Verification
- `node --test ...` — pass
- `git diff --check` — pass

## Limitations
- ...

## Handoff
- Task tiếp theo có thể dùng ...
- Dependency: ...
```

PR UI phải có ảnh hoặc video ngắn kèm viewport. Reviewer cần kiểm tra scope,
contract, test, docs và khả năng chạy lại.

## 8. Merge và bàn giao task tiếp theo

Chỉ merge khi reviewer approve và CI/test đạt. Sau khi PR task 1 được merge,
người làm task 2 không lấy branch cũ của task 1; hãy pull `main` mới nhất:

```powershell
git switch main
git pull --ff-only origin main
git switch -c feat/task-1-tv3-list-page
```

Task 2 đọc phần `Handoff` của PR task 1, kiểm tra API thực tế và chạy test trước
khi tích hợp. Nếu task 2 bắt buộc phụ thuộc task 1 nhưng task 1 chưa merge, ghi rõ
dependency trong PR thay vì âm thầm lấy code chưa ổn định.

## Ví dụ bàn giao

| Bước | Người | Kết quả |
|---|---|---|
| Task T1 | A | Tạo `parseState`, cập nhật contract, thêm unit test, merge PR |
| Task T2 | B | Pull `main`, dùng API của A để nối UI danh sách |
| Task T3 | A/B | Bổ sung integration test và xử lý edge case sau review |

Mỗi task kết thúc bằng code chạy được, test có thể lặp lại, docs đủ dùng và PR
ghi rõ người tiếp theo cần bắt đầu từ đâu.

## 9. Báo cáo sau khi hoàn thành task

### Báo cáo mặc định: nằm trong PR

Không tạo một file report riêng cho mọi task. Sau khi hoàn thành, ghi báo cáo ngắn
trong PR theo các mục của `.github/pull_request_template.md`:

```md
## Task
- ID: T1
- Owner: TV3
- Goal: ...

## Changed
- ...

## API / Contract
- None / `docs/contracts.md`: ...

## Verification
- `node --test tools/explore-state.test.mjs` — pass
- `git diff --check` — pass

## Limitations
- ...

## Handoff
- Task tiếp theo dùng ...
- Dependency: ...
```

PR là nơi chính để reviewer, người phụ trách task tiếp theo và nhóm xem báo cáo.
Không copy nguyên báo cáo sang nhiều file khác nhau.

### Khi nào cần file report trong `docs/`

Chỉ tạo file riêng khi task có nhiều test case, cần lưu bằng chứng nghiệm thu, hoặc
được yêu cầu cho báo cáo môn học. Đặt tên:

```text
docs/<feature>-test-report.md
```

Ví dụ:

```text
docs/tv3-explore-state-test-report.md
```

File report chỉ ghi kết quả kiểm thử, không lặp lại toàn bộ contract:

```md
# Test report: <feature>

## Scope
- Task: T1
- Commit/PR: ...

## Cases
| Case | Input | Expected | Actual | Result |
|---|---|---|---|---|
| Default state | ... | ... | ... | Pass |

## Environment
- Browser:
- Viewport:
- Command:

## Limitations
- ...
```

### Nơi ghi từng loại thông tin

| Thông tin | Nơi ghi |
|---|---|
| Mục tiêu, file đổi, test chạy, limitation, handoff | PR description |
| API, data shape, contract dùng chung | `docs/contracts.md` |
| Quy trình và ownership | `docs/task-workflow.md`, `docs/ownership.md` |
| Nhiều test case và bằng chứng nghiệm thu | `docs/<feature>-test-report.md` |
| Lịch sử thay đổi code | Commit |

## 10. Prompt theo từng giai đoạn

## 10.0. Dùng với AI không có cơ chế skill

Nếu công cụ AI không hỗ trợ `/feature-start-workflow`, hãy gửi prompt nền
tương ứng trước. Có thể đính kèm hoặc dán nội dung của file skill vào cuối prompt.
Không cần gửi toàn bộ hai skill cho mọi lần hỏi; chọn đúng prompt theo công việc.

### Prompt nền: clean-project-conventions

Dùng khi review hoặc viết docs, HTML/CSS, JavaScript và Python:

```text
Bạn là reviewer/implementer cho project UIT ConFinder.
Áp dụng các nguyên tắc sau:
- Đọc docs/contracts.md và docs/ownership.md trước khi sửa code.
- Viết docs ngắn, rõ mục đích, contract, verification, limitation; không lặp ý
  hoặc ghi nhật ký dài.
- HTML dùng semantic structure, label, keyboard focus và đầy đủ loading/error/empty state.
- CSS dùng design tokens, giữ page CSS trong site/css/pages và hỗ trợ responsive.
- JavaScript dùng ES Modules, tách pure logic khỏi DOM, validate input, dùng
  textContent cho dữ liệu người dùng và không nuốt lỗi.
- Python dùng pathlib, type hints cho public function, không phụ thuộc working directory
  và không dùng broad except.
- Không sửa ngoài scope, không đổi contract âm thầm và không báo pass cho lệnh chưa chạy.

Task cần xử lý:
<dán yêu cầu ở đây>

Trước khi kết luận, hãy báo:
1. Files đã đọc và files dự kiến thay đổi.
2. Thay đổi đã thực hiện.
3. Lệnh kiểm tra đã chạy và kết quả chính xác.
4. Limitation hoặc việc chưa kiểm tra.
```

### Prompt nền: feature-start-workflow

Dùng khi bắt đầu một feature/task mới:

```text
Bạn là technical lead cho project UIT ConFinder.
Hãy lập kế hoạch và triển khai Task theo quy trình contract-first.
Quy ước: T luôn có nghĩa là Task; không tự đoán khi scope hoặc contract mơ hồ.

Task: T<number>
Owner: TV<number>
Goal: <một câu>
Scope: <file/module/page được phép thay đổi>
Dependency: <None hoặc task/API đã merge>
Acceptance criteria:
- <kết quả quan sát được 1>
- <kết quả quan sát được 2>

Trước khi code:
1. Đọc docs/contracts.md, docs/ownership.md và implementation liên quan.
2. Đề xuất file plan theo cấu trúc hiện có.
3. Đề xuất API: function(input) -> output, error behavior và side effects.
4. Đề xuất test cho happy path, empty, invalid và boundary input.
5. Đề xuất branch, commit message và PR title.
6. Nếu thiếu thông tin hoặc có nhiều lựa chọn ảnh hưởng behavior, hãy hỏi lại.

Chỉ sau khi plan rõ mới implement. Không sửa ngoài scope và chưa commit/push.
```

### Prompt review trước commit

```text
Review Task T<number> trước commit.
Đối chiếu acceptance criteria, docs/contracts.md và docs/ownership.md.
Kiểm tra scope, naming, API/error behavior, test invalid input, accessibility,
responsive state và docs.
Chạy hoặc đề xuất đúng lệnh kiểm tra phù hợp; phân biệt rõ lệnh đã chạy và chưa chạy.
Chỉ sửa lỗi liên quan trực tiếp đến task. Báo:
- Blocker
- Changes required
- Verified
- Limitations
```

### Prompt tổng hợp báo cáo

```text
Tổng hợp báo cáo Task T<number> từ diff và kết quả kiểm tra đã cung cấp.
Không bịa kết quả, không ghi pass cho lệnh chưa chạy, không lặp lại contract dài.
Trả về đúng các mục:
- Task / Owner / Goal
- Changed files và behavior
- API / Contract: None hoặc file và thay đổi
- Verification: exact command và kết quả
- Limitations
- Handoff cho task tiếp theo
Nếu có nhiều test case, đề xuất docs/<feature>-test-report.md.
```

### Báo cáo sau khi làm xong

```text
Tổng hợp báo cáo Task T<number> để đưa vào PR.
Chỉ dùng thông tin đã kiểm chứng, không tự điền kết quả chưa chạy.
Gồm:
- Goal và Changed files
- API/Contract thay đổi hoặc None
- Exact verification commands và kết quả
- Limitations
- Handoff cho task tiếp theo
Nếu có nhiều test case, đề xuất docs/<feature>-test-report.md và không lặp lại
contract đã có trong docs/contracts.md.
```

### Tiếp tục implement

```text
Tiếp tục Task T<number> theo plan đã duyệt.
Chỉ implement trong scope, giữ nguyên contract và thay đổi không liên quan.
Tách pure logic khỏi DOM, thêm test cho input hợp lệ, rỗng, sai và boundary.
Chưa commit. Báo file đã đổi và rủi ro còn lại.
```

### Verify

```text
Verify Task T<number> theo acceptance criteria.
Chạy test/syntax check nhỏ nhất và git diff --check.
Nếu có UI, kiểm Console/Network, keyboard, relative path và viewport
360/768/1366 khi phù hợp.
Báo đúng command, kết quả, limitation và case fail nếu có.
Không sửa file ngoài scope.
```

### Chuẩn bị commit và PR

```text
Hoàn tất Task T<number>.
Review diff, bỏ thay đổi ngoài scope, cập nhật docs liên quan và chuẩn bị
(chưa push/chưa tạo PR nếu chưa xác nhận):
- Commit: <type>(<scope>): <imperative summary>
- Branch: <type>/task-<number>-<scope>-<short-name>
- PR: [Task T<number>][TV<owner>] <Verb> <scope>
- Body theo .github/pull_request_template.md
Ghi exact verification result và Handoff cho task tiếp theo.
```

## Tên các PR cũ

Đổi tiêu đề PR trên GitHub theo bảng sau:

| PR | Tiêu đề cũ | Tiêu đề chuẩn |
|---|---|---|
| #1 | `feat(ui): bộ nền UI dùng chung cho T1-TV2-01` | `[Task T1][TV2] Build shared UI foundation` |
| #2 | `feat(data-detail): implement data service with live API/snapshot fallback` | `[Task T1][TV1] Implement data service and conference detail` |

PR mới phải dùng format `[Task T<number>][TV<owner>] <verb> <scope>`.
