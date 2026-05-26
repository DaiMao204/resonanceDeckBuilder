# 雷索纳斯卡组构建器 / Resonance Deck Builder

![项目截图](https://github.com/user-attachments/assets/1d967fb9-da06-4b69-a360-d180f51a330a)

网站地址：https://rsnswiki-deck-builder.com/

原项目：https://github.com/danij91/resonanceDeckBuilder  
当前维护仓库：https://github.com/DaiMao204/resonanceDeckBuilder

---

## 中文介绍

**雷索纳斯卡组构建器** 是一个用于构建和维护《雷索纳斯》卡组配置的网页工具。  
你可以在网页中选择角色、装备、技能卡和战斗设置，导入/导出卡组配置，生成分享链接，也可以保存常用卡组。

### 主要功能

- **导入卡组**  
  从剪贴板导入游戏或网页生成的卡组代码。

- **导出卡组**  
  将当前编辑后的卡组复制为可复用的配置代码。

- **URL 分享**  
  将当前卡组编码到链接中，方便直接分享给其他玩家。

- **截图保存**  
  一键生成当前卡组配置截图。

- **重置卡组**  
  清空当前角色、卡牌、装备和战斗设置。

- **本地保存 / 读取**  
  将常用卡组保存在浏览器本地，之后可继续读取。

- **多语言支持**  
  支持韩文、英文、日文、简体中文、繁体中文。

- **评论区**  
  支持 Artalk 评论系统。不同语言页面共用同一页面评论区，评论按钮和提示文本会尽量跟随当前界面语言。

---

## 当前维护版改动

本维护版基于原项目继续开发，主要改动包括：

- 默认语言调整为简体中文。
- 页脚保留原作者 Heeyong Chang，并显示当前维护者 DaiMao / 呆毛 与维护仓库链接。
- 数据维护脚本可从本地 `BinaryConfig` 生成项目所需的角色、卡牌、技能、共振、装备等 JSON 数据。
- 角色、技能、共振、卡牌、装备等图片尽量使用 BiliGame Wiki 外链。
- 默认队伍配置中加入弃牌卡，且弃牌卡不参与统计。
- 中文和繁中页脚显示雷索纳斯官网与雷索纳斯 Wiki，其它语言页脚不显示这两个中文社区链接。
- 评论区支持 Artalk，可接入自建评论服务；未配置 Artalk 时保留 Firebase 评论逻辑作为回退。
- 不同语言页面共用同一 Artalk 评论区。
- 优化语言切换流程，减少翻译 key 和重复 loading 的闪烁。
- 调整 Artalk 评论区暗色样式，并隐藏空的 Markdown/预览按钮。

---

## 🇰🇷 한국어 번역

**Resonance Deck Builder**는 게임 **Resonance**의 덱 구성을 만들고 관리하기 위한 웹 애플리케이션입니다.  
게임 또는 웹사이트에서 생성한 덱 코드를 불러오고, 웹에서 편집한 뒤 다시 공유하거나 내보낼 수 있습니다.

### 주요 기능

- **덱 코드 가져오기**  
  클립보드에서 덱 코드를 불러옵니다.

- **덱 코드 내보내기**  
  편집한 덱을 다시 사용할 수 있는 코드로 복사합니다.

- **URL 공유**  
  현재 덱 구성을 URL로 공유할 수 있습니다.

- **스크린샷 저장**  
  현재 덱 화면을 이미지로 저장할 수 있습니다.

- **덱 초기화**  
  현재 선택된 캐릭터, 카드, 장비와 전투 설정을 초기화합니다.

- **로컬 저장 / 불러오기**  
  브라우저에 덱 프리셋을 저장하고 나중에 다시 불러올 수 있습니다.

- **다국어 지원**  
  한국어, 영어, 일본어, 간체 중국어, 번체 중국어를 지원합니다.

- **댓글 영역**  
  Artalk 댓글 시스템을 지원합니다. 여러 언어 페이지는 같은 댓글 영역을 공유합니다.

### 유지보수 버전 변경 사항

- 기본 언어를 간체 중국어로 변경했습니다.
- 원작자 Heeyong Chang 정보를 유지하고, 현재 유지보수자 DaiMao / 呆毛 및 저장소 링크를 추가했습니다.
- 로컬 `BinaryConfig`에서 캐릭터, 카드, 스킬, 공명, 장비 등의 JSON 데이터를 생성할 수 있습니다.
- 이미지 리소스는 가능한 한 BiliGame Wiki 외부 링크를 사용합니다.
- 기본 덱 구성에 버림 카드가 포함되며, 버림 카드는 통계에 포함되지 않습니다.
- Artalk 댓글 시스템을 지원하며, 설정하지 않은 경우 Firebase 댓글 로직을 백업으로 유지합니다.
- 언어 전환 시 번역 key 또는 중복 loading 화면이 잠깐 보이는 문제를 줄였습니다.

---

## 🇺🇸 English Introduction

**Resonance Deck Builder** is a web application for building and managing deck setups for **Resonance**.  
This maintained fork adds Simplified Chinese as the default language, data generation from local `BinaryConfig`, Wiki image URL support, deployment-oriented footer updates, and Artalk-powered comments.

---

## 技术栈

![React](https://img.shields.io/badge/-React-61DAFB?logo=react&logoColor=white&style=flat)
![Next.js](https://img.shields.io/badge/-Next.js-000000?logo=next.js&logoColor=white&style=flat)
![Tailwind CSS](https://img.shields.io/badge/-TailwindCSS-06B6D4?logo=tailwind-css&logoColor=white&style=flat)
![Vercel](https://img.shields.io/badge/-Vercel-000000?logo=vercel&logoColor=white&style=flat)
![Firebase](https://img.shields.io/badge/-Firebase-FFCA28?logo=firebase&logoColor=white&style=flat)

- React 19
- Next.js 15
- Tailwind CSS
- Firebase Analytics / Firestore 回退评论逻辑
- Artalk 评论系统
- Vercel 部署

---

## 本地运行

### 环境要求

- Node.js 18 或更高版本
- npm

### 安装依赖

```bash
npm install
```

### 本地开发

```bash
npm run dev
```

默认访问：

```text
http://localhost:3000
```

### 构建

```bash
npm run build
```

### 生产启动

```bash
npm run start
```

---

## 环境变量

### Artalk 评论

启用 Artalk 评论区时配置：

```env
NEXT_PUBLIC_ARTALK_SERVER=https://comment.example.com
NEXT_PUBLIC_ARTALK_SITE=resonance-deck-builder
```

`NEXT_PUBLIC_ARTALK_SERVER` 是 Artalk 后端地址。生产环境建议使用 HTTPS 域名，不建议直接使用 `http://IP:端口`，否则 HTTPS 站点可能被浏览器拦截。

### Firebase 回退配置

未配置 `NEXT_PUBLIC_ARTALK_SERVER` 时，评论组件会回退到 Firebase 逻辑。需要启用 Firebase 时配置：

```env
NEXT_PUBLIC_FIREBASE_ENABLED=true
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

---

## 数据维护

数据生成脚本位于：

```text
scripts/build_db_from_binary_config.py
```

脚本会从本地 `BinaryConfig` 读取游戏配置，并生成 `public/db` 下项目所需的 JSON 数据。

默认会尝试读取这些路径：

```text
G:/Resonance/雷索纳斯_Data/Patch/BinaryConfig
G:/雷索纳斯wiki/代码/BinaryConfig
```

也可以手动指定路径：

```bash
python scripts/build_db_from_binary_config.py --binary-config "G:/雷索纳斯wiki/代码/BinaryConfig"
```

生成数据后建议运行：

```bash
npm run build
```

---

## 部署说明

当前建议使用 Vercel 部署。

- `main`：主开发分支。
- `deploy`：生产部署分支。
- 推送 `deploy` 后会触发 Vercel 生产部署。
- 本维护仓库约定：推送 `deploy` 时也同步推送 `main`。

Vercel 中需要在项目设置里配置对应环境变量，尤其是：

```env
NEXT_PUBLIC_ARTALK_SERVER=https://comment.daimao.online
NEXT_PUBLIC_ARTALK_SITE=resonance-deck-builder
```

修改 `NEXT_PUBLIC_*` 环境变量后需要重新部署，线上才会生效。

---

## 鸣谢

- 原作者：Heeyong Chang  
  原项目：https://github.com/danij91/resonanceDeckBuilder

- 当前维护：DaiMao / 呆毛  
  维护仓库：https://github.com/DaiMao204/resonanceDeckBuilder

- 雷索纳斯官网：https://soli-reso.com
- 雷索纳斯 Wiki：https://wiki.biligame.com/resonance

---

## 许可证

This project is licensed under the [GNU General Public License v3.0](./LICENSE).  
本项目基于 [GNU General Public License v3.0](./LICENSE) 开源。

See the LICENSE file for more information.
